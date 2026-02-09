import sys
import json
import argparse
from datetime import datetime
from nba_api.stats.endpoints import scoreboardv2, playbyplayv2

def fetch_by_date(game_date):
    try:
        sb = scoreboardv2.ScoreboardV2(game_date=game_date)
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
        return []

def fetch_play_by_play(game_id):
    try:
        pbp = playbyplayv2.PlayByPlayV2(game_id=game_id)
        data = pbp.get_dict()
        
        pbp_data = data['resultSets'][0]
        headers = pbp_data['headers']
        rows = pbp_data['rowSet']
        idx = {header: i for i, header in enumerate(headers)}
        
        plays = []
        for row in rows:
            # We want to capture the actual play description from home, visitor or neutral columns
            home_desc = row[idx['HOMEDESCRIPTION']]
            visitor_desc = row[idx['VISITORDESCRIPTION']]
            neutral_desc = row[idx['NEUTRALDESCRIPTION']]
            
            description = home_desc or visitor_desc or neutral_desc
            if not description: continue

            plays.append({
                'eventMsgType': row[idx['EVENTMSGTYPE']],
                'period': row[idx['PERIOD']],
                'clock': row[idx['PCTIMESTRING']],
                'description': description,
                'score': row[idx['SCORE']],
                'teamId': row[idx['PLAYER1_TEAM_ID']] # Often indicates who made the play
            })
            
        # Return last 50 plays to keep it snappy
        return plays[-50:]
    except Exception as e:
        return []

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', help='Date in YYYY-MM-DD format')
    parser.add_argument('--gameId', help='NBA Game ID for play-by-play')
    args = parser.parse_args()

    if args.gameId:
        result = {'plays': fetch_play_by_play(args.gameId)}
    else:
        target_date = args.date if args.date else datetime.now().strftime('%Y-%m-%d')
        result = {'games': fetch_by_date(target_date)}
        
    print(json.dumps(result))