import { useState, useEffect } from "react";
import BoxScore from "./BoxScore";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const THEMES = {
  gulf: {
    label: "CHICANE",
    accent: "#00AEEF",  accentRgb: "0, 174, 239",
    yellow: "#FF7900",  yellowRgb: "255, 121, 0",
    pink:   "#FF7900",  pinkRgb:   "255, 121, 0",
    pmPosText: "#00AEEF", pmPosBg: "rgba(0,174,239,0.12)",
    hotStat: "#FF7900", scoreWin: "#FF7900",
    liveColor: "#FF7900", liveRgb: "255, 121, 0",
  },
  raiders: {
    label: "OUTLAW",
    accent: "#A5ACAF",  accentRgb: "165, 172, 175",
    yellow: "#C8CCCE",  yellowRgb: "200, 204, 206",
    pink:   "#E0E3E4",  pinkRgb:   "224, 227, 228",
    pmPosText: "#A5ACAF", pmPosBg: "rgba(165,172,175,0.12)",
    hotStat: "#C8CCCE", scoreWin: "#C8CCCE",
    liveColor: "#C8CCCE", liveRgb: "200, 204, 206",
  },
  beavers: {
    label: "BEAVS",
    accent: "#DC4405",  accentRgb: "220, 68, 5",
    yellow: "#FF6B1A",  yellowRgb: "255, 107, 26",
    pink:   "#DC4405",  pinkRgb:   "220, 68, 5",
    pmPosText: "#DC4405", pmPosBg: "rgba(220,68,5,0.12)",
    hotStat: "#FF6B1A", scoreWin: "#DC4405",
    liveColor: "#FF6B1A", liveRgb: "255, 107, 26",
  },
  dodgers: {
    label: "GRAND SLAM",
    accent: "#1B8FFF",  accentRgb: "27, 143, 255",
    yellow: "#FFFFFF",  yellowRgb: "255, 255, 255",
    pink:   "#FFFFFF",  pinkRgb:   "255, 255, 255",
    pmPosText: "#1B8FFF", pmPosBg: "rgba(27,143,255,0.12)",
    hotStat: "#FFFFFF", scoreWin: "#1B8FFF",
    liveColor: "#1B8FFF", liveRgb: "27, 143, 255",
  },
  clippers: {
    label: "CLIPS",
    accent: "#4B8FFF",  accentRgb: "75, 143, 255",
    yellow: "#C8102E",  yellowRgb: "200, 16, 46",
    pink:   "#C8102E",  pinkRgb:   "200, 16, 46",
    pmPosText: "#4B8FFF", pmPosBg: "rgba(75,143,255,0.12)",
    hotStat: "#C8102E", scoreWin: "#4B8FFF",
    liveColor: "#C8102E", liveRgb: "200, 16, 46",
  },
};

function applyTheme(t) {
  const r = document.documentElement;
  r.style.setProperty("--accent",          t.accent);
  r.style.setProperty("--accent-rgb",      t.accentRgb);
  r.style.setProperty("--yellow",          t.yellow);
  r.style.setProperty("--yellow-rgb",      t.yellowRgb);
  r.style.setProperty("--pink",            t.pink);
  r.style.setProperty("--pink-rgb",        t.pinkRgb);
  r.style.setProperty("--pm-pos-text",     t.pmPosText);
  r.style.setProperty("--pm-pos-bg",       t.pmPosBg);
  r.style.setProperty("--hot-stat",        t.hotStat);
  r.style.setProperty("--score-win-color", t.scoreWin);
  r.style.setProperty("--live-color",      t.liveColor);
  r.style.setProperty("--live-rgb",        t.liveRgb);
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function App() {
  const [date, setDate] = useState(localToday);
  const [games, setGames] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedSide, setSelectedSide] = useState("away");
  const [useMock, setUseMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTheme, setActiveTheme] = useState(
    () => localStorage.getItem("nba-theme") || "gulf"
  );

  const isMobile     = useIsMobile();
  const liveCount    = games.filter((g) => g.game_status === 2).length;
  const selectedGame = games.find((g) => g.game_id === selectedId) || null;
  const effectiveMock = useMock && selectedGame?.game_status === 1;
  const showBoxScore  = selectedGame && (selectedGame.game_status > 1 || effectiveMock);
  const showPregame   = selectedGame && selectedGame.game_status === 1 && !effectiveMock;

  useEffect(() => { applyTheme(THEMES[activeTheme]); }, [activeTheme]);
  useEffect(() => { setSelectedSide("away"); }, [selectedId]);

  const selectTheme = (key) => {
    setActiveTheme(key);
    localStorage.setItem("nba-theme", key);
  };

  const fetchGames = async () => {
    try {
      const res = await fetch(`${API}/games?date=${date}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setGames(result);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString());
      setSelectedId((prev) => prev || (result.length > 0 ? result[0].game_id : null));
    } catch {
      setError("Could not load games. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    setUseMock(false);
    fetchGames();
    const interval = setInterval(fetchGames, 30000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <div style={S.page}>
      <header className="header-border-sweep" style={{ ...S.header, padding: isMobile ? "12px 16px 10px" : "16px 40px 14px" }}>
        <div style={S.headerTop}>
          <div style={S.brand}>
            <span className="pink-glow" style={{ ...S.brandNba, fontSize: isMobile ? 36 : 48 }}>NBA</span>
            <div style={S.brandRule} />
            <span style={S.brandSub}>LIVE BOX SCORE</span>
          </div>
          <div style={{ ...S.controls, gap: isMobile ? 8 : 12 }}>
            {liveCount > 0 && (
              <div style={S.liveBadge}>
                <span className="live-dot" />
                {liveCount} LIVE
              </div>
            )}
            <input
              type="date"
              value={date}
              max={localToday()}
              onChange={(e) => setDate(e.target.value)}
              style={S.datePicker}
            />
            {games.length > 0 && (
              <select
                value={selectedId || ""}
                onChange={(e) => { setSelectedId(e.target.value); setUseMock(false); }}
                style={{ ...S.gameSelect, minWidth: isMobile ? 0 : 220, flex: isMobile ? 1 : undefined }}
              >
                {games.map((g) => (
                  <option key={g.game_id} value={g.game_id}>
                    {g.away_team} @ {g.home_team}
                    {g.game_status === 2 ? "  · LIVE" : `  · ${g.status}`}
                  </option>
                ))}
              </select>
            )}
            {lastUpdated && (
              <span className="yellow-glow" style={S.updated}>Updated {lastUpdated}</span>
            )}
          </div>
        </div>

        <div className="theme-bar" style={S.themeBar}>
          <span style={S.themeLabel}>THEME</span>
          {Object.entries(THEMES).map(([key, t]) => {
            const isActive = activeTheme === key;
            return (
              <button
                key={key}
                onClick={() => selectTheme(key)}
                style={{
                  ...S.themeBtn,
                  borderColor: isActive ? t.accent : "var(--border-color)",
                  color:       isActive ? t.accent : "var(--text-secondary)",
                  background:  isActive ? `${t.accent}18` : "transparent",
                  boxShadow:   isActive ? `0 0 10px ${t.accent}55` : "none",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <div style={{ ...S.mainOuter, padding: isMobile ? "0 12px" : "0 24px" }}>
        <div style={{ ...S.mainInner, paddingTop: isMobile ? 16 : 24 }}>
          {loading && <p style={S.center}>Loading games...</p>}
          {error   && <p style={{ ...S.center, color: "#ef4444" }}>{error}</p>}
          {!loading && !error && games.length === 0 && (
            <p style={S.center}>No games found for this date.</p>
          )}

          {selectedGame && (
            <>
              <ScoreHeader
                game={selectedGame}
                selectedSide={selectedSide}
                onSideSelect={setSelectedSide}
                isMobile={isMobile}
              />

              {showPregame && (
                <div style={{ ...S.panel, flex: 1, textAlign: "center", padding: "28px 24px" }}>
                  <p style={S.pregameText}>Tip-off {selectedGame.status}</p>
                  <button
                    className="sample-btn"
                    style={S.sampleBtn}
                    onClick={() => setUseMock(true)}
                  >
                    View sample box score
                  </button>
                </div>
              )}

              {showBoxScore && (
                <div style={{ ...S.panel, overflowX: isMobile ? "auto" : undefined }}>
                  <BoxScore
                    gameId={effectiveMock ? "mock" : selectedGame.game_id}
                    selectedSide={selectedSide}
                    isMobile={isMobile}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function periodLabel(i) {
  if (i < 4) return `Q${i + 1}`;
  if (i === 4) return "OT";
  return `OT${i - 3}`;
}

function QuarterStrip({ game }) {
  const away = game.away_linescore || [];
  const home = game.home_linescore || [];
  const periods = Math.max(away.length, home.length);
  if (periods === 0) return null;

  return (
    <div className="quarter-strip-wrap" style={SQ.wrap}>
      <table style={SQ.table}>
        <thead>
          <tr>
            <th style={SQ.thTeam} />
            {Array.from({ length: periods }, (_, i) => (
              <th key={i} style={SQ.th}>{periodLabel(i)}</th>
            ))}
            <th style={SQ.thTotal}>T</th>
          </tr>
        </thead>
        <tbody>
          {[
            { tricode: game.away_team, scores: away, total: game.away_score },
            { tricode: game.home_team, scores: home, total: game.home_score },
          ].map((row) => (
            <tr key={row.tricode}>
              <td style={SQ.tdTeam}>{row.tricode}</td>
              {Array.from({ length: periods }, (_, i) => (
                <td key={i} style={SQ.td}>{row.scores[i] ?? "—"}</td>
              ))}
              <td style={SQ.tdTotal}>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreHeader({ game, selectedSide, onSideSelect, isMobile }) {
  const isLive  = game.game_status === 2;
  const isFinal = game.game_status === 3;
  const awayWins = isFinal && game.away_score > game.home_score;
  const homeWins = isFinal && game.home_score > game.away_score;
  const awayColor = game.away_color || "#1e2d3d";
  const homeColor = game.home_color || "#1e2d3d";

  const sideStyle = (side) => ({
    ...S.teamSide,
    cursor: "pointer",
    opacity: selectedSide === side ? 1 : 0.4,
    transition: "opacity 0.2s ease",
    userSelect: "none",
  });

  return (
    <div style={{
      ...S.scoreHeader,
      background: `linear-gradient(135deg, ${awayColor}22 0%, var(--bg-card) 40%, var(--bg-card) 60%, ${homeColor}22 100%)`,
    }}>
      <div style={S.scoreRow}>
        <div style={sideStyle("away")} onClick={() => onSideSelect("away")}>
          <span style={{
            ...S.tricode,
            borderBottom: selectedSide === "away" ? "1px solid var(--accent)" : "1px solid transparent",
            paddingBottom: 2,
          }}>
            {game.away_team}
          </span>
          {game.away_record && <span style={S.record}>{game.away_record}</span>}
          <span
            className={awayWins ? "neon-score-glow" : ""}
            style={{ ...S.score, fontSize: isMobile ? 40 : 56, color: awayWins ? "var(--score-win-color)" : "var(--text-primary)" }}
          >
            {game.away_score}
          </span>
        </div>

        <div style={{ ...S.divider, height: isMobile ? 32 : 44 }} />

        <div style={S.statusCol}>
          {isLive && <span className="live-dot" />}
          <span style={{
            ...S.statusLabel,
            color: isLive ? "var(--live-color)" : isFinal ? "var(--text-dim)" : "var(--text-secondary)",
            letterSpacing: isLive ? 2 : 1,
          }}>
            {isLive ? "LIVE" : game.status}
          </span>
        </div>

        <div style={{ ...S.divider, height: isMobile ? 32 : 44 }} />

        <div style={{ ...sideStyle("home"), textAlign: "right" }} onClick={() => onSideSelect("home")}>
          <span style={{
            ...S.tricode,
            borderBottom: selectedSide === "home" ? "1px solid var(--accent)" : "1px solid transparent",
            paddingBottom: 2,
          }}>
            {game.home_team}
          </span>
          {game.home_record && <span style={S.record}>{game.home_record}</span>}
          <span
            className={homeWins ? "neon-score-glow" : ""}
            style={{ ...S.score, fontSize: isMobile ? 40 : 56, color: homeWins ? "var(--score-win-color)" : "var(--text-primary)" }}
          >
            {game.home_score}
          </span>
        </div>
      </div>

      {(game.away_linescore?.length ?? 0) > 0 && <QuarterStrip game={game} />}
    </div>
  );
}

const S = {
  page: {
    height: "100vh", display: "flex", flexDirection: "column",
    overflow: "hidden", background: "var(--bg-page)",
  },
  header: {
    display: "flex", flexDirection: "column",
    padding: "16px 40px 14px",
    background: "var(--bg-header)",
    flexShrink: 0,
  },
  headerTop: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12, marginBottom: 14,
  },
  brand: { display: "flex", flexDirection: "column", gap: 5 },
  brandNba: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 48, color: "var(--pink)", letterSpacing: 5, lineHeight: 1,
  },
  brandRule: {
    height: 1, background: "var(--accent)", borderRadius: 1,
    boxShadow: "0 0 8px var(--accent), 0 0 16px var(--accent)",
  },
  brandSub: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 9, fontWeight: 700, letterSpacing: 7, color: "var(--text-secondary)",
  },
  controls: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  liveBadge: {
    display: "flex", alignItems: "center",
    background: "rgba(var(--live-rgb), 0.08)", border: "1px solid rgba(var(--live-rgb), 0.3)",
    borderRadius: 20, padding: "4px 12px",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "var(--live-color)",
    boxShadow: "0 0 10px rgba(var(--live-rgb), 0.15)",
  },
  datePicker: {
    background: "#161c28", border: "1px solid var(--border-color)",
    color: "var(--text-primary)", padding: "7px 12px", borderRadius: 6, fontSize: 13,
    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5,
  },
  gameSelect: {
    background: "#161c28", border: "1px solid var(--border-color)",
    color: "var(--text-primary)", padding: "7px 12px", borderRadius: 6, fontSize: 13,
    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5,
    cursor: "pointer", outline: "none", minWidth: 220,
  },
  updated: {
    fontSize: 11, color: "var(--yellow)",
    fontFamily: "'JetBrains Mono', monospace",
  },
  themeBar: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    paddingTop: 12, borderTop: "1px solid var(--border-color)",
  },
  themeLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8, letterSpacing: 2.5, color: "var(--text-dim)",
    marginRight: 4,
  },
  themeBtn: {
    padding: "4px 14px", borderRadius: 20, cursor: "pointer",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 10, fontWeight: 700, letterSpacing: 2,
    border: "1px solid", transition: "all 0.2s ease",
  },
  mainOuter: {
    flex: 1, overflow: "hidden",
    display: "flex", justifyContent: "center",
    padding: "0 24px",
  },
  mainInner: {
    maxWidth: 1100, width: "100%",
    display: "flex", flexDirection: "column",
    paddingTop: 24,
  },
  center: { textAlign: "center", color: "var(--text-secondary)", marginTop: 60, fontSize: 15, letterSpacing: 1 },
  scoreHeader: {
    border: "1px solid var(--border-color)",
    borderRadius: 8, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    borderBottom: "none", padding: "18px 24px",
    flexShrink: 0,
  },
  panel: {
    flex: 1, overflowY: "auto",
    border: "1px solid var(--border-color)",
    borderTop: "none", borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    background: "var(--bg-panel)", padding: "24px 24px 0",
  },
  scoreRow: { display: "flex", alignItems: "center" },
  teamSide: { flex: 1, display: "flex", flexDirection: "column", gap: 1 },
  tricode: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 10, fontWeight: 700, letterSpacing: 5, color: "var(--text-secondary)",
    textTransform: "uppercase", display: "inline-block",
  },
  record: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, color: "var(--text-dim)", letterSpacing: 0.5, lineHeight: 1,
  },
  score: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 56, lineHeight: 1, letterSpacing: 1,
    transition: "color 0.3s",
  },
  divider: { width: 1, height: 44, background: "var(--border-color)", margin: "0 20px", flexShrink: 0 },
  statusCol: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minWidth: 80,
  },
  statusLabel: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 12, fontWeight: 700,
  },
  pregameText: { color: "var(--text-secondary)", fontSize: 14, marginBottom: 16, letterSpacing: 1 },
  sampleBtn: {
    background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-secondary)",
    padding: "8px 22px", borderRadius: 6, cursor: "pointer", fontSize: 12,
    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1.5,
  },
};

const SQ = {
  wrap: { marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-color)" },
  table: { width: "100%", borderCollapse: "collapse" },
  thTeam: { width: 36 },
  th: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: 1.5, color: "var(--yellow)",
    textAlign: "center", paddingBottom: 6, fontWeight: 400,
  },
  thTotal: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: 1.5, color: "var(--text-secondary)",
    textAlign: "center", paddingBottom: 6, fontWeight: 400,
  },
  tdTeam: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 10, fontWeight: 700, letterSpacing: 3,
    color: "var(--text-secondary)", textTransform: "uppercase", paddingRight: 8,
  },
  td: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "var(--text-mono)",
    textAlign: "center", padding: "2px 6px",
  },
  tdTotal: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
    textAlign: "center", paddingLeft: 10,
    borderLeft: "1px solid var(--border-color)",
  },
};
