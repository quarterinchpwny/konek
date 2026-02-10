import sys
import json
import argparse
import requests
from datetime import datetime, timedelta

from nba_api.stats.endpoints import (
    scoreboardv2, 
    leaguestandingsv3, 
    teamdashboardbygeneralsplits, 
    teamgamelog, 
    shotchartdetail,
    commonplayerinfo
)

# Custom headers to avoid being blocked by stats.nba.com
HEADERS = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
    'Connection': 'keep-alive',
    'Referer': 'https://stats.nba.com/',
}

def fetch_by_date(requested_date):
  
    
    try:
        req_date_obj = datetime.strptime(requested_date, '%Y-%m-%d')
        # We always shift back by 1 day to align PH calendar day with the NBA league day that occurs during it.
        nba_league_date_obj = req_date_obj - timedelta(days=1)
        game_date = nba_league_date_obj.strftime('%Y-%m-%d')
    except Exception as e:
        sys.stderr.write(f"Date conversion failed: {str(e)}\n")
        game_date = requested_date

    # Try CDN first for live data.
    try:
        url = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            cdn_league_date = data.get('scoreboard', {}).get('gameDate') # YYYY-MM-DD
            
            if game_date == cdn_league_date:
                games = []
                for g in data.get('scoreboard', {}).get('games', []):
                    games.append({
                        'id': g['gameId'],
                        'status': g['gameStatusText'],
                        'statusCode': g['gameStatus'],
                        'period': g['period'],
                        'clock': g['gameStatusText'], 
                        'gameTimeUTC': g['gameTimeUTC'],
                        'homeTeam': {
                            'id': g['homeTeam']['teamId'],
                            'name': g['homeTeam']['teamName'],
                            'triCode': g['homeTeam']['teamTricode'],
                            'score': g['homeTeam']['score']
                        },
                        'awayTeam': {
                            'id': g['awayTeam']['teamId'],
                            'name': g['awayTeam']['teamName'],
                            'triCode': g['awayTeam']['teamTricode'],
                            'score': g['awayTeam']['score']
                        },
                        'venue': g.get('arena', {}).get('arenaName', 'Arena'),
                        'startTime': g['gameCode']
                    })
                if games:
                    return games
    except Exception as e:
        sys.stderr.write(f"CDN check failed: {str(e)}\n")

    try:
        sb = scoreboardv2.ScoreboardV2(game_date=game_date, headers=HEADERS, timeout=30)
        data = sb.get_dict()
        if not data: return []
        
        scoreboard_data = data['resultSets'][0]
        linescore_data = data['resultSets'][1]
        
        sb_headers = scoreboard_data['headers']
        sb_rows = scoreboard_data['rowSet']
        sb_idx = {header: i for i, header in enumerate(sb_headers)}
        
        ls_headers = linescore_data['headers']
        ls_rows = linescore_data['rowSet']
        ls_idx = {header: i for i, header in enumerate(ls_headers)}
        
        team_stats = {}
        for row in ls_rows:
            game_id = row[ls_idx['GAME_ID']]
            team_id = row[ls_idx['TEAM_ID']]
            if game_id not in team_stats:
                team_stats[game_id] = {}
            
            team_stats[game_id][team_id] = {
                'score': row[ls_idx['PTS']] if row[ls_idx['PTS']] is not None else 0,
                'triCode': row[ls_idx['TEAM_ABBREVIATION']],
                'city': row[ls_idx['TEAM_CITY_NAME']],
                'name': row[ls_idx['TEAM_NAME']]
            }
            
        games = []
        for row in sb_rows:
            game_id = row[sb_idx['GAME_ID']]
            status = row[sb_idx['GAME_STATUS_TEXT']].strip()
            status_code = row[sb_idx['GAME_STATUS_ID']]
            
            home_team_id = row[sb_idx['HOME_TEAM_ID']]
            away_team_id = row[sb_idx['VISITOR_TEAM_ID']]
            
            home_info = team_stats.get(game_id, {}).get(home_team_id, {})
            away_info = team_stats.get(game_id, {}).get(away_team_id, {})
            
            games.append({
                'id': game_id,
                'status': status,
                'statusCode': status_code,
                'period': row[sb_idx['LIVE_PERIOD']],
                'clock': row[sb_idx['LIVE_PC_TIME']] if row[sb_idx['LIVE_PC_TIME']] else status,
                'gameTimeUTC': f"{game_date}T{row[sb_idx['GAMECODE']][:4][:2]}:{row[sb_idx['GAMECODE']][:4][2:]}:00Z",
                'homeTeam': {
                    'id': home_team_id,
                    'name': home_info.get('name', 'Home'),
                    'triCode': home_info.get('triCode', ''),
                    'score': home_info.get('score', 0)
                },
                'awayTeam': {
                    'id': away_team_id,
                    'name': away_info.get('name', 'Away'),
                    'triCode': away_info.get('triCode', ''),
                    'score': away_info.get('score', 0)
                },
                'venue': row[sb_idx['ARENA_NAME']],
                'startTime': row[sb_idx['GAMECODE']]
            })
            
        return games
    except Exception as e:
        sys.stderr.write(f"Error in fetch_by_date fallback: {str(e)}\n")
        return []

def fetch_play_by_play(game_id):
    try:
        url = f"https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{game_id}.json"
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return {'plays': [], 'momentum': []}
            
        data = response.json()
        plays = []
        momentum = []
        game_data = data.get('game', {})
        actions = game_data.get('actions', [])
        
        for action in actions:
            description = action.get('description')
            if not description: continue

            clock = action.get('clock', '')
            if clock.startswith('PT'):
                clock = clock.replace('PT', '').replace('S', '')
                if 'M' in clock:
                    minutes, seconds = clock.split('M')
                    clock = f"{int(minutes)}:{seconds.split('.')[0].zfill(2)}"
                else:
                    clock = f"0:{clock.split('.')[0].zfill(2)}"

            sa = action.get('scoreAway')
            sh = action.get('scoreHome')
            score_str = ""
            if sa is not None and sh is not None and sa != "" and sh != "":
                score_str = f"{sa} - {sh}"
                momentum.append({
                    'time': clock,
                    'period': action.get('period'),
                    'diff': int(sh) - int(sa)
                })

            plays.append({
                'actionNumber': action.get('actionNumber'),
                'eventMsgType': action.get('actionType'),
                'period': action.get('period'),
                'clock': clock,
                'description': description,
                'score': score_str,
                'teamId': action.get('teamId')
            })
            
        return {'plays': plays, 'momentum': momentum}
    except Exception as e:
        sys.stderr.write(f"Error in fetch_play_by_play: {str(e)}\n")
        return {'plays': [], 'momentum': []}

def fetch_box_score(game_id):
    try:
        url = f"https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{game_id}.json"
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return {'players': [], 'teamStats': {}}
            
        data = response.json()
        players = []
        team_stats = {}
        box_data = data.get('game', {})
        
        for side in ['homeTeam', 'awayTeam']:
            team_data = box_data.get(side, {})
            team_id = team_data.get('teamId')
            stats_data = team_data.get('statistics', {})
            
            team_stats[side] = {
                'id': team_id,
                'pts': team_data.get('score', 0),
                'reb': stats_data.get('reboundsTotal', 0),
                'ast': stats_data.get('assists', 0),
                'stl': stats_data.get('steals', 0),
                'blk': stats_data.get('blocks', 0),
                'tov': stats_data.get('turnovers', 0),
                'fgPct': stats_data.get('fieldGoalsPercentage', 0),
                'fg3Pct': stats_data.get('threePointersPercentage', 0),
                'ftPct': stats_data.get('freeThrowsPercentage', 0)
            }
            
            for player in team_data.get('players', []):
                min_str = player.get('statistics', {}).get('minutes', 'PT00M00.00S')
                if '00M00' in min_str or not min_str: continue
                
                # Format PTXXMXX.XXS to XX:XX
                if min_str.startswith('PT'):
                    min_str = min_str.replace('PT', '').replace('S', '')
                    if 'M' in min_str:
                        m, s = min_str.split('M')
                        min_str = f"{int(m)}:{s.split('.')[0].zfill(2)}"
                    else:
                        min_str = f"0:{min_str.split('.')[0].zfill(2)}"

                stats = player.get('statistics', {})
                players.append({
                    'id': player.get('personId'),
                    'name': player.get('name'),
                    'teamId': team_id,
                    'min': min_str,
                    'pts': stats.get('points', 0),
                    'reb': stats.get('reboundsTotal', 0),
                    'ast': stats.get('assists', 0),
                    'stl': stats.get('steals', 0),
                    'blk': stats.get('blocks', 0),
                    'fgm': stats.get('fieldGoalsMade', 0),
                    'fga': stats.get('fieldGoalsAttempted', 0),
                    'ftm': stats.get('freeThrowsMade', 0),
                    'fta': stats.get('freeThrowsAttempted', 0),
                    'plusMinus': stats.get('plusMinusPoints', 0)
                })
                
        return {'players': players, 'teamStats': team_stats}
    except Exception as e:
        sys.stderr.write(f"Error in fetch_box_score: {str(e)}\n")
        return {'players': [], 'teamStats': {}}

def fetch_standings():
    try:
        sb = leaguestandingsv3.LeagueStandingsV3(headers=HEADERS, timeout=30)
        data = sb.get_dict()
        if not data: return []
        
        rs = data['resultSets'][0]
        idx = {h: i for i, h in enumerate(rs['headers'])}
        teams = []
        for r in rs['rowSet']:
            teams.append({
                'id': r[idx['TeamID']],
                'team': f"{r[idx['TeamCity']]} {r[idx['TeamName']]}",
                'conference': r[idx['Conference']],
                'rank': r[idx['PlayoffRank']],
                'wins': r[idx['WINS']],
                'losses': r[idx['LOSSES']],
                'winPct': r[idx['WinPCT']],
                'streak': r[idx['CurrentStreak']],
                'l10': r[idx['L10']]
            })
        return teams
    except Exception as e:
        sys.stderr.write(f"Error in fetch_standings: {str(e)}\n")
        return []

def fetch_team(team_id):
    try:
        dash_obj = teamdashboardbygeneralsplits.TeamDashboardByGeneralSplits(team_id=team_id, headers=HEADERS, timeout=30)
        dash = dash_obj.get_dict()
        log_obj = teamgamelog.TeamGameLog(team_id=team_id, headers=HEADERS, timeout=30)
        log = log_obj.get_dict()
        
        if not dash or not log: return {}
        
        o_rs = dash['resultSets'][0]
        o_row = o_rs['rowSet'][0]
        o_idx = {h: i for i, h in enumerate(o_rs['headers'])}
        gp = o_row[o_idx['GP']] or 1
        
        stats = {
            'ppg': o_row[o_idx['PTS']]/gp,
            'apg': o_row[o_idx['AST']]/gp,
            'rpg': o_row[o_idx['REB']]/gp,
            'gp': o_row[o_idx['GP']],
            'w': o_row[o_idx['W']],
            'l': o_row[o_idx['L']],
            'fg_pct': o_row[o_idx['FG_PCT']],
            'fg3_pct': o_row[o_idx['FG3_PCT']],
            'ft_pct': o_row[o_idx['FT_PCT']]
        }
        
        l_rs = log['resultSets'][0]
        l_idx = {h: i for i, h in enumerate(l_rs['headers'])}
        recent = []
        for r in l_rs['rowSet'][:10]:
            recent.append({
                'gameId': r[l_idx['Game_ID']],
                'date': r[l_idx['GAME_DATE']],
                'matchup': r[l_idx['MATCHUP']],
                'wl': r[l_idx['WL']],
                'pts': r[l_idx['PTS']]
            })
        return {'stats': stats, 'recentGames': recent}
    except Exception as e:
        sys.stderr.write(f"Error in fetch_team: {str(e)}\n")
        return {}

def fetch_shots(game_id):
    try:
        box_url = f"https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{game_id}.json"
        box_res = requests.get(box_url, timeout=10)
        if box_res.status_code != 200: return []
        box_data = box_res.json()
        
        all_shots = []
        for side in ['homeTeam', 'awayTeam']:
            t_id = box_data['game'][side]['teamId']
            sc_obj = shotchartdetail.ShotChartDetail(
                team_id=t_id, 
                player_id=0, 
                game_id_nullable=game_id, 
                context_measure_simple='FGA', 
                season_nullable='2025-26', 
                headers=HEADERS, 
                timeout=30
            )
            sc = sc_obj.get_dict()
            if not sc: continue
            
            rs = sc['resultSets'][0]
            idx = {h: i for i, h in enumerate(rs['headers'])}
            for r in rs['rowSet']:
                all_shots.append({
                    'teamId': t_id,
                    'playerId': r[idx['PLAYER_ID']],
                    'x': r[idx['LOC_X']],
                    'y': r[idx['LOC_Y']],
                    'made': r[idx['SHOT_MADE_FLAG']] == 1,
                    'type': r[idx['SHOT_TYPE']],
                    'player': r[idx['PLAYER_NAME']]
                })
        return all_shots
    except Exception as e:
        sys.stderr.write(f"Error in fetch_shots: {str(e)}\n")
        return []

def fetch_player_info(player_id):
    try:
        pi_obj = commonplayerinfo.CommonPlayerInfo(player_id=player_id, headers=HEADERS, timeout=30)
        data = pi_obj.get_dict()
        if not data: return {}
        
        common = data['resultSets'][0]
        idx = {h: i for i, h in enumerate(common['headers'])}
        row = common['rowSet'][0]
        return {
            'name': row[idx['DISPLAY_FIRST_LAST']],
            'position': row[idx['POSITION']],
            'height': row[idx['HEIGHT']],
            'weight': row[idx['WEIGHT']],
            'birthdate': row[idx['BIRTHDATE']],
            'country': row[idx['COUNTRY']],
            'last_affiliation': row[idx['LAST_AFFILIATION']],
            'team': row[idx['TEAM_NAME']],
            'number': row[idx['JERSEY']]
        }
    except Exception as e:
        sys.stderr.write(f"Error in fetch_player_info: {str(e)}\n")
        return {}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', help='Date in YYYY-MM-DD format')
    parser.add_argument('--gameId', help='NBA Game ID')
    parser.add_argument('--teamId', help='NBA Team ID')
    parser.add_argument('--playerId', help='NBA Player ID')
    parser.add_argument('--type', help='Type of data to fetch: pbp, boxscore, standings, team, player, shots')
    args = parser.parse_args()

    if args.type == 'pbp':
        result = fetch_play_by_play(args.gameId)
    elif args.type == 'boxscore':
        result = fetch_box_score(args.gameId)
    elif args.type == 'standings':
        result = {'standings': fetch_standings()}
    elif args.type == 'team':
        result = {'teamDetails': fetch_team(args.teamId)}
    elif args.type == 'player':
        result = {'playerInfo': fetch_player_info(args.playerId)}
    elif args.type == 'shots':
        result = {'shots': fetch_shots(args.gameId)}
    else:
        target_date = args.date if args.date else datetime.now().strftime('%Y-%m-%d')
        result = {'games': fetch_by_date(target_date)}
        
    print(json.dumps(result))
