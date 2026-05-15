import os
import re
import requests
from datetime import date as date_type, datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = _origins_env.split(",") if _origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

ESPN = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"


# ── helpers ──────────────────────────────────────────────────────────────────

def _parse_ma(val):
    try:
        m, a = str(val).split("-")
        return int(m), int(a)
    except Exception:
        return 0, 0

def _parse_pct(val):
    m, a = _parse_ma(val)
    return round(m / a * 100, 1) if a > 0 else 0.0

def _stat(stats, idx, key, default=0):
    i = idx.get(key)
    if i is None or i >= len(stats):
        return default
    try:
        v = stats[i]
        return int(float(v)) if v not in ("", "--", None) else default
    except Exception:
        return default

def _str_stat(stats, idx, key, default=""):
    i = idx.get(key)
    if i is None or i >= len(stats):
        return default
    v = stats[i]
    return str(v) if v not in ("", "--", None) else default

def _get_record(competitor):
    for r in competitor.get("records", []):
        if r.get("type") in ("total", "ytd") or r.get("name", "").lower() in ("overall", "total"):
            return r.get("summary", "")
    recs = competitor.get("records", [])
    return recs[0].get("summary", "") if recs else ""

def _compute_totals(players):
    active = [p for p in players if not p.get("dnp")]
    fgm  = sum(p["fg_made"]  for p in active)
    fga  = sum(p["fg_att"]   for p in active)
    fg3m = sum(p["fg3_made"] for p in active)
    fg3a = sum(p["fg3_att"]  for p in active)
    ftm  = sum(p["ft_made"]  for p in active)
    fta  = sum(p["ft_att"]   for p in active)
    return {
        "name": "TOTALS", "position": "", "minutes": "",
        "points":    sum(p["points"]    for p in active),
        "rebounds":  sum(p["rebounds"]  for p in active),
        "assists":   sum(p["assists"]   for p in active),
        "steals":    sum(p["steals"]    for p in active),
        "blocks":    sum(p["blocks"]    for p in active),
        "turnovers": sum(p["turnovers"] for p in active),
        "fouls":     sum(p["fouls"]     for p in active),
        "fg_pct":    round(fgm  / fga  * 100, 1) if fga  else 0.0,
        "three_pct": round(fg3m / fg3a * 100, 1) if fg3a else 0.0,
        "ft_pct":    round(ftm  / fta  * 100, 1) if fta  else 0.0,
        "fg_made": fgm, "fg_att": fga, "fg3_made": fg3m,
        "fg3_att": fg3a, "ft_made": ftm, "ft_att": fta,
        "plus_minus": None, "dnp": False, "is_total": True,
    }

def _make_player(name, pos, pts, reb, ast, stl, blk, to, pf,
                 fgm, fga, fg3m, fg3a, ftm, fta, pm, mins=""):
    return {
        "name": name, "position": pos, "minutes": mins,
        "points": pts, "rebounds": reb, "assists": ast,
        "steals": stl, "blocks": blk, "turnovers": to, "fouls": pf,
        "fg_pct":    round(fgm  / fga  * 100, 1) if fga  else 0.0,
        "three_pct": round(fg3m / fg3a * 100, 1) if fg3a else 0.0,
        "ft_pct":    round(ftm  / fta  * 100, 1) if fta  else 0.0,
        "fg_made": fgm, "fg_att": fga,
        "fg3_made": fg3m, "fg3_att": fg3a,
        "ft_made": ftm, "ft_att": fta,
        "plus_minus": pm, "dnp": False,
    }


# ── mock data ─────────────────────────────────────────────────────────────────

_det = [
    _make_player("Cade Cunningham",  "G", 31, 5, 8, 2, 0, 3, 2, 11,22, 4, 9, 5, 6,+12,"38:20"),
    _make_player("Jaden Ivey",        "G", 14, 3, 5, 1, 0, 2, 3,  5,13, 2, 6, 2, 2, +4,"32:10"),
    _make_player("Ausar Thompson",    "F", 18, 9, 2, 3, 2, 1, 3,  7,12, 0, 1, 4, 5, +8,"35:45"),
    _make_player("Bojan Bogdanovic",  "F", 12, 4, 1, 0, 0, 1, 2,  4, 9, 2, 5, 2, 2, -2,"28:30"),
    _make_player("Isaiah Stewart",    "C", 10,11, 2, 1, 2, 2, 4,  4, 7, 0, 0, 2, 3, +5,"30:15"),
    _make_player("Monte Morris",      "G",  8, 2, 4, 1, 0, 1, 1,  3, 7, 1, 2, 1, 2, +3,"22:40"),
    _make_player("James Wiseman",     "C",  7, 5, 0, 0, 1, 0, 2,  3, 5, 0, 0, 1, 2, -1,"18:20"),
    _make_player("Killian Hayes",     "G",  5, 2, 3, 0, 0, 2, 1,  2, 6, 1, 3, 0, 0, -2,"14:30"),
    _make_player("Evan Fournier",     "F",  3, 1, 0, 0, 0, 0, 0,  1, 4, 1, 3, 0, 0, -6,"20:10"),
]
_cle = [
    _make_player("Donovan Mitchell",  "G", 28, 4, 6, 2, 0, 3, 2, 10,21, 3, 8, 5, 6, -8,"37:15"),
    _make_player("Darius Garland",    "G", 19, 3, 9, 1, 0, 2, 3,  7,15, 2, 5, 3, 4, -4,"36:30"),
    _make_player("Evan Mobley",       "F", 16,12, 3, 1, 3, 1, 4,  6,11, 0, 0, 4, 6, +2,"34:20"),
    _make_player("Jarrett Allen",     "C", 13,10, 2, 0, 2, 2, 4,  5, 8, 0, 0, 3, 4, -3,"32:45"),
    _make_player("Isaac Okoro",       "F", 10, 3, 1, 2, 0, 1, 2,  4, 9, 2, 5, 0, 0, -5,"28:10"),
    _make_player("Caris LeVert",      "G",  8, 2, 3, 0, 0, 2, 2,  3, 8, 1, 3, 1, 2, +1,"24:30"),
    _make_player("Dean Wade",         "F",  4, 3, 1, 0, 1, 0, 2,  2, 4, 0, 2, 0, 0, -2,"18:45"),
    _make_player("Robin Lopez",       "C",  3, 4, 0, 0, 1, 1, 2,  1, 3, 0, 0, 1, 2, +1,"16:25"),
]

MOCK_BOXSCORE = {
    "status": "Final", "period": 4,
    "away": {"team": "DET", "score": 108, "players": _det, "totals": _compute_totals(_det)},
    "home": {"team": "CLE", "score": 101, "players": _cle, "totals": _compute_totals(_cle)},
}


# ── routes ────────────────────────────────────────────────────────────────────

@app.get("/boxscore/mock")
def get_mock_boxscore():
    return MOCK_BOXSCORE


@app.get("/games")
def get_games(date: str = Query(default=None)):
    today = date_type.today().isoformat()
    use_date = date or today

    try:
        datetime.strptime(use_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD")

    try:
        resp = requests.get(
            f"{ESPN}/scoreboard",
            params={"dates": use_date.replace("-", "")},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.Timeout:
        raise HTTPException(status_code=504, detail="ESPN API timed out")
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch games")

    result = []
    for event in data.get("events", []):
        comp = event["competitions"][0]
        competitors = comp["competitors"]

        home = next((c for c in competitors if c["homeAway"] == "home"), {})
        away = next((c for c in competitors if c["homeAway"] == "away"), {})
        home_team = home.get("team", {})
        away_team = away.get("team", {})

        stype = event["status"]["type"]["name"]
        if "IN_PROGRESS" in stype:
            game_status = 2
        elif "FINAL" in stype or "POSTPONED" in stype:
            game_status = 3
        else:
            game_status = 1

        result.append({
            "game_id":      event["id"],
            "status":       event["status"]["type"]["shortDetail"],
            "game_status":  game_status,
            "home_team":    home_team.get("abbreviation", ""),
            "home_score":   int(home.get("score", 0) or 0),
            "home_color":   f"#{home_team.get('color', '1e2d3d')}",
            "home_record":  _get_record(home),
            "home_linescore": [int(ls.get("value", 0) or 0) for ls in home.get("linescores", [])],
            "away_team":    away_team.get("abbreviation", ""),
            "away_score":   int(away.get("score", 0) or 0),
            "away_color":   f"#{away_team.get('color', '1e2d3d')}",
            "away_record":  _get_record(away),
            "away_linescore": [int(ls.get("value", 0) or 0) for ls in away.get("linescores", [])],
        })
    return result


@app.get("/boxscore/{game_id}")
def get_boxscore(game_id: str):
    if not re.fullmatch(r"\d{1,12}", game_id):
        raise HTTPException(status_code=400, detail="Invalid game ID")
    try:
        resp = requests.get(f"{ESPN}/summary", params={"event": game_id}, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.Timeout:
        raise HTTPException(status_code=504, detail="ESPN API timed out")
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch box score")

    header = data.get("header", {})
    header_comp = (header.get("competitions") or [{}])[0]
    header_competitors = header_comp.get("competitors", [])
    score_by_abbr = {c["team"]["abbreviation"]: int(c.get("score", 0) or 0) for c in header_competitors}
    side_by_abbr  = {c["team"]["abbreviation"]: c["homeAway"] for c in header_competitors}

    header_status = header_comp.get("status", {})
    status_text = header_status.get("type", {}).get("shortDetail", "")
    period = header_status.get("period", 0)

    teams = {}
    for section in data.get("boxscore", {}).get("players", []):
        team_info = section.get("team", {})
        tricode = team_info.get("abbreviation", "")
        stats_groups = section.get("statistics", [])
        if not stats_groups:
            continue

        group = stats_groups[0]
        names = group.get("names", [])
        idx   = {name: i for i, name in enumerate(names)}
        players = []

        for ath in group.get("athletes", []):
            athlete = ath.get("athlete", {})
            stats   = ath.get("stats", [])
            did_not_play = ath.get("didNotPlay", False) or (
                len(stats) > 0 and str(stats[0]).upper() in ("DNP", "DND", "NWT", "NA")
            )

            if not stats and not did_not_play:
                continue

            pos = athlete.get("position", {})
            position = pos.get("abbreviation", "") if isinstance(pos, dict) else ""

            if did_not_play or not stats:
                players.append({
                    "name": athlete.get("displayName", ""), "position": position,
                    "minutes": "", "points": 0, "rebounds": 0, "assists": 0,
                    "steals": 0, "blocks": 0, "turnovers": 0, "fouls": 0,
                    "fg_pct": 0.0, "three_pct": 0.0, "ft_pct": 0.0,
                    "fg_made": 0, "fg_att": 0, "fg3_made": 0, "fg3_att": 0,
                    "ft_made": 0, "ft_att": 0, "plus_minus": 0, "dnp": True,
                })
                continue

            fg_val  = stats[idx["FG"]]  if "FG"  in idx and idx["FG"]  < len(stats) else "0-0"
            tpt_val = stats[idx["3PT"]] if "3PT" in idx and idx["3PT"] < len(stats) else "0-0"
            ft_val  = stats[idx["FT"]]  if "FT"  in idx and idx["FT"]  < len(stats) else "0-0"

            fgm,  fga  = _parse_ma(fg_val)
            fg3m, fg3a = _parse_ma(tpt_val)
            ftm,  fta  = _parse_ma(ft_val)

            players.append({
                "name":      athlete.get("displayName", ""),
                "position":  position,
                "minutes":   _str_stat(stats, idx, "MIN"),
                "points":    _stat(stats, idx, "PTS"),
                "rebounds":  _stat(stats, idx, "REB"),
                "assists":   _stat(stats, idx, "AST"),
                "steals":    _stat(stats, idx, "STL"),
                "blocks":    _stat(stats, idx, "BLK"),
                "turnovers": _stat(stats, idx, "TO"),
                "fouls":     _stat(stats, idx, "PF"),
                "fg_pct":    round(fgm  / fga  * 100, 1) if fga  else 0.0,
                "three_pct": round(fg3m / fg3a * 100, 1) if fg3a else 0.0,
                "ft_pct":    round(ftm  / fta  * 100, 1) if fta  else 0.0,
                "fg_made": fgm, "fg_att": fga,
                "fg3_made": fg3m, "fg3_att": fg3a,
                "ft_made": ftm, "ft_att": fta,
                "plus_minus": _stat(stats, idx, "+/-"),
                "dnp": False,
            })

        teams[tricode] = {
            "team":    tricode,
            "score":   score_by_abbr.get(tricode, 0),
            "players": players,
            "totals":  _compute_totals(players),
            "_side":   side_by_abbr.get(tricode, "away"),
        }

    home_team = next((t for t in teams.values() if t["_side"] == "home"), None)
    away_team = next((t for t in teams.values() if t["_side"] == "away"), None)

    if not home_team or not away_team:
        raise HTTPException(status_code=404, detail="Box score not found")

    for t in (home_team, away_team):
        del t["_side"]

    return {"home": home_team, "away": away_team, "status": status_text, "period": period}
