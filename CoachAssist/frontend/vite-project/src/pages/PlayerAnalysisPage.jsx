import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/player_analysis.css";
import { POSITION_GROUPS, UNIVERSAL_STATS } from "../constants/gameConstants";

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
  if (["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"].includes(pos)) return "offense";
  if (["DE", "DT", "NT", "OLB", "MLB", "ILB", "CB", "FS", "SS"].includes(pos)) return "defense";
  if (["K", "P"].includes(pos)) return "special";
  return "other";
};

const formatAnalysisText = (text) => {
  if (!text) return [];

  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#+/g, "")
    .trim();

  return cleaned.split("\n").map((line) => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    const isHeader =
      lower.includes("summary") ||
      lower.includes("strength") ||
      lower.includes("weakness") ||
      lower.includes("improvement") ||
      lower.includes("offensive") ||
      lower.includes("defensive") ||
      lower.includes("special teams") ||
      lower.includes("turning point") ||
      lower.includes("takeaway") ||
      lower.includes("recommendation");

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

  const [mode, setMode] = useState("analyze");

  // ================= PLAYER ANALYSIS =================
  const [unit, setUnit] = useState("offense");
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // ================= SAVED PLAYER ANALYSIS =================
  const [savedList, setSavedList] = useState([]);
  const [selectedSaved, setSelectedSaved] = useState(null);
  const [filterUnit, setFilterUnit] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ================= GAME ANALYSIS =================
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [gameDataLoading, setGameDataLoading] = useState(false);
  const [gameDataError, setGameDataError] = useState("");
  const [selectedMatchMeta, setSelectedMatchMeta] = useState(null);
  const [selectedGameState, setSelectedGameState] = useState(null);
  const [selectedGameUnits, setSelectedGameUnits] = useState({ offense: [], defense: [], special: [] });
  const [gameAiResult, setGameAiResult] = useState(null);
  const [gameLoadingAI, setGameLoadingAI] = useState(false);
  const [gameSaveMessage, setGameSaveMessage] = useState("");

  // ================= SAVED GAME ANALYSIS =================
  const [savedGameList, setSavedGameList] = useState([]);
  const [selectedSavedGame, setSelectedSavedGame] = useState(null);
  const [notesModalUnit, setNotesModalUnit] = useState(null);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // ================= FETCH PLAYERS =================
  useEffect(() => {
    fetch(`/teams/${teamId}/players?unit=${unit}`, {
      headers: authHeaders,
    })
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...(data || [])].sort((a, b) => {
          if ((b.is_priority ? 1 : 0) !== (a.is_priority ? 1 : 0)) {
            return (b.is_priority ? 1 : 0) - (a.is_priority ? 1 : 0);
          }
          return a.id - b.id;
        });

        setPlayers(sorted);
      });
  }, [teamId, unit]);

  useEffect(() => {
    if (mode === "saved-player") {
      fetch(`http://127.0.0.1:8000/ai/saved-player-analysis/${teamId}`)
        .then((res) => res.json())
        .then((data) => {
          setSavedList(data || []);
          setSelectedSaved(null);
        });
    }
  }, [mode, teamId]);

  useEffect(() => {
    if (mode === "game") {
      setMatchesLoading(true);
      fetch(`/teams/${teamId}/matches`, {
        headers: authHeaders,
      })
        .then((res) => res.json())
        .then((data) => setMatches(data.matches || []))
        .finally(() => setMatchesLoading(false));
    }
  }, [mode, teamId]);

  useEffect(() => {
    if (mode === "saved-game") {
      fetch(`http://127.0.0.1:8000/ai/saved-game-analysis/${teamId}`, {
        headers: authHeaders,
      })
        .then((res) => res.json())
        .then((data) => {
          setSavedGameList(data || []);
          setSelectedSavedGame(null);
        });
    }
  }, [mode, teamId]);

  // ================= PLAYER ANALYSIS HELPERS =================
  const analyzePlayer = async (player) => {
    setSelectedPlayer(player);

    const res = await fetch(`/players/${player.id}/history`, {
      headers: authHeaders,
    });

    const data = await res.json();
    setHistoryData(data);
    setSelectedGameIds((data.games || []).map((g) => g.id));
  };

  const filteredGames =
    historyData?.games.filter((g) => selectedGameIds.includes(g.id)) || [];

  const getStatsForGame = (gameId) => {
    return historyData?.stats_by_game.find((s) => s.game_id === gameId) || {};
  };

  const getNotesForGame = (gameId) => {
    return historyData?.notes.filter((n) => n.game_id === gameId) || [];
  };

  const getStatColumns = () => {
    if (!selectedPlayer) return [];

    const positionGroups = POSITION_GROUPS[selectedPlayer.position] || {};

    const orderedGroups = [
      "Passing",
      "Rushing",
      "Receiving",
      "Blocking",
      "Snapping",
      "Defense",
      "Coverage",
      "Kicking",
      "Punting",
      "Returns"
    ];

    const roleStats = orderedGroups.flatMap((group) => positionGroups[group] || []);

    return [...UNIVERSAL_STATS, ...roleStats];
  };

  const runAIAnalysis = async () => {
    const payload = {
      player: {
        id: selectedPlayer.id,
        name: selectedPlayer.player_name,
        position: selectedPlayer.position,
      },
      games: filteredGames.map((game) => ({
        game_id: game.id,
        opponent: game.opponent,
        date: game.game_date,
        stats: Object.fromEntries(
          getStatColumns().map((stat) => [stat, getStatsForGame(game.id)[stat] ?? 0])
        ),
        insights: getNotesForGame(game.id).map((n) => ({
          note: n.note,
          time: n.time,
          opponent: n.opponent,
          date: n.game_date,
        })),
      })),
    };

    try {
      setLoadingAI(true);
      setAiResult(null);

      const res = await fetch("http://127.0.0.1:8000/ai/analyze-player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ payload }),
      });

      const data = await res.json();
      setAiResult(data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  const saveAnalysis = async () => {
    try {
      await fetch("http://127.0.0.1:8000/ai/save-player-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          team_id: Number(teamId),
          player: {
            id: selectedPlayer.id,
            name: selectedPlayer.player_name,
            position: selectedPlayer.position,
            jersey_number: selectedPlayer.jersey_number,
          },
          analysis: aiResult,
        }),
      });

      setSaveMessage("Saved!");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setSaveMessage("Error saving");
    }
  };

  const deleteAnalysis = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/ai/delete-player-analysis/${id}`, {
        method: "DELETE",
      });

      setSavedList((prev) => prev.filter((item) => item.id !== id));

      if (selectedSaved?.id === id) {
        setSelectedSaved(null);
      }
    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  // ================= GAME ANALYSIS HELPERS =================
  const aggregateUnitStats = (unitData) => {
    return unitData.reduce(
      (acc, entry) => {
        const stats = entry.stats || {};
        acc.penalties += Number(stats.penalties || 0);
        acc.turnovers += Number(stats.turnovers || 0);
        acc.touchdowns += Number(stats.touchdowns || 0);
        acc.notes += (entry.notes || []).length;
        return acc;
      },
      { penalties: 0, turnovers: 0, touchdowns: 0, notes: 0 }
    );
  };

  const getUnitNotesList = (unitName) => {
    const unitRows = selectedGameUnits[unitName] || [];
    return unitRows.flatMap((entry) => {
      const playerName = entry?.player?.name || "Unknown Player";
      const jersey = entry?.player?.jersey_number ?? "—";
      const notes = entry?.notes || [];

      return notes.map((noteRow) => ({
        playerName,
        jersey,
        note: noteRow?.note || "",
      }));
    });
  };

  const loadGameData = async (match) => {
    setSelectedMatch(match);
    setGameAiResult(null);
    setGameSaveMessage("");
    setGameDataError("");
    setGameDataLoading(true);

    try {
      const [matchRes, gameStateRes] = await Promise.all([
        fetch(`/teams/matches/${match.id}`, { headers: authHeaders }),
        fetch(`/games/${match.id}/state`, { headers: authHeaders }),
      ]);

      if (!matchRes.ok || !gameStateRes.ok) {
        throw new Error("Failed to fetch game details.");
      }

      const matchJson = await matchRes.json();
      const gameStateJson = await gameStateRes.json();

      const unitsPayload = { offense: [], defense: [], special: [] };

      for (const unitName of ["offense", "defense", "special"]) {
        const playersRes = await fetch(`/teams/${teamId}/players?unit=${unitName}`, {
          headers: authHeaders,
        });

        const unitPlayers = playersRes.ok ? await playersRes.json() : [];

        const playerRows = await Promise.all(
          (unitPlayers || []).map(async (p) => {
            const insightRes = await fetch(`/games/${match.id}/players/${p.id}`, {
              headers: authHeaders,
            });

            let insightData = { stats: {}, notes: [] };
            if (insightRes.ok) {
              insightData = await insightRes.json();
            }

            return {
              player: {
                id: p.id,
                name: p.player_name,
                position: p.position,
                jersey_number: p.jersey_number,
              },
              stats: insightData.stats || {},
              notes: insightData.notes || [],
            };
          })
        );

        unitsPayload[unitName] = playerRows;
      }

      setSelectedMatchMeta(matchJson.match || match);
      setSelectedGameState(gameStateJson || {});
      setSelectedGameUnits(unitsPayload);
    } catch (err) {
      console.error("LOAD GAME DATA ERROR:", err);
      setGameDataError("Failed to load game analysis data.");
    } finally {
      setGameDataLoading(false);
    }
  };

  const buildGamePayload = () => {
    const game = selectedMatchMeta || selectedMatch;

    return {
      game: {
        id: game?.id,
        name: game?.name,
        opponent: game?.opponent,
        date: game?.game_date,
        team_score: game?.team_score,
        opponent_score: game?.opponent_score,
        description: game?.description,
      },
      game_state: {
        "Game State": selectedGameState?.["Game State"] || [],
      },
      units: selectedGameUnits,
      summary_metrics: {
        offense: aggregateUnitStats(selectedGameUnits.offense || []),
        defense: aggregateUnitStats(selectedGameUnits.defense || []),
        special: aggregateUnitStats(selectedGameUnits.special || []),
      },
    };
  };

  const runGameAIAnalysis = async () => {
    if (!selectedMatch) return;

    try {
      setGameLoadingAI(true);
      setGameAiResult(null);

      const payload = buildGamePayload();

      const res = await fetch("http://127.0.0.1:8000/ai/analyze-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          team_id: Number(teamId),
          game_id: selectedMatch.id,
          payload,
        }),
      });

      const data = await res.json();
      setGameAiResult(data.analysis);
    } catch (err) {
      console.error("GAME AI ERROR:", err);
    } finally {
      setGameLoadingAI(false);
    }
  };

  const saveGameAnalysis = async () => {
    if (!selectedMatch || !gameAiResult) return;

    try {
      await fetch("http://127.0.0.1:8000/ai/save-game-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          team_id: Number(teamId),
          game_id: selectedMatch.id,
          game: {
            name: selectedMatchMeta?.name,
            opponent: selectedMatchMeta?.opponent,
            date: selectedMatchMeta?.game_date,
          },
          analysis: gameAiResult,
        }),
      });

      setGameSaveMessage("Saved!");
      setTimeout(() => setGameSaveMessage(""), 2000);
    } catch (err) {
      console.error("SAVE GAME ANALYSIS ERROR:", err);
      setGameSaveMessage("Error saving");
    }
  };

  const deleteSavedGameAnalysis = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/ai/delete-game-analysis/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      setSavedGameList((prev) => prev.filter((item) => item.id !== id));
      if (selectedSavedGame?.id === id) {
        setSelectedSavedGame(null);
      }
    } catch (err) {
      console.error("DELETE SAVED GAME ERROR:", err);
    }
  };

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(b.game_date) - new Date(a.game_date)
  );

  return (
    <div className="player-analysis-page">
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
          className={`top-btn ${mode === "saved-player" ? "active" : ""}`}
          onClick={() => setMode("saved-player")}
        >
          Saved Player Analysis
        </button>

        <button
          className={`top-btn ${mode === "saved-game" ? "active" : ""}`}
          onClick={() => setMode("saved-game")}
        >
          Saved Game Analysis
        </button>

        <button className="top-btn back" onClick={() => navigate(`/team/${teamId}`)}>
          Go Back
        </button>
      </div>

      {mode === "analyze" && (
        <>
          {!selectedPlayer && (
            <>
              <h2>Select Player</h2>

              <div className="unit-buttons">
                {["offense", "defense", "special"].map((u) => (
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
                    {players.map((p) => (
                      <tr key={p.id}>
                        <td>{p.jersey_number}</td>
                        <td>{p.player_name}</td>
                        <td>{POSITION_NAMES[p.position] || p.position}</td>
                        <td>
                          <button className="analyze-btn" onClick={() => analyzePlayer(p)}>
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

          {selectedPlayer && historyData && (
            <div className="analysis-wrapper">
              <h2>
                #{selectedPlayer.jersey_number} {selectedPlayer.player_name}
              </h2>

              <button className="top-btn back" onClick={() => setSelectedPlayer(null)}>
                ← Back
              </button>

              <div className="dropdown-container">
                <button className="dropdown-btn" onClick={() => setShowDropdown(!showDropdown)}>
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
                              : historyData.games.map((g) => g.id)
                          )
                        }
                      />
                      All Games
                    </label>

                    <div className="dropdown-divider" />

                    {historyData.games.map((game) => (
                      <label key={game.id} className="dropdown-item">
                        <input
                          type="checkbox"
                          checked={selectedGameIds.includes(game.id)}
                          onChange={() => {
                            setSelectedGameIds((prev) =>
                              prev.includes(game.id)
                                ? prev.filter((id) => id !== game.id)
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

              <div className="analysis-container">
                <div className="table-section">
                  <h3>Player Data By Game</h3>
                  <p className="table-desc">Game-by-game breakdown with recorded statistics.</p>

                  <div className="table-scroll-container">
                    <table className="player-table white-bg">
                      <thead className={`table-header-${unit}`}>
                        <tr>
                          <th>Date</th>
                          <th>Opponent</th>
                          {getStatColumns().map((stat) => (
                            <th key={stat}>
                              {stat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredGames.map((game) => {
                          const stats = getStatsForGame(game.id);
                          return (
                            <tr key={game.id}>
                              <td>{game.game_date}</td>
                              <td>{game.opponent}</td>
                              {getStatColumns().map((stat) => (
                                <td key={stat}>{stats[stat] ?? 0}</td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="table-section">
                  <h3>Player Insights</h3>
                  <p className="table-desc">Chronological observations from selected games.</p>

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
                        {filteredGames.map((game) =>
                          getNotesForGame(game.id).map((note, i) => (
                            <tr key={`${game.id}-${i}`}>
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

              <div className="ai-button-wrapper">
                <button className="ai-button" onClick={runAIAnalysis}>
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
                    whiteSpace: "pre-wrap",
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
                    <button className="save-analysis-btn" onClick={saveAnalysis} disabled={!aiResult}>
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

      {mode === "game" && (
        <div className="saved-container game-analysis-shell">
          <h2>Game Analysis</h2>

          {!selectedMatch && (
            <>
              <p className="table-desc">Select a game to build and run AI game analysis.</p>

              {matchesLoading ? (
                <p>Loading games...</p>
              ) : (
                <div className="table-scroll-container">
                  <table className="player-table white-bg">
                    <thead className="insights-header">
                      <tr>
                        <th>Date</th>
                        <th>Game</th>
                        <th>Opponent</th>
                        <th>Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMatches.map((m) => (
                        <tr key={m.id}>
                          <td>{m.game_date}</td>
                          <td>{m.name}</td>
                          <td>{m.opponent}</td>
                          <td>
                            {m.team_score != null && m.opponent_score != null
                              ? `${m.team_score} - ${m.opponent_score}`
                              : "—"}
                          </td>
                          <td>
                            <button className="analyze-btn" onClick={() => loadGameData(m)}>
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {selectedMatch && (
            <>
              <button
                className="top-btn back"
                onClick={() => {
                  setSelectedMatch(null);
                  setSelectedMatchMeta(null);
                  setSelectedGameState(null);
                  setSelectedGameUnits({ offense: [], defense: [], special: [] });
                  setGameAiResult(null);
                  setGameDataError("");
                }}
              >
                ← Back to Games
              </button>

              <div className="game-analysis-selected">
                <div className="game-analysis-header-card">
                  <h3 className="game-analysis-title">
                    {selectedMatchMeta?.name} vs {selectedMatchMeta?.opponent}
                  </h3>
                  <p className="table-desc game-analysis-meta">
                    Date: {selectedMatchMeta?.game_date || "—"} | Score: {selectedMatchMeta?.team_score ?? "—"} - {selectedMatchMeta?.opponent_score ?? "—"}
                  </p>
                  {selectedMatchMeta?.description && (
                    <p className="table-desc game-analysis-meta">Notes: {selectedMatchMeta.description}</p>
                  )}
                </div>

                {gameDataLoading && <p>Loading game data...</p>}
                {gameDataError && <p style={{ color: "#b10000" }}>{gameDataError}</p>}

                {!gameDataLoading && !gameDataError && selectedGameState && (
                  <>
                    <div className="game-analysis-grid">
                      <div className="game-analysis-card">
                        <h3>Game State Observations</h3>
                        <div className="table-scroll-container" style={{ marginTop: "8px" }}>
                          <table className="player-table white-bg">
                            <thead className="insights-header">
                              <tr>
                                <th>Observation</th>
                                <th>Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedGameState?.["Game State"] || []).length === 0 ? (
                                <tr>
                                  <td colSpan={2}>No entries.</td>
                                </tr>
                              ) : (
                                (selectedGameState?.["Game State"] || []).map((r) => (
                                  <tr key={r.id ?? `game-state-${r.text}-${r.time}`}>
                                    <td>{r.text}</td>
                                    <td>{r.time || "—"}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="game-analysis-card">
                        <h3>Unit Summary</h3>
                        <div className="table-scroll-container">
                          <table className="player-table white-bg">
                            <thead className="insights-header">
                              <tr>
                                <th>Unit</th>
                                <th>Players</th>
                                <th>Penalties</th>
                                <th>Turnovers</th>
                                <th>Touchdowns</th>
                                <th>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {["offense", "defense", "special"].map((u) => {
                                const totals = aggregateUnitStats(selectedGameUnits[u] || []);
                                return (
                                  <tr key={u}>
                                    <td>{u.toUpperCase()}</td>
                                    <td>{(selectedGameUnits[u] || []).length}</td>
                                    <td>{totals.penalties}</td>
                                    <td>{totals.turnovers}</td>
                                    <td>{totals.touchdowns}</td>
                                    <td>
                                      <div className="unit-notes-cell">
                                        <span>{totals.notes}</span>
                                        <button
                                          className="analyze-btn unit-notes-btn"
                                          onClick={() => setNotesModalUnit(u)}
                                        >
                                          View Notes
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="table-desc" style={{ marginTop: "10px" }}>
                          Offensive, defensive, and special teams insights are derived from player stats and notes for this selected game.
                        </p>
                      </div>
                    </div>

                    <div className="ai-button-wrapper game-analysis-action">
                      <button className="ai-button" onClick={runGameAIAnalysis}>
                        Analyze Game with AI
                      </button>
                    </div>

                    {gameLoadingAI && (
                      <p style={{ textAlign: "center", marginTop: "10px" }}>
                        Generating game analysis...
                      </p>
                    )}

                    {gameAiResult && (
                      <div className="game-analysis-result-card">
                        <h3>Game AI Analysis</h3>
                        <div className="ai-analysis-text">
                          {formatAnalysisText(gameAiResult).map((line, i) => (
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
                            onClick={saveGameAnalysis}
                            disabled={!gameAiResult}
                          >
                            Save Game Analysis
                          </button>

                          {gameSaveMessage && (
                            <span style={{ color: "green", fontWeight: "bold" }}>
                              {gameSaveMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {notesModalUnit && (
        <div className="unit-notes-modal-overlay" onClick={() => setNotesModalUnit(null)}>
          <div className="unit-notes-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="unit-notes-modal-title">
              {notesModalUnit.toUpperCase()} Unit Notes
            </h3>

            <div className="unit-notes-modal-body">
              {getUnitNotesList(notesModalUnit).length === 0 ? (
                <p className="table-desc">No notes for this unit in the selected game.</p>
              ) : (
                getUnitNotesList(notesModalUnit).map((entry, idx) => (
                  <div key={`${notesModalUnit}-note-${idx}`} className="unit-note-entry">
                    <div className="unit-note-player">
                      #{entry.jersey} {entry.playerName}
                    </div>
                    <div className="unit-note-text">- {entry.note}</div>
                  </div>
                ))
              )}
            </div>

            <div className="unit-notes-modal-actions">
              <button className="top-btn back" onClick={() => setNotesModalUnit(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "saved-player" && (
        <div className="saved-container">
          <h2>Saved Player Analysis</h2>

          <div className="saved-player-layout">
            <div className="saved-list">
              <div style={{ marginBottom: "10px" }}>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  style={{
                    width: "100%",
                    marginBottom: "8px",
                    padding: "6px",
                    borderRadius: "6px",
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
                    border: "1px solid black",
                  }}
                />
              </div>

              {savedList
                .filter((item) => {
                  const listUnit = getUnit(item.position);

                  if (filterUnit !== "all" && listUnit !== filterUnit) {
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
                .map((item) => (
                  <div
                    key={item.id}
                    className={`saved-item ${selectedSaved?.id === item.id ? "active" : ""}`}
                    onClick={() => setSelectedSaved(item)}
                    style={{ position: "relative" }}
                  >
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
                        fontWeight: "bold",
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
            </div>
          </div>
        </div>
      )}

      {mode === "saved-game" && (
        <div className="saved-container">
          <h2>Saved Game Analysis</h2>

          <div className="saved-player-layout">
            <div className="saved-list">
              {savedGameList.map((item) => (
                <div
                  key={item.id}
                  className={`saved-item ${selectedSavedGame?.id === item.id ? "active" : ""}`}
                  onClick={() => setSelectedSavedGame(item)}
                  style={{ position: "relative" }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedGameAnalysis(item.id);
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
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </button>
                  {item.game_name || "Unnamed Game"}
                  <br />
                  <small>vs {item.opponent || "Unknown Opponent"}</small>
                  <br />
                  <small>{item.game_date || "—"}</small>
                  <br />
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                </div>
              ))}
            </div>

            <div className="saved-detail">
              {selectedSavedGame ? (
                <>
                  <h3>
                    {selectedSavedGame.game_name || "Unnamed Game"} vs {selectedSavedGame.opponent || "Unknown Opponent"}
                  </h3>
                  <p className="table-desc">Date: {selectedSavedGame.game_date || "—"}</p>
                  <div className="ai-analysis-text">
                    {formatAnalysisText(selectedSavedGame.analysis_text).map((line, i) => (
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
                <p>Select a saved game analysis to view</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
