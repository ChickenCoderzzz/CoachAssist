import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/player_analysis.css";
import { POSITION_GROUPS } from "../constants/gameConstants";

const POSITION_NAMES = {
  QB: "Quarterback",
  RB: "Running Back",
  FB: "Fullback",
  WR: "Wide Receiver",
  TE: "Tight End",
  LT: "Left Tackle",
  LG: "Left Guard",
  C: "Center",
  RG: "Right Guard",
  RT: "Right Tackle",
  DE: "Defensive End",
  DT: "Defensive Tackle",
  NT: "Nose Tackle",
  OLB: "Outside Linebacker",
  MLB: "Middle Linebacker",
  ILB: "Inside Linebacker",
  CB: "Cornerback",
  FS: "Free Safety",
  SS: "Strong Safety",
  K: "Kicker",
  P: "Punter"
};

const getUnit = (pos) => {
  if (["QB","RB","FB","WR","TE","LT","LG","C","RG","RT"].includes(pos)) return "offense";
  if (["DE","DT","NT","OLB","MLB","ILB","CB","FS","SS"].includes(pos)) return "defense";
  if (["K","P"].includes(pos)) return "special";
  return "other";
};

const formatAnalysisText = (text) => {
  if (!text) return [];

  const cleaned = text
    .replace(/\*\*/g, "")   // remove **
    .replace(/\*/g, "")     // remove *
    .replace(/#+/g, "")     // remove ###
    .trim();

  return cleaned.split("\n").map((line) => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    const isHeader =
      lower.includes("summary") ||
      lower.includes("strength") ||
      lower.includes("weakness") ||
      lower.includes("improvement");

    const isNumbered = /^\d+\./.test(trimmed);

    return {
      text: trimmed,
      isHeader,
      isNumbered
    };
  });
};

export default function PlayerAnalysisPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [unit, setUnit] = useState("offense");
  const [players, setPlayers] = useState([]);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [aiResult, setAiResult] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // ================= SAVED ANALYSIS =================
  const [mode, setMode] = useState("analyze");
  const [savedList, setSavedList] = useState([]);
  const [selectedSaved, setSelectedSaved] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");

  const [filterUnit, setFilterUnit] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ================= FETCH PLAYERS =================
  useEffect(() => {
    fetch(`/teams/${teamId}/players?unit=${unit}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setPlayers(data));
  }, [teamId, unit]);

  useEffect(() => {
    if (mode === "saved-player") {
      fetch(`http://127.0.0.1:8000/ai/saved-player-analysis/${teamId}`)
        .then(res => res.json())
        .then(data => setSavedList(data));
    }
  }, [mode]);

  // ================= LOAD PLAYER =================
  const analyzePlayer = async (player) => {
    setSelectedPlayer(player);

    const res = await fetch(`/players/${player.id}/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    setHistoryData(data);
    setSelectedGameIds(data.games.map(g => g.id));
  };

  // ================= HELPERS =================
  const filteredGames =
    historyData?.games.filter(g =>
      selectedGameIds.includes(g.id)
    ) || [];

  const getStatsForGame = (gameId) => {
    return historyData?.stats_by_game.find(
      s => s.game_id === gameId
    ) || {};
  };

  const getNotesForGame = (gameId) => {
    return historyData?.notes.filter(
      n => n.game_id === gameId
    ) || [];
  };

  // ================= STAT COLUMNS =================
  const getStatColumns = () => {
    if (!selectedPlayer) return [];

    const roleStats =
      POSITION_GROUPS[selectedPlayer.position]
        ? Object.values(POSITION_GROUPS[selectedPlayer.position]).flat()
        : [];

    const universalStats = ["snaps", "penalties", "turnovers"];

    return [...universalStats, ...roleStats];
  };

  // ================= PAYLOAD =================
  const runAIAnalysis = async () => {
    const payload = {
      player: {
        id: selectedPlayer.id,
        name: selectedPlayer.player_name,
        position: selectedPlayer.position
      },
      games: filteredGames.map(game => ({
        game_id: game.id,
        opponent: game.opponent,
        date: game.game_date,
        stats: Object.fromEntries(
          getStatColumns().map(stat => [
            stat,
            getStatsForGame(game.id)[stat] ?? 0
          ])
        ),
        insights: getNotesForGame(game.id).map(n => ({
          note: n.note,
          time: n.time,
          opponent: n.opponent,
          date: n.game_date
        }))
      }))
    };

    try {
      setLoadingAI(true);     // ✅ start loading
      setAiResult(null);      // ✅ clear previous result

      const res = await fetch("http://127.0.0.1:8000/ai/analyze-player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payload })
      });

      const data = await res.json();

      console.log("AI RESULT:", data);

      setAiResult(data.analysis);   // ⭐ THIS is what shows it on screen

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);  // ✅ stop loading
    }
  };

  const saveAnalysis = async () => {
    try {
      await fetch("http://127.0.0.1:8000/ai/save-player-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          team_id: teamId,
          player: {
            id: selectedPlayer.id,
            name: selectedPlayer.player_name,
            position: selectedPlayer.position,
            jersey_number: selectedPlayer.jersey_number
          },
          analysis: aiResult
        })
      });

      setSaveMessage("Saved!");

      // optional: auto-clear after 2 seconds
      setTimeout(() => setSaveMessage(""), 2000);

    } catch (err) {
      console.error(err);
      setSaveMessage("Error saving");
    }
  };

  const deleteAnalysis = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/ai/delete-player-analysis/${id}`, {
        method: "DELETE"
      });

      // remove from UI immediately
      setSavedList(prev => prev.filter(item => item.id !== id));

      // if the deleted one is selected → clear right panel
      if (selectedSaved?.id === id) {
        setSelectedSaved(null);
      }

    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  return (
    <div className="player-analysis-page">

      {/* TOP BUTTONS */}
      <div className="top-buttons">
        <button
          className={`top-btn ${mode === "analyze" ? "active" : ""}`}
          onClick={() => setMode("analyze")}
        >
          Player Analysis
        </button>

        <button
          className={`top-btn ${mode === "game" ? "active" : ""}`}
          onClick={() => setMode("game")}
        >
          Game Analysis
        </button>

        <button
          className={`top-btn ${mode.includes("saved") ? "active" : ""}`}
          onClick={() => setMode("saved-player")}
        >
          Saved Analysis
        </button>

        <button
          className="top-btn back"
          onClick={() => navigate(`/team/${teamId}`)}
        >
          Go Back
        </button>
      </div>

      {mode === "analyze" && (
        <>

      {/* ================= PLAYER SELECT ================= */}
      {!selectedPlayer && (
        <>
          <h2>Select Player</h2>

          <div className="unit-buttons">
            {["offense", "defense", "special"].map(u => (
              <button
                key={u}
                className={`unit-btn ${u} ${unit === u ? "active" : ""}`}
                onClick={() => setUnit(u)}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="table-container">
            <table className="player-table white-bg">
              <thead className={`table-header-${unit}`}>
                <tr>
                  <th>No.</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>{p.jersey_number}</td>
                    <td>{p.player_name}</td>
                    <td>{POSITION_NAMES[p.position] || p.position}</td>
                    <td>
                      <button
                        className="analyze-btn"
                        onClick={() => analyzePlayer(p)}
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ================= ANALYSIS VIEW ================= */}
      {selectedPlayer && historyData && (
        <div className="analysis-wrapper">

          <h2>
            #{selectedPlayer.jersey_number} {selectedPlayer.player_name}
          </h2>

          <button
            className="top-btn back"
            onClick={() => setSelectedPlayer(null)}
          >
            ← Back
          </button>

          {/* DROPDOWN */}
          <div className="dropdown-container">
            <button
              className="dropdown-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              Select Games ▼
            </button>

            {showDropdown && (
            <div className="dropdown-menu">

                <label className="dropdown-item">
                <input
                    type="checkbox"
                    checked={selectedGameIds.length === historyData.games.length}
                    onChange={() =>
                    setSelectedGameIds(
                        selectedGameIds.length === historyData.games.length
                        ? []
                        : historyData.games.map(g => g.id)
                    )
                    }
                />
                All Games
                </label>

                <div className="dropdown-divider" />

                {historyData.games.map(game => (
                <label key={game.id} className="dropdown-item">
                    <input
                    type="checkbox"
                    checked={selectedGameIds.includes(game.id)}
                    onChange={() => {
                        setSelectedGameIds(prev =>
                        prev.includes(game.id)
                            ? prev.filter(id => id !== game.id)
                            : [...prev, game.id]
                        );
                    }}
                    />
                    {game.opponent} ({game.game_date})
                </label>
                ))}

            </div>
            )}
          </div>

          {/* TABLES */}
          <div className="analysis-container">

            {/* PLAYER DATA */}
            <div className="table-section">
              <h3>Player Data By Game</h3>
              <p className="table-desc">
                Game-by-game breakdown with recorded statistics.
              </p>

              <div className="table-scroll-container">
                <table className="player-table white-bg">
                  <thead className={`table-header-${unit}`}>
                    <tr>
                      <th>Date</th>
                      <th>Opponent</th>
                      {getStatColumns().map(stat => (
                        <th key={stat}>
                          {stat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredGames.map(game => {
                      const stats = getStatsForGame(game.id);

                      return (
                        <tr key={game.id}>
                          <td>{game.game_date}</td>
                          <td>{game.opponent}</td>
                          {getStatColumns().map(stat => (
                            <td key={stat}>{stats[stat] ?? 0}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* INSIGHTS */}
            <div className="table-section">
              <h3>Player Insights</h3>
              <p className="table-desc">
                Chronological observations from selected games.
              </p>

              <div className="table-scroll-container">
                <table className="player-table white-bg">
                  <thead className="insights-header">
                    <tr>
                      <th>Date</th>
                      <th>Opponent</th>
                      <th>Note</th>
                      <th>Time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredGames.map(game =>
                      getNotesForGame(game.id).map((note, i) => (
                        <tr key={i}>
                          <td>{game.game_date}</td>
                          <td>{game.opponent}</td>
                          <td>{note.note}</td>
                          <td>{note.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* AI BUTTON */}
          <div className="ai-button-wrapper">
            <button
              className="ai-button"
              onClick={runAIAnalysis}
            >
              Analyze Player with AI
            </button>
          </div>
          {loadingAI && (
            <p style={{ textAlign: "center", marginTop: "10px" }}>
              Generating analysis...
            </p>
          )}

          {aiResult && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#f4f4f4",
                borderRadius: "8px",
                maxWidth: "900px",
                marginLeft: "auto",
                marginRight: "auto",
                whiteSpace: "pre-wrap"
              }}
            >
              <h3>AI Analysis</h3>
              <div className="ai-analysis-text">
                {formatAnalysisText(aiResult).map((line, i) => (
                  <p
                    key={i}
                    className={
                      line.isHeader
                        ? "ai-header"
                        : line.isNumbered
                        ? "ai-numbered"
                        : "ai-line"
                    }
                  >
                    {line.text}
                  </p>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  className="save-analysis-btn"
                  onClick={saveAnalysis}
                  disabled={!aiResult}
                >
                  Save Analysis
                </button>

                {saveMessage && (
                  <span style={{ color: "green", fontWeight: "bold" }}>
                    {saveMessage}
                  </span>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </>
  )}

  {mode === "saved-player" && (
    <div className="saved-container">

      <div className="saved-buttons">
        <button
          className={`saved-btn ${mode === "saved-player" ? "active" : ""}`}
          onClick={() => setMode("saved-player")}
        >
          Saved Player Analysis
        </button>

        <button
          className={`saved-btn ${mode === "game" ? "active" : ""}`}
          onClick={() => setMode("game")}
        >
          Saved Game Analysis
        </button>
      </div>

      <h2>Saved Player Analysis</h2>

      <div className="saved-player-layout">

        {/* LEFT PANEL */}
        <div className="saved-list">

          {/* FILTER + SEARCH */}
          <div style={{ marginBottom: "10px" }}>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: "8px",
                  padding: "6px",
                  borderRadius: "6px"
                }}
              >
                <option value="all">All Units</option>
                <option value="offense">Offense</option>
                <option value="defense">Defense</option>
                <option value="special">Special Teams</option>
              </select>

              <input
                type="text"
                placeholder="Search player..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "220px",
                  padding: "6px",
                  borderRadius: "6px",
                  border: "1px solid black"
                }}
              />
            </div>
          {savedList
            .filter(item => {
              const unit = getUnit(item.position);

              if (filterUnit !== "all" && unit !== filterUnit) {
                return false;
              }

              if (
                searchTerm &&
                !item.player_name.toLowerCase().includes(searchTerm.toLowerCase())
              ) {
                return false;
              }

              return true;
            })
            .map(item => (
              <div
                key={item.id}
                className={`saved-item ${selectedSaved?.id === item.id ? "active" : ""}`}
                onClick={() => setSelectedSaved(item)}
                style={{ position: "relative" }}
              >

                {/* DELETE BUTTON */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAnalysis(item.id);
                  }}
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    background: "#ff4d4d",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "22px",
                    height: "22px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}
                >
                  ×
                </button>
              #{item.jersey_number} {item.player_name}
              <br />
              {POSITION_NAMES[item.position] || item.position}
              <br />
              <small>{getUnit(item.position).toUpperCase()}</small>
              <br />
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>

        {/* RIGHT PANEL */}
        <div className="saved-detail">
          {selectedSaved ? (
            <>
              <h3>
                #{selectedSaved.jersey_number} {selectedSaved.player_name}
              </h3>
              <div className="ai-analysis-text">
                {formatAnalysisText(selectedSaved.analysis_text).map((line, i) => (
                  <p
                    key={i}
                    className={
                      line.isHeader
                        ? "ai-header"
                        : line.isNumbered
                        ? "ai-numbered"
                        : "ai-line"
                    }
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p>Select an analysis to view</p>
          )}

          {mode === "game" && (
            <div style={{ marginTop: "40px", textAlign: "center" }}>
              <h2>Game Analysis (Coming Soon)</h2>
            </div>
          )}

        </div>

      </div>
    </div>
  )}

  </div>
);
}