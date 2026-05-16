import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const REFRESH_MS = 30000;

export default function BoxScore({ gameId, selectedSide = "away", isMobile = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBoxScore = async () => {
    try {
      const res = await fetch(`${API}/boxscore/${gameId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch {
      setError("Could not load box score.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetchBoxScore();
    const interval = setInterval(fetchBoxScore, REFRESH_MS);
    return () => clearInterval(interval);
  }, [gameId]);

  if (loading) return <p style={S.center}>Loading box score...</p>;
  if (error)   return <p style={{ ...S.center, color: "#ef4444" }}>{error}</p>;

  return (
    <div style={S.container}>
      <TeamTable team={selectedSide === "away" ? data.away : data.home} isMobile={isMobile} />
    </div>
  );
}

function StatBar({ value, color }) {
  if (value === null || value === undefined) {
    return <span style={{ color: "var(--text-dim)" }}>—</span>;
  }
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <span>{value}</span>
      <div style={{ width: 26, height: 2, background: "var(--border-dim)", borderRadius: 1, overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(value, 100)}%`,
          height: "100%",
          background: color,
          borderRadius: 1,
          boxShadow: `0 0 5px ${color}`,
        }} />
      </div>
    </div>
  );
}

function TeamTable({ team, isMobile = false }) {
  const { team: tricode, players, totals } = team;

  return (
    <div style={S.section}>
      <div style={S.sectionHeader}>
        <div className="neon-bar-glow" style={S.accentBar} />
        <span style={S.sectionTeam}>{tricode}</span>
      </div>
      <div style={S.tableWrap}>
        <table style={{
          ...S.table,
          tableLayout: isMobile ? "auto" : "fixed",
          minWidth: isMobile ? 560 : undefined,
        }}>
          {!isMobile && (
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "5%" }} />
          </colgroup>
          )}
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} style={c.left ? S.thLeft : S.th}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              if (p.dnp) {
                return (
                  <tr key={i} className="stat-row" style={{ ...(i % 2 === 0 ? S.rowEven : S.rowOdd), opacity: 0.35 }}>
                    <td style={S.tdName}>{p.name}</td>
                    <td style={S.tdPos}>{p.position}</td>
                    <td colSpan={COLS.length - 2} style={{ ...S.tdNum, letterSpacing: 2, fontSize: 10, color: "var(--text-dim)" }}>
                      DNP
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={i} className="stat-row" style={i % 2 === 0 ? S.rowEven : S.rowOdd}>
                  <td style={S.tdName}>{p.name}</td>
                  <td style={S.tdPos}>{p.position}</td>
                  <td style={S.tdNum}>{p.minutes || "—"}</td>
                  <td style={{
                    ...S.tdNum,
                    color: p.points >= 20 ? "var(--hot-stat)" : "var(--text-mono)",
                    fontWeight: p.points >= 20 ? 600 : 400,
                  }}>
                    {p.points}
                  </td>
                  <td style={S.tdNum}>{p.rebounds}</td>
                  <td style={S.tdNum}>{p.assists}</td>
                  <td style={S.tdNum}>{p.steals}</td>
                  <td style={S.tdNum}>{p.blocks}</td>
                  <td style={S.tdNum}>{p.turnovers}</td>
                  <td style={S.tdNum}>{p.fouls}</td>
                  <td style={S.tdNum}><StatBar value={p.fg_pct}    color="var(--accent)"    /></td>
                  <td style={S.tdNum}><StatBar value={p.three_pct} color="var(--yellow)"   /></td>
                  <td style={S.tdNum}><StatBar value={p.ft_pct}    color="var(--text-mono)" /></td>
                  <td style={S.tdNum}>
                    <span style={{
                      ...S.pmPill,
                      background: p.plus_minus > 0 ? "var(--pm-pos-bg)" : p.plus_minus < 0 ? "var(--pm-neg-bg)" : "transparent",
                      color: p.plus_minus > 0 ? "var(--pm-pos-text)" : p.plus_minus < 0 ? "var(--pm-neg-text)" : "var(--text-dim)",
                    }}>
                      {p.plus_minus > 0 ? `+${p.plus_minus}` : p.plus_minus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {totals && (
            <tfoot>
              <tr>
                <td style={{ ...S.tdName, ...S.totalsCell, ...S.stickyBottom, fontWeight: 700, letterSpacing: 2, fontSize: 11 }}>TOTALS</td>
                <td style={{ ...S.tdPos,  ...S.totalsCell, ...S.stickyBottom }}>—</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}>—</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom, color: "var(--text-primary)", fontWeight: 700 }}>{totals.points}</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}>{totals.rebounds}</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}>{totals.assists}</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}>{totals.steals}</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}>{totals.blocks}</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}>{totals.turnovers}</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}>{totals.fouls}</td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}><StatBar value={totals.fg_pct}    color="var(--accent)"    /></td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}><StatBar value={totals.three_pct} color="var(--yellow)"   /></td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}><StatBar value={totals.ft_pct}    color="var(--text-mono)" /></td>
                <td style={{ ...S.tdNum,  ...S.totalsCell, ...S.stickyBottom }}>—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

const COLS = [
  { key: "name",       label: "Player", left: true },
  { key: "position",   label: "Pos"  },
  { key: "minutes",    label: "MIN"  },
  { key: "points",     label: "PTS"  },
  { key: "rebounds",   label: "REB"  },
  { key: "assists",    label: "AST"  },
  { key: "steals",     label: "STL"  },
  { key: "blocks",     label: "BLK"  },
  { key: "turnovers",  label: "TO"   },
  { key: "fouls",      label: "PF"   },
  { key: "fg_pct",     label: "FG%"  },
  { key: "three_pct",  label: "3P%"  },
  { key: "ft_pct",     label: "FT%"  },
  { key: "plus_minus", label: "+/-"  },
];

const S = {
  container: {},
  center: { textAlign: "center", color: "var(--text-dim)", marginTop: 32 },
  section: { marginBottom: 0 },
  sectionHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  accentBar: { width: 3, height: 22, background: "var(--accent)", borderRadius: 2, flexShrink: 0 },
  sectionTeam: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 20, letterSpacing: 3, color: "var(--text-primary)",
  },
  tableWrap: { borderRadius: 8, border: "1px solid var(--border-color)" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th: {
    background: "var(--bg-card)", color: "var(--yellow)",
    padding: "7px 4px", textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1,
    borderBottom: "1px solid var(--border-color)",
    position: "sticky", top: 0, zIndex: 2,
  },
  thLeft: {
    background: "var(--bg-card)", color: "var(--yellow)",
    padding: "7px 10px", textAlign: "left",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1,
    borderBottom: "1px solid var(--border-color)",
    position: "sticky", top: 0, zIndex: 2,
  },
  rowEven: { background: "var(--bg-card-alt)" },
  rowOdd:  { background: "var(--bg-card)" },
  totalsCell: {
    color: "var(--text-secondary)", fontWeight: 500,
    borderTop: "1px solid var(--border-color)", borderBottom: "none",
  },
  stickyBottom: {
    position: "sticky", bottom: 0, zIndex: 1,
    background: "var(--bg-header)",
  },
  tdName: {
    padding: "8px 10px", textAlign: "left",
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 500,
    color: "var(--text-primary)", borderBottom: "1px solid var(--border-dim)",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  tdPos: {
    padding: "8px 4px", textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    color: "var(--text-secondary)", borderBottom: "1px solid var(--border-dim)",
  },
  tdNum: {
    padding: "8px 4px", textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
    color: "var(--text-mono)", borderBottom: "1px solid var(--border-dim)",
  },
  pmPill: {
    display: "inline-block", padding: "2px 7px", borderRadius: 4,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
  },
};
