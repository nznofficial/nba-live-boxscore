import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from nba_api.live.nba.endpoints import scoreboard, boxscore

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/games")
def get_games():
    time.sleep(0.5)
    try:
        board = scoreboard.ScoreBoard()
        games = board.games.get_dict()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"nba_api error: {e}")

    result = []
    for g in games:
        result.append({
            "game_id": g["gameId"],
            "status": g["gameStatusText"],
            "home_team": g["homeTeam"]["teamTricode"],
            "home_score": g["homeTeam"]["score"],
            "away_team": g["awayTeam"]["teamTricode"],
            "away_score": g["awayTeam"]["score"],
        })
    return result


@app.get("/boxscore/{game_id}")
def get_boxscore(game_id: str):
    time.sleep(0.5)
    try:
        bs = boxscore.BoxScore(game_id=game_id)
        data = bs.game.get_dict()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"nba_api error: {e}")

    def parse_team(team_data):
        players = []
        for p in team_data.get("players", []):
            s = p.get("statistics", {})
            players.append({
                "name": p["name"],
                "position": p.get("position", ""),
                "points": s.get("points", 0),
                "rebounds": s.get("reboundsTotal", 0),
                "assists": s.get("assists", 0),
                "steals": s.get("steals", 0),
                "blocks": s.get("blocks", 0),
                "fg_pct": round(s.get("fieldGoalsPercentage", 0) * 100, 1),
                "three_pct": round(s.get("threePointersPercentage", 0) * 100, 1),
                "plus_minus": s.get("plusMinusPoints", 0),
            })
        return {
            "team": team_data["teamTricode"],
            "score": team_data.get("score", 0),
            "players": players,
        }

    return {
        "home": parse_team(data["homeTeam"]),
        "away": parse_team(data["awayTeam"]),
        "status": data.get("gameStatusText", ""),
        "period": data.get("period", 0),
    }
