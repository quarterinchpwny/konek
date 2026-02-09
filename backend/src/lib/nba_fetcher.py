import sys
import json
import argparse
from datetime import datetime
from nba_api.stats.endpoints import scoreboardv2, playbyplayv3, boxscoretraditionalv3

# Custom headers to avoid being blocked
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

def fetch_by_date(game_date):
    try:
        sb = scoreboardv2.ScoreboardV2(game_date=game_date, headers=HEADERS, timeout=30)
        data = sb.get_dict()
        
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
        sys.stderr.write(f"Error in fetch_by_date: {str(e)}\n")
        return []

def fetch_play_by_play(game_id):
    try:
        # V3 returns a more nested JSON structure
        pbp = playbyplayv3.PlayByPlayV3(game_id=game_id, headers=HEADERS, timeout=30)
        data = pbp.get_dict()
        
        plays = []
        # Structure: data['game']['actions']
        game_data = data.get('game', {})
        actions = game_data.get('actions', [])
        
        for action in actions:
            description = action.get('description')
            if not description: continue

            # Format clock (e.g., PT06M05.00S -> 6:05)
            clock = action.get('clock', '')
            if clock.startswith('PT'):
                clock = clock.replace('PT', '').replace('S', '')
                if 'M' in clock:
                    minutes, seconds = clock.split('M')
                    clock = f"{int(minutes)}:{seconds.split('.')[0].zfill(2)}"
                else:
                    clock = f"0:{clock.split('.')[0].zfill(2)}"

            plays.append({
                'eventMsgType': action.get('actionType'),
                'period': action.get('period'),
                'clock': clock,
                'description': description,
                'score': f"{action.get('scoreAway')} - {action.get('scoreHome')}" if action.get('scoreAway') else "",
                'teamId': action.get('teamId')
            })
            
        return plays[-50:]
    except Exception as e:
        sys.stderr.write(f"Error in fetch_play_by_play: {str(e)}\n")
        return []

def fetch_box_score(game_id):
    try:
        box = boxscoretraditionalv3.BoxScoreTraditionalV3(game_id=game_id, headers=HEADERS, timeout=30)
        data = box.get_dict()
        
        players = []
        box_data = data.get('boxScoreTraditional', {})
        
        for side in ['homeTeam', 'awayTeam']:
            team_data = box_data.get(side, {})
            team_id = team_data.get('teamId')
            for player in team_data.get('players', []):
                min_str = player.get('statistics', {}).get('minutes', '00:00')
                if min_str == '00:00' or not min_str: continue
                
                stats = player.get('statistics', {})
                players.append({
                    'id': player.get('personId'),
                    'name': f"{player.get('firstName')} {player.get('familyName')}",
                    'teamId': team_id,
                    'min': min_str,
                    'pts': stats.get('points', 0),
                    'reb': stats.get('reboundsTotal', 0),
                    'ast': stats.get('assists', 0),
                    'stl': stats.get('steals', 0),
                    'blk': stats.get('blocks', 0)
                })
                
        return players
    except Exception as e:
        sys.stderr.write(f"Error in fetch_box_score: {str(e)}\n")
        return []

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', help='Date in YYYY-MM-DD format')
    parser.add_argument('--gameId', help='NBA Game ID')
    parser.add_argument('--type', help='Type of data to fetch: pbp or boxscore')
    args = parser.parse_args()

    if args.gameId:
        if args.type == 'boxscore':
            result = {'players': fetch_box_score(args.gameId)}
        else:
            result = {'plays': fetch_play_by_play(args.gameId)}
    else:
        target_date = args.date if args.date else datetime.now().strftime('%Y-%m-%d')
        result = {'games': fetch_by_date(target_date)}
        
    print(json.dumps(result))