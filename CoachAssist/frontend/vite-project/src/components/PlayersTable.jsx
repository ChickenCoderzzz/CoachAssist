import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const POSITION_OPTIONS = {
  offense: ["QB", "RB", "WR", "TE", "OL"],
  defense: ["DL", "LB", "CB", "S"],
  special_teams: ["K", "P", "LS", "KR", "PR"],
};

export default function PlayersTable() {
  const { token } = useAuth();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [playerName, setPlayerName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [unit, setUnit] = useState("");
  const [position, setPosition] = useState("");
  const [notes, setNotes] = useState("");

  async function loadPlayers() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/players", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to load players");
      setPlayers(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // When unit changes, clear position so we don't send invalid combos
  useEffect(() => {
    setPosition("");
  }, [unit]);

  async function createPlayer(e) {
    e.preventDefault();
    if (saving) return;

    setErr("");
    setSaving(true);

    try {
      const res = await fetch("/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          player_name: playerName,
          jersey_number: jerseyNumber === "" ? null : Number(jerseyNumber),
          unit: unit || null,
          position: position || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to create player");

      setPlayerName("");
      setJerseyNumber("");
      setUnit("");
      setPosition("");
      setNotes("");

      await loadPlayers();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const positionsForUnit = unit ? POSITION_OPTIONS[unit] : [];

  return (
    <div style={{ marginTop: 30 }}>
      <h2 style={{ marginBottom: 10 }}>Players</h2>

      <div
        style={{
          border: "3px solid #000",
          borderRadius: 16,
          padding: 18,
          background: "white",
        }}
      >
        {/* Create form */}
        <form
          onSubmit={createPlayer}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr auto",
            gap: 10,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <input
            placeholder="Player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            required
          />

          <input
            placeholder="Jersey #"
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            inputMode="numeric"
          />

          {/* Unit dropdown */}
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Unit</option>
            <option value="offense">Offense</option>
            <option value="defense">Defense</option>
            <option value="special_teams">Special Teams</option>
          </select>

          {/* Position dropdown */}
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={!unit}
          >
            <option value="">{unit ? "Position" : "Pick unit first"}</option>
            {positionsForUnit.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>

          <input
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button type="submit" disabled={saving}>
            {saving ? "Adding..." : "Add"}
          </button>
        </form>

        {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}

        {/* Table */}
        {loading ? (
          <div>Loading…</div>
        ) : players.length === 0 ? (
          <div style={{ fontStyle: "italic" }}>
            No players yet. Create one to get started.
          </div>
        ) : (
          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #000" }}>
                <th>Name</th>
                <th>Jersey</th>
                <th>Unit</th>
                <th>Position</th>
                <th>TD</th>
                <th>Yards</th>
                <th>Tackles</th>
                <th>INT</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td>{p.player_name}</td>
                  <td>{p.jersey_number ?? ""}</td>
                  <td>{p.unit ?? ""}</td>
                  <td>{p.position ?? ""}</td>
                  <td>{p.touchdowns ?? 0}</td>
                  <td>{p.yards ?? 0}</td>
                  <td>{p.tackles ?? 0}</td>
                  <td>{p.interceptions ?? 0}</td>
                  <td>{p.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
