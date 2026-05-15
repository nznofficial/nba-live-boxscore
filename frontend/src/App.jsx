import { useState, useEffect } from "react";
import BoxScore from "./BoxScore";

const API = "http://localhost:8000";

export default function App() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGames = async () => {
    try {
      const res = await fetch(`${API}/games`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGames(await res.json());
      setError(null);
    } catch (e) {
      setError("Could not load games. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p style={styles.center}>Loading today's games...</p>;
  if (error) return <p style={{ ...styles.center, color: "crimson" }}>{error}</p>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>NBA Live Box Score</h1>

      {games.length === 0 ? (
        <p style={styles.center}>No games scheduled today.</p>
      ) : (
        <div style={styles.gameList}>
          {games.map((g) => (
            <div
              key={g.game_id}
              style={{
                ...styles.gameCard,
                ...(selectedGame?.game_id === g.game_id ? styles.gameCardActive : {}),
              }}
              onClick={() => setSelectedGame(g)}
            >
              <span style={styles.team}>{g.away_team}</span>
              <span style={styles.score}>
                {g.away_score} – {g.home_score}
              </span>
              <span style={styles.team}>{g.home_team}</span>
              <span style={styles.status}>{g.status}</span>
            </div>
          ))}
        </div>
      )}

      {selectedGame && (
        <BoxScore gameId={selectedGame.game_id} />
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" },
  title: { textAlign: "center", marginBottom: 24 },
  center: { textAlign: "center", marginTop: 40 },
  gameList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 },
  gameCard: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 20px", border: "1px solid #ddd", borderRadius: 8,
    cursor: "pointer", background: "#fafafa",
  },
  gameCardActive: { borderColor: "#2563eb", background: "#eff6ff" },
  team: { fontWeight: 600, fontSize: 18, width: 60, textAlign: "center" },
  score: { fontSize: 20, fontWeight: 700 },
  status: { fontSize: 13, color: "#666", width: 80, textAlign: "right" },
};
