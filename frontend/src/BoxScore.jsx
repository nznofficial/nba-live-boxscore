import { useState, useEffect } from "react";

const API = "http://localhost:8000";
const REFRESH_MS = 30000;

export default function BoxScore({ gameId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBoxScore = async () => {
    try {
      const res = await fetch(`${API}/boxscore/${gameId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError("Could not load box score.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBoxScore();
    const interval = setInterval(fetchBoxScore, REFRESH_MS);
    return () => clearInterval(interval);
  }, [gameId]);

  if (loading) return <p style={styles.center}>Loading box score...</p>;
  if (error) return <p style={{ ...styles.center, color: "crimson" }}>{error}</p>;

  return (
    <div>
      <h2 style={styles.header}>
        {data.away.team} {data.away.score} – {data.home.score} {data.home.team}
        <span style={styles.status}> {data.status}</span>
      </h2>

      <TeamTable label={`${data.away.team} (Away)`} players={data.away.players} />
      <TeamTable label={`${data.home.team} (Home)`} players={data.home.players} />
    </div>
  );
}

function TeamTable({ label, players }) {
  return (
    <div style={styles.tableWrapper}>
      <h3 style={styles.teamLabel}>{label}</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            {["Player", "Pos", "PTS", "REB", "AST", "STL", "BLK", "FG%", "3P%", "+/-"].map(
              (h) => <th key={h} style={styles.th}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
              <td style={styles.tdName}>{p.name}</td>
              <td style={styles.td}>{p.position}</td>
              <td style={styles.tdNum}>{p.points}</td>
              <td style={styles.tdNum}>{p.rebounds}</td>
              <td style={styles.tdNum}>{p.assists}</td>
              <td style={styles.tdNum}>{p.steals}</td>
              <td style={styles.tdNum}>{p.blocks}</td>
              <td style={styles.tdNum}>{p.fg_pct}</td>
              <td style={styles.tdNum}>{p.three_pct}</td>
              <td style={styles.tdNum}>{p.plus_minus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  center: { textAlign: "center", marginTop: 20 },
  header: { textAlign: "center", margin: "16px 0 24px" },
  status: { fontSize: 14, fontWeight: 400, color: "#666" },
  tableWrapper: { marginBottom: 32, overflowX: "auto" },
  teamLabel: { marginBottom: 8, color: "#2563eb" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { background: "#1e3a5f", color: "#fff", padding: "8px 10px", textAlign: "center" },
  td: { padding: "6px 10px", textAlign: "center" },
  tdName: { padding: "6px 10px", textAlign: "left", fontWeight: 500 },
  tdNum: { padding: "6px 10px", textAlign: "center" },
  rowEven: { background: "#f9fafb" },
  rowOdd: { background: "#fff" },
};
