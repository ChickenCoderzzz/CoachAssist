// AnalyzeGamePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/analyze_game.css";
import "../styles/teams.css";

// ----------------------------
// Initial data structure (GAME STATE table only)
// ----------------------------
const INITIAL_DATA = {
  "Game State": [],
  Offensive: [],
  Defensive: [],
  Special: [],
};

// Map tabs -> player "unit" values stored in DB
const TAB_TO_UNIT = {
  Offensive: "offense",
  Defensive: "defense",
  Special: "special_teams",
};

// Roles per unit
const OFFENSE_POSITIONS = ["QB", "RB", "WR", "TE", "OL"];
const DEFENSE_POSITIONS = ["DL", "LB", "CB", "S"];
const SPECIAL_POSITIONS = ["K", "P", "LS", "KR", "PR"];

export default function AnalyzeGamePage() {
  const { teamId, matchId } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("Game State");
  const [allTableData, setAllTableData] = useState(INITIAL_DATA);

  // Match info
  const [match, setMatch] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  // Edit form
  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [teamScore, setTeamScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [description, setDescription] = useState("");

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // delete confirm modal state
  const [playerToDelete, setPlayerToDelete] = useState(null);

  // NEW: edit stats state (for player view modal)
  const [editTD, setEditTD] = useState(0);
  const [editYards, setEditYards] = useState(0);
  const [editTackles, setEditTackles] = useState(0);
  const [editINT, setEditINT] = useState(0);
  const [savingPlayerStats, setSavingPlayerStats] = useState(false);
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);


  // ----------------------------
  // Fetch Match + Game State
  // ----------------------------
  useEffect(() => {
    if (!matchId || !token) return;

    // Match details
    fetch(`/teams/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.match) {
          setMatch(data.match);
          setName(data.match.name);
          setOpponent(data.match.opponent);
          setGameDate(data.match.game_date?.split("T")?.[0] || "");
          setTeamScore(data.match.team_score ?? "");
          setOpponentScore(data.match.opponent_score ?? "");
          setDescription(data.match.description || "");
        }
      })
      .catch(() => {});

    // Game state table data
    fetch(`/games/${matchId}/state`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        // if backend returns 404 for new games, just ignore and keep INITIAL_DATA
        if (!res.ok) return null;
        return await res.json();
      })
      .then((data) => {
        if (data) setAllTableData(data);
      })
      .catch(() => {});
  }, [matchId, token]);

  const handleUpdateMatch = () => {
    fetch(`/teams/matches/${matchId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        opponent,
        game_date: gameDate,
        team_score: teamScore === "" ? null : Number(teamScore),
        opponent_score: opponentScore === "" ? null : Number(opponentScore),
        description,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.match) {
          setMatch(data.match);
          setShowEdit(false);
        }
      })
      .catch(() => {});
  };

  // ----------------------------
  // Game State helpers
  // ----------------------------
  const formatTime = (input) => {
    if (!input) return "";

    if (input.includes(":")) {
      const [mm, ss] = input.split(":");
      const m = parseInt(mm, 10) || 0;
      const s = parseInt(ss, 10) || 0;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    const totalSeconds = parseInt(input, 10);
    if (!isNaN(totalSeconds)) {
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    return input;
  };

  const handleInputChange = (id, field, value) => {
    if (field === "time") {
      if (!/^[0-9:]*$/.test(value)) return;
      if (value.length > 5) return;
    }

    setAllTableData((prev) => {
      const list = prev[activeTab] || [];
      const updated = list.map((row) => (row.id === id ? { ...row, [field]: value } : row));
      return { ...prev, [activeTab]: updated };
    });
  };

  const handleTimeBlur = (id, value) => {
    const formatted = formatTime(value);
    if (formatted !== value) handleInputChange(id, "time", formatted);
  };

  const handleAddRow = () => {
    const newRow = { id: Date.now(), text: "", time: "" };
    setAllTableData((prev) => {
      const list = prev[activeTab] || [];
      return { ...prev, [activeTab]: [...list, newRow] };
    });
  };

  const handleSave = () => {
    fetch(`/games/${matchId}/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(allTableData),
    }).then((res) => {
      if (res.ok) navigate(`/team/${teamId}`);
      else alert("Failed to save changes.");
    });
  };

  const handleExport = () => console.log("Export Current Table clicked for:", activeTab);
  const handleExit = () => setShowExitConfirm(true);
  const confirmExit = () => navigate(`/team/${teamId}`);

  const tableHeaderTitle =
    {
      "Game State": "Game State Table - General",
      Offensive: "Roster - Offensive",
      Defensive: "Roster - Defensive",
      Special: "Roster - Special Teams",
    }[activeTab] || "Table";

  // ----------------------------
  // Video Player (YouTube backend)
  // ----------------------------
  const [videoList, setVideoList] = useState([]);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [loadingVideos, setLoadingVideos] = useState(true);
  const videoRef = useRef(null);

  const fetchVideos = async () => {
    if (!token) return;

    try {
      const res = await fetch("/videos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const videos = await res.json();
      setVideoList(Array.isArray(videos) ? videos : []);

      if (Array.isArray(videos) && videos.length > 0) {
        setVideoSrc(videos[0].playback_url);
        setVideoName(videos[0].filename);
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleYouTubeVideo = async () => {
    const youtubeInput = prompt("Enter the YouTube video URL or ID:");
    if (!youtubeInput) return;

    if (!token) {
      alert("You must be logged in to add a video.");
      return;
    }

    try {
      const res = await fetch("/videos/youtube", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtube_id: youtubeInput, filename: "Game Film" }),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try {
          const parsed = JSON.parse(text);
          detail = parsed.detail || JSON.stringify(parsed);
        } catch (e) {
          // non-JSON error body
        }
        alert(`Failed to register video: ${detail} (Status ${res.status})`);
        return;
      }

      const newVideo = await res.json();
      setVideoList((prev) => [newVideo, ...prev]);
      setVideoSrc(newVideo.playback_url);
      setVideoName(newVideo.filename);
      alert("Video added successfully!");
    } catch (err) {
      alert("Error adding YouTube video:\n" + err);
    }
  };

  // ----------------------------
  // Roster (players) for Off/Def/Special tabs
  // ----------------------------
  const currentUnit = TAB_TO_UNIT[activeTab]; // undefined for Game State

  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersErr, setPlayersErr] = useState("");

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showPlayerView, setShowPlayerView] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [playerName, setPlayerName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [notes, setNotes] = useState("");

  const positionsForUnit = (unit) => {
    if (unit === "offense") return OFFENSE_POSITIONS;
    if (unit === "defense") return DEFENSE_POSITIONS;
    return SPECIAL_POSITIONS;
  };

  const loadPlayers = async () => {
    if (!token) return;
    setPlayersErr("");
    setPlayersLoading(true);
    try {
      const res = await fetch("/players", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to load players");
      setPlayers(Array.isArray(data) ? data : []);
    } catch (e) {
      setPlayersErr(e.message);
    } finally {
      setPlayersLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const rosterPlayers = currentUnit ? players.filter((p) => p.unit === currentUnit) : [];

  const openAddPlayer = () => {
    if (!currentUnit) return;
    setPlayerName("");
    setJerseyNumber("");
    setNotes("");
    setPosition("");
    setShowAddPlayer(true);
  };

  const createPlayer = async () => {
    if (!currentUnit) return;
    if (!playerName.trim()) return;

    try {
      const res = await fetch("/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          player_name: playerName.trim(),
          jersey_number: jerseyNumber === "" ? null : Number(jerseyNumber),
          unit: currentUnit,
          position: position || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to create player");

      setShowAddPlayer(false);
      await loadPlayers();
    } catch (e) {
      alert(e.message);
    }
  };

  //  open player modal + preload editable stats
  const openPlayerView = (p) => {
  setSelectedPlayer(p);
  setEditTD(p.touchdowns ?? 0);
  setEditYards(p.yards ?? 0);
  setEditTackles(p.tackles ?? 0);
  setEditINT(p.interceptions ?? 0);
  setIsEditingPlayer(false);   //  important
  setShowPlayerView(true);
};


  // Save edited stats (PUT /players/{id})
  const savePlayerStats = async () => {
    if (!selectedPlayer?.id) return;
    setSavingPlayerStats(true);

    try {
      const res = await fetch(`/players/${selectedPlayer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          touchdowns: Math.max(0, Number(editTD) || 0),
          yards: Math.max(0, Number(editYards) || 0),
          tackles: Math.max(0, Number(editTackles) || 0),
          interceptions: Math.max(0, Number(editINT) || 0),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to update player stats");
      }
      setIsEditingPlayer(false);

      // Update players list
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === selectedPlayer.id
            ? {
                ...p,
                touchdowns: Math.max(0, Number(editTD) || 0),
                yards: Math.max(0, Number(editYards) || 0),
                tackles: Math.max(0, Number(editTackles) || 0),
                interceptions: Math.max(0, Number(editINT) || 0),
              }
            : p
        )
      );

      // Update selectedPlayer so modal displays updated values too
      setSelectedPlayer((prev) =>
        prev
          ? {
              ...prev,
              touchdowns: Math.max(0, Number(editTD) || 0),
              yards: Math.max(0, Number(editYards) || 0),
              tackles: Math.max(0, Number(editTackles) || 0),
              interceptions: Math.max(0, Number(editINT) || 0),
            }
          : prev
      );
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingPlayerStats(false);
    }
  };

  // open delete confirm modal instead of window.confirm
  const requestDeletePlayer = (p) => {
    if (!p?.id) return;
    setPlayerToDelete(p);
  };

  // actual delete action after confirm
  const confirmDeletePlayer = async () => {
    if (!playerToDelete?.id) return;

    const playerId = playerToDelete.id;

    try {
      const res = await fetch(`/players/${playerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try {
          const parsed = JSON.parse(text);
          detail = parsed.detail || JSON.stringify(parsed);
        } catch (e) {}
        throw new Error(detail || "Failed to delete player");
      }

      setPlayers((prev) => prev.filter((p) => p.id !== playerId));

      if (selectedPlayer?.id === playerId) {
        setShowPlayerView(false);
        setSelectedPlayer(null);
      }

      setPlayerToDelete(null);
    } catch (e) {
      alert(e.message);
      setPlayerToDelete(null);
    }
  };

  // ----------------------------
  // Right panel renderer
  // ----------------------------
  const renderRightPanel = () => {
    // GAME STATE tab keeps Jonathan's table
    if (activeTab === "Game State") {
      const currentTableData = allTableData[activeTab] || [];
      return (
        <div className="game-state-table-container">
          <div className="table-title-header">{tableHeaderTitle}</div>

          <div className="table-header-row">
            <div className="cell col-obs">Observation</div>
            <div className="cell col-time">Time</div>
            <div className="scrollbar-spacer"></div>
          </div>

          <div className="table-scroll-area">
            {currentTableData.map((row) => (
              <div className="table-row" key={row.id}>
                <div className="cell col-obs">
                  <input
                    className="table-input"
                    value={row.text}
                    onChange={(e) => handleInputChange(row.id, "text", e.target.value)}
                  />
                </div>

                <div className="cell col-time">
                  <input
                    className="table-input center"
                    value={row.time}
                    onChange={(e) => handleInputChange(row.id, "time", e.target.value)}
                    onBlur={(e) => handleTimeBlur(row.id, e.target.value)}
                    placeholder="00:00"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="table-footer-row">
            <button className="add-row-btn" onClick={handleAddRow}>
              Add Row +
            </button>
          </div>
        </div>
      );
    }

    // ROSTER tab tables (Off/Def/Special)
    return (
      <div className="game-state-table-container">
        <div className="table-title-header">{tableHeaderTitle}</div>

        <div style={{ padding: "10px 12px" }}>
          {playersErr && <div style={{ color: "crimson", marginBottom: 8 }}>{playersErr}</div>}

          {playersLoading ? (
            <div>Loading roster…</div>
          ) : (
            <div
              style={{
                border: "2px solid black",
                borderRadius: 8,
                overflow: "hidden",
                background: "white",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr 110px 44px 44px",
                  fontWeight: "bold",
                  borderBottom: "2px solid black",
                  padding: "10px",
                  background: "#f3d08c",
                }}
              >
                <div>No.</div>
                <div>Name</div>
                <div>Role</div>
                <div></div>
                <div></div>
              </div>

              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {rosterPlayers.length === 0 ? (
                  <div style={{ padding: 12, fontStyle: "italic" }}>No players yet. Click “Add Player +”.</div>
                ) : (
                  rosterPlayers.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1fr 110px 44px 44px",
                        padding: "10px",
                        borderBottom: "1px solid #ddd",
                        alignItems: "center",
                      }}
                    >
                      <div>{p.jersey_number ?? ""}</div>
                      <div>{p.player_name}</div>
                      <div>{p.position ?? ""}</div>

                      {/* view */}
                      <button
                        onClick={() => openPlayerView(p)}
                        title="View player"
                        style={{ width: 36, height: 30, cursor: "pointer" }}
                      >
                        🔍
                      </button>

                      {/* delete (opens custom confirm modal) */}
                      <button
                        onClick={() => requestDeletePlayer(p)}
                        title="Delete player"
                        style={{
                          width: 36,
                          height: 30,
                          cursor: "pointer",
                          color: "white",
                          background: "#c0392b",
                          border: "1px solid #000",
                          borderRadius: 4,
                          fontWeight: "bold",
                        }}
                      >
                        X
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ padding: 10, textAlign: "center" }}>
                <button className="add-row-btn" onClick={openAddPlayer}>
                  Add Player +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ----------------------------
  // Render page
  // ----------------------------
  return (
    <div className="analyze-game-container">
      {/* Header */}
      <div className="analyze-header" style={{ flexDirection: "column", height: "auto", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {teamId && (
              <button
                className="add-team-btn"
                onClick={() => navigate(`/team/${teamId}`)}
                style={{ margin: 0, padding: "8px 16px", fontSize: "14px" }}
              >
                ← Back to Games
              </button>
            )}

            <div className="analyze-title" style={{ margin: 0, fontSize: "24px" }}>
              {match ? `${match.name} vs ${match.opponent}` : "Analyze Game"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="add-team-btn"
              onClick={handleYouTubeVideo}
              style={{ margin: 0, padding: "8px 16px", fontSize: "14px" }}
            >
              Add YouTube Video
            </button>

            <button
              className="add-team-btn"
              onClick={fetchVideos}
              style={{ margin: 0, padding: "8px 16px", fontSize: "14px" }}
            >
              Fetch Videos
            </button>

            {match && (
              <button
                className="add-team-btn"
                onClick={() => setShowEdit(true)}
                style={{ margin: 0, padding: "8px 16px", fontSize: "14px" }}
              >
                Edit Game Details
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="analyze-tabs" style={{ alignSelf: "flex-start" }}>
          {["Game State", "Offensive", "Defensive", "Special"].map((tab) => (
            <button
              key={tab}
              className="tab-button"
              style={activeTab === tab ? { transform: "translate(2px, 2px)", boxShadow: "none" } : {}}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="analyze-content">
        {/* Video */}
        <div className="video-player-section">
          {loadingVideos ? (
            <div>Loading videos...</div>
          ) : videoSrc ? (
            <iframe
              ref={videoRef}
              src={videoSrc}
              title={videoName}
              width="100%"
              height="360"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="video-placeholder">Upload a video to begin analysis</div>
          )}

          {videoList.length > 1 && (
            <div className="video-list">
              {videoList.map((v) => (
                <button
                  key={v.id}
                  className="video-list-item"
                  onClick={() => {
                    setVideoSrc(v.playback_url);
                    setVideoName(v.filename);
                  }}
                >
                  {v.filename}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        {renderRightPanel()}
      </div>

      {/* Footer buttons */}
      <div className="footer-buttons">
        <button className="action-btn save" onClick={handleSave}>
          Save Changes and Exit
        </button>
        <button className="action-btn export" onClick={handleExport}>
          Export Current Table
        </button>
        <button className="action-btn exit" onClick={handleExit}>
          Exit without Saving
        </button>
      </div>

      {/* DELETE PLAYER CONFIRM MODAL */}
      {playerToDelete && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <p style={{ marginBottom: 10 }}>
              Are you sure you want to delete{" "}
              <strong>
                {playerToDelete.player_name}
                {playerToDelete.jersey_number != null ? ` #${playerToDelete.jersey_number}` : ""}
              </strong>
              ?
              <br />
              <strong>This cannot be undone.</strong>
            </p>

            <button className="confirm-yes" onClick={confirmDeletePlayer} style={{ background: "#c0392b" }}>
              Yes, Delete
            </button>
            <button className="confirm-cancel" onClick={() => setPlayerToDelete(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ADD PLAYER MODAL */}
      {showAddPlayer && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Add Player</h2>

            <label>Player Name</label>
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />

            <label>Jersey #</label>
            <input value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} inputMode="numeric" />

            <label>Role (Position)</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">Select…</option>
              {positionsForUnit(currentUnit).map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>

            <label>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />

            <div className="modal-actions">
              <button className="modal-primary" onClick={createPlayer}>
                Add Player
              </button>
              <button className="modal-secondary" onClick={() => setShowAddPlayer(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW/EDIT PLAYER MODAL */}
{showPlayerView && selectedPlayer && (
  <div className="modal-overlay">
    <div className="modal-card">
      <h2>
        Player: {selectedPlayer.player_name} #{selectedPlayer.jersey_number ?? ""}
      </h2>

      <p style={{ marginTop: 6 }}>
        <strong>Unit:</strong> {selectedPlayer.unit || ""}
        <br />
        <strong>Role:</strong> {selectedPlayer.position || ""}
      </p>

      <div style={{ marginTop: 12 }}>
        <strong>Stats</strong>

        {!isEditingPlayer ? (
          // VIEW MODE (no inputs)
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <div>TD: {selectedPlayer.touchdowns ?? 0}</div>
            <div>Yards: {selectedPlayer.yards ?? 0}</div>
            <div>Tackles: {selectedPlayer.tackles ?? 0}</div>
            <div>INT: {selectedPlayer.interceptions ?? 0}</div>
          </div>
        ) : (
          // EDIT MODE (inputs)
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <label>
              TD
              <input
                type="number"
                min="0"
                value={editTD}
                onChange={(e) => setEditTD(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>

            <label>
              Yards
              <input
                type="number"
                min="0"
                value={editYards}
                onChange={(e) => setEditYards(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>

            <label>
              Tackles
              <input
                type="number"
                min="0"
                value={editTackles}
                onChange={(e) => setEditTackles(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>

            <label>
              INT
              <input
                type="number"
                min="0"
                value={editINT}
                onChange={(e) => setEditINT(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Notes</strong>
        <div style={{ marginTop: 6 }}>{selectedPlayer.notes ?? ""}</div>
      </div>

      <div className="modal-actions" style={{ marginTop: 16 }}>
        {!isEditingPlayer ? (
          <button className="modal-primary" onClick={() => setIsEditingPlayer(true)}>
            Edit Stats
          </button>
        ) : (
          <button className="modal-primary" onClick={savePlayerStats} disabled={savingPlayerStats}>
            {savingPlayerStats ? "Saving..." : "Save"}
          </button>
        )}

        <button
          className="modal-secondary"
          onClick={() => {
            setShowPlayerView(false);
            setSelectedPlayer(null);
            setIsEditingPlayer(false);
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {/* EDIT GAME MODAL */}
      {showEdit && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Edit Game Details</h2>

            <label>Game Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />

            <label>Opponent</label>
            <input value={opponent} onChange={(e) => setOpponent(e.target.value)} />

            <label>Date</label>
            <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />

            <label>Team Score</label>
            <input type="number" value={teamScore} onChange={(e) => setTeamScore(e.target.value)} />

            <label>Opponent Score</label>
            <input type="number" value={opponentScore} onChange={(e) => setOpponentScore(e.target.value)} />

            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

            <div className="modal-actions">
              <button className="modal-primary" onClick={handleUpdateMatch}>
                Save Changes
              </button>
              <button className="modal-secondary" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXIT CONFIRM MODAL */}
      {showExitConfirm && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <p>
              Are you sure you want to exit without saving?
              <br />
              <strong>Any unsaved changes will be lost.</strong>
            </p>
            <button className="confirm-yes" onClick={confirmExit}>
              Yes, Exit
            </button>
            <button className="confirm-cancel" onClick={() => setShowExitConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
