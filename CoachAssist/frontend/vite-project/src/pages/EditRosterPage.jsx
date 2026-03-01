import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/edit_rosters.css";
import { POSITION_GROUPS, UNIVERSAL_STATS } from "../constants/gameConstants";

//POSITION MAP
//Defines wich positions belong to each unit
//Dynamically populate dropdown
const POSITION_MAP = {
  offense: ["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"],
  defense: ["DE", "DT", "NT", "OLB", "ILB", "MLB", "CB", "FS", "SS"],
  special: ["K", "P", "KR", "PR", "LS"],
};

//POSITION LABELS
//Convert short position codes to readable names
//Used for tooltips and dropdowns
const POSITION_LABELS = {
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
  ILB: "Inside Linebacker",
  MLB: "Middle Linebacker",
  CB: "Cornerback",
  FS: "Free Safety",
  SS: "Strong Safety",
  K: "Kicker",
  P: "Punter",
  KR: "Kick Returner",
  PR: "Punt Returner",
  LS: "Long Snapper",
};

export default function EditRosterPage() {
  const { teamId } = useParams(); //Read teamId from URL
  const navigate = useNavigate(); //Navigation helper
  const token = localStorage.getItem("token"); //JWT token for authenticated requests

  //STATES
  const [unit, setUnit] = useState("offense"); //Currently selected unit tab
  const [players, setPlayers] = useState([]); //List of players for selected unit
  const [showAdd, setShowAdd] = useState(false); //Controls visibility of add plaer modal
  const [editPlayer, setEditPlayer] = useState(null); //Holds player being edited
  const [deleteTarget, setDeleteTarget] = useState(null); //Holds player selected for deletion

  //Player History States
  const [selectedHistoryPlayer, setSelectedHistoryPlayer] = useState(null); //Player whose history is being viewed
  const [historyData, setHistoryData] = useState(null); //Full aggregated history data from backend
  const [activeHistoryTab, setActiveHistoryTab] = useState("metrics"); //Controls current history tab
  const [selectedGameIds, setSelectedGameIds] = useState([]); //Stores included game IDs
  const [showGameDropdown, setShowGameDropdown] = useState(false); //Controls dropdown visibility
  const [pendingPositionChange, setPendingPositionChange] = useState(false); //Handle player position change

  //Form state for add/edit modal
  const [form, setForm] = useState({
    player_name: "",
    jersey_number: "",
    position: "",
  });

  //FETCH PLAYERS
  
  //Fetch players for selected team and unit
  const fetchPlayers = () => {
    fetch(`/teams/${teamId}/players?unit=${unit}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch players");
        return res.json();
      })
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.id - b.id);
        setPlayers(sorted);
      })
  };

  //Re-fetch when unit changes
  useEffect(() => {
    fetchPlayers();
  }, [teamId, unit]);

  // Automatically load first player when players list updates
  useEffect(() => {
    if (players.length > 0) {
      openPlayerHistory(players[0]);
    }
  }, [players]);

  //ADD PLAYER

  //Sends POST request to create new player
  const addPlayer = async () => {

    //Basic validation
    if (!form.player_name || !form.jersey_number || !form.position) {
      alert("All fields are required");
      return;
    }

    const res = await fetch(`/teams/${teamId}/players`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        team_id: Number(teamId),
        unit,
        player_name: form.player_name.trim(),
        jersey_number: Number(form.jersey_number),
        position: form.position,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || "Failed to add player");
      return;
    }

    //Reset modal and refresh list
    setShowAdd(false);
    setForm({ player_name: "", jersey_number: "", position: "" });
    fetchPlayers(); 
  };

  //UPDATE PLAYER DETAILS

  //Sends PUT request to update existing player
  const updatePlayer = async () => {

    // If position changed → show warning modal first
    if (editPlayer.position !== form.position) {
      setPendingPositionChange(true);
      return;
    }

    proceedWithUpdate();
  };

  const proceedWithUpdate = async () => {
    const res = await fetch(`/teams/players/${editPlayer.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        player_name: form.player_name.trim(),
        jersey_number: Number(form.jersey_number),
        position: form.position,
      }),
    });

    if (!res.ok) {
      alert("Failed to update player");
      return;
    }

    setPendingPositionChange(false);
    setEditPlayer(null);
    fetchPlayers();
  };

  //DELETE PLAYER

  //Confirm and delete selected player
  const confirmDelete = async () => {
    await fetch(`/teams/players/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    setDeleteTarget(null);
    fetchPlayers();
  };

  //Open Player History Panel
  const openPlayerHistory = async (player) => {
    try {
      // Set selected player (this triggers panel visibility)
      setSelectedHistoryPlayer(player);

      // Fetch aggregated history from backend
      const res = await fetch(
        `/players/${player.id}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load player history");
      }

      const data = await res.json();

      // Store returned data
      setHistoryData(data);

      // Default: include all games in filter
      setSelectedGameIds(data.games.map(game => game.id));

    } catch (error) {
      console.error("Error loading player history:", error);
      alert("Unable to load player history.");
    }
  };

  return (
    <div className="edit-roster-page">

      {/* Page Title */}
      <h2>View / Edit Roster</h2>

      {/* UNIT TABS */}
      <div className="unit-buttons">
        {["offense", "defense", "special"].map((u) => (
          <button
            key={u}
            className={`unit-btn ${unit === u ? u : ""}`}
            onClick={() => setUnit(u)}
          >
            {u.toUpperCase()}
          </button>
        ))}

        {/* Go Back button */}
        <button className="unit-btn back" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>

      {/* PLAYER TABLE + HISTORY */}
      <div className="roster-wrapper">

        {/* LEFT COLUMN */}
        <div className="roster-left">

          <table className={`roster-table ${unit}`}>
            <thead>
              <tr>
                <th className="num-col">No.</th>
                <th className="name-col">Name</th>
                <th className="role-col">Role</th>
                <th className="action-col"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr
                  key={p.id}
                  className={
                    selectedHistoryPlayer?.id === p.id
                      ? "active-player-row"
                      : ""
                  }
                >
                  <td>{p.jersey_number}</td>
                  <td>{p.player_name}</td>
                  <td
                    className="position-cell"
                    title={POSITION_LABELS[p.position]}
                  >
                    {p.position}
                  </td>

                  {/* Action Buttons */}
                  <td className="actions">
                    <button
                      title="View Player History"
                      onClick={() => openPlayerHistory(p)}
                    >
                      🔍
                    </button>

                    <button
                      title="Edit Player"
                      onClick={() => {
                        setEditPlayer(p);
                        setForm({
                          player_name: p.player_name,
                          jersey_number: p.jersey_number,
                          position: p.position,
                        });
                      }}
                    >
                      ✏️
                    </button>

                    <button
                      title="Delete Player"
                      onClick={() => setDeleteTarget(p)}
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Player Button */}
          <button
            className="add-player-wide"
            onClick={() => setShowAdd(true)}
          >
            Add Player +
          </button>

        </div> {/* END roster-left */}

        {/* RIGHT COLUMN */}
        <div className="history-panel">

          {selectedHistoryPlayer && historyData && (
            <>
              <div className="history-header">
                <div className="player-header">
                  <h2>
                    #{selectedHistoryPlayer.jersey_number} {selectedHistoryPlayer.player_name}
                  </h2>
                  <div className="player-position">
                    {POSITION_LABELS[selectedHistoryPlayer.position]}
                  </div>
                </div>

                <p className="history-description">
                  {activeHistoryTab === "metrics" &&
                    "Combined totals and per-game averages for selected games."}

                  {activeHistoryTab === "bygame" &&
                    "Game-by-game breakdown with averages for comparison."}

                  {activeHistoryTab === "insights" &&
                    "Chronological observations from selected games."}
                </p>

                <div className="history-tabs">
                  <button
                    className={activeHistoryTab === "metrics" ? "active-tab" : ""}
                    onClick={() => setActiveHistoryTab("metrics")}
                  >
                    Player Metric Data
                  </button>
                  <button
                    className={activeHistoryTab === "bygame" ? "active-tab" : ""}
                    onClick={() => setActiveHistoryTab("bygame")}
                  >
                    Player Data By Game
                  </button>
                  <button
                    className={activeHistoryTab === "insights" ? "active-tab" : ""}
                    onClick={() => setActiveHistoryTab("insights")}
                  >
                    Player Insights
                  </button>
                  <button
                    className={activeHistoryTab === "visuals" ? "active-tab" : ""}
                    onClick={() => setActiveHistoryTab("visuals")}
                  >
                    Data Visualizations
                  </button>
                </div>

                {/* Game Filter */}
                <div>
                  <div className="game-filter-container">
                    <button
                      className="game-filter-button"
                      onClick={() => setShowGameDropdown(!showGameDropdown)}
                    >
                      Select Games ▼
                    </button>

                    {showGameDropdown && (
                      <div className="game-dropdown">

                        <div className="game-dropdown-content">

                          {/* ALL GAMES */}
                          <label className="game-option">
                            <input
                              type="checkbox"
                              checked={selectedGameIds.length === historyData.games.length}
                              onChange={() => {
                                if (selectedGameIds.length === historyData.games.length) {
                                  setSelectedGameIds([]);
                                } else {
                                  setSelectedGameIds(historyData.games.map(g => g.id));
                                }
                              }}
                            />
                            All Games
                          </label>

                          <hr />

                          {/* INDIVIDUAL GAMES */}
                          {historyData.games.map((game) => (
                            <label key={game.id} className="game-option">
                              <input
                                type="checkbox"
                                checked={selectedGameIds.includes(game.id)}
                                onChange={() => {
                                  if (selectedGameIds.includes(game.id)) {
                                    setSelectedGameIds(
                                      selectedGameIds.filter(id => id !== game.id)
                                    );
                                  } else {
                                    setSelectedGameIds([...selectedGameIds, game.id]);
                                  }
                                }}
                              />
                              {game.opponent} ({game.game_date})
                            </label>
                          ))}

                        </div>

                      </div>
                    )}

                  </div>
                </div>
              </div>

              <div className="history-body">

                {activeHistoryTab === "metrics" && (
                  <MetricsTab
                    historyData={historyData}
                    selectedGameIds={selectedGameIds}
                    selectedPlayer={selectedHistoryPlayer}
                  />
                )}

                {activeHistoryTab === "bygame" && (
                  <ByGameTab
                    historyData={historyData}
                    selectedGameIds={selectedGameIds}
                    selectedPlayer={selectedHistoryPlayer}
                    unit={unit}
                  />
                )}

                {activeHistoryTab === "insights" && (
                  <InsightsTab
                    historyData={historyData}
                    selectedGameIds={selectedGameIds}
                  />
                )}

              </div>
            </>
          )}

        </div> {/* END history-panel */}

      </div> {/* END roster-wrapper */}

      {/* ADD / EDIT MODAL */}
      {(showAdd || editPlayer) && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>{editPlayer ? "Edit Player" : "Add Player"}</h3>

            {/* Name Input */}
            <input
              className="modal-input"
              placeholder="Player Name"
              value={form.player_name}
              onChange={(e) =>
                setForm({ ...form, player_name: e.target.value })
              }
            />

            {/* Jersey Number Input */}
            <input
              className="modal-input"
              type="number"
              placeholder="Jersey Number"
              value={form.jersey_number}
              onChange={(e) =>
                setForm({ ...form, jersey_number: e.target.value })
              }
            />

            {/* Position Dropdown */}
            <select
              className="modal-input"
              value={form.position}
              onChange={(e) =>
                setForm({ ...form, position: e.target.value })
              }
            >
              <option value="">Select Position</option>
              {POSITION_MAP[unit].map((pos) => (
                <option key={pos} value={pos}>
                  {pos} — {POSITION_LABELS[pos]}
                </option>
              ))}
            </select>

            {/* Modal Buttons */}
            <div className="modal-actions">
              <button
                className="primary"
                onClick={editPlayer ? updatePlayer : addPlayer}
              >
                {editPlayer ? "Save" : "Add"}
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setShowAdd(false);
                  setEditPlayer(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POSITION CHANGE WARNING MODAL */}
      {pendingPositionChange && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Change Player Position?</h3>

            <p className="center-text">
              Changing this player's position will NOT delete previous stats.
              <br /><br />
              Stats not relevant to the new position will be hidden for easier review,
              but preserved in case player position changes.
              <br /><br />
              Are you sure you want to continue?
            </p>

            <div className="modal-actions">
              <button
                className="primary"
                onClick={proceedWithUpdate}
              >
                Confirm
              </button>

              <button
                className="secondary"
                onClick={() => setPendingPositionChange(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Delete Player?</h3>
            <p className="center-text">
              Are you sure you want to delete this player?
              <br />
              This action can’t be undone.
            </p>
            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                Delete
              </button>
              <button
                className="secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//HISTORY TAB COMPONENTS

function formatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function MetricsTab({ historyData, selectedGameIds, selectedPlayer }) {
  if (!selectedPlayer) return null;

  const positionGroups =
    POSITION_GROUPS[selectedPlayer.position] || {};

  const allowedStats = [
    ...UNIVERSAL_STATS,
    ...Object.values(positionGroups).flat()
  ];

  const filteredStats = historyData.stats_by_game.filter(stat =>
    selectedGameIds.includes(stat.game_id)
  );

  const totals = {};
  const averages = {};
  const gameCount = filteredStats.length;

  filteredStats.forEach(game => {
    allowedStats.forEach(statKey => {
      totals[statKey] =
        (totals[statKey] || 0) + (game[statKey] || 0);
    });
  });

  allowedStats.forEach(statKey => {
    averages[statKey] =
      gameCount > 0
        ? (totals[statKey] / gameCount).toFixed(2)
        : 0;
  });

  return (
    <div className="metrics-container">

      {/* UNIVERSAL STATS */}
      <div className="metric-group">
        <h4>General</h4>

        {UNIVERSAL_STATS.map(statKey => (
          <div key={statKey} className="metric-row">
            <span>{formatLabel(statKey)}</span>

            <div style={{ textAlign: "right" }}>
              <div><strong>Total:</strong> {totals[statKey] || 0}</div>
              <div style={{ fontSize: "12px", opacity: 0.7 }}>
                Avg: {averages[statKey] || 0}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* POSITION GROUPS */}
      {Object.entries(positionGroups).map(([groupName, statList]) => (
        <div key={groupName} className="metric-group">
          <h4>{groupName}</h4>

          {statList.map(statKey => (
            <div key={statKey} className="metric-row">
              <span>{formatLabel(statKey)}</span>

              <div style={{ textAlign: "right" }}>
                <div><strong>Total:</strong> {totals[statKey] || 0}</div>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>
                  Avg: {averages[statKey] || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ByGameTab({ historyData, selectedGameIds, selectedPlayer, unit }) {
  if (!selectedPlayer) return null;

  const positionGroups =
    POSITION_GROUPS[selectedPlayer.position] || {};

  const allowedStats = [
    ...UNIVERSAL_STATS,
    ...Object.values(positionGroups).flat()
  ];

  const filteredGames = historyData.games
    .filter(game => selectedGameIds.includes(game.id))
    .sort((a, b) =>
      new Date(a.game_date) - new Date(b.game_date)
    );

  const gameCount = filteredGames.length;
  const averages = {};

  filteredGames.forEach(game => {
    const stats =
      historyData.stats_by_game.find(
        s => s.game_id === game.id
      ) || {};

    allowedStats.forEach(stat => {
      averages[stat] =
        (averages[stat] || 0) + (stats[stat] || 0);
    });
  });

  allowedStats.forEach(stat => {
    averages[stat] =
      gameCount > 0
        ? (averages[stat] / gameCount).toFixed(2)
        : 0;
  });

  return (
    <div className="bygame-container">
      <table className="history-table">
        <thead className={`history-header-${unit}`}>
          <tr>
            <th className="date-col">Date</th>
            <th>Opponent</th>

            {allowedStats.map(stat => (
              <th key={stat}>{formatLabel(stat)}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredGames.map(game => {
            const stats =
              historyData.stats_by_game.find(
                s => s.game_id === game.id
              ) || {};

            return (
              <tr key={game.id}>
                <td className="date-col">{game.game_date}</td>
                <td>{game.opponent}</td>

                {allowedStats.map(stat => (
                  <td key={stat}>
                    {stats[stat] || 0}
                  </td>
                ))}
              </tr>
            );
          })}

          {/* AVERAGE ROW */}
          {gameCount > 0 && (
            <tr
              style={{
                fontWeight: "bold",
                background: "#f2f2f2"
              }}
            >
              <td colSpan="2">Average</td>
              {allowedStats.map(stat => (
                <td key={stat}>{averages[stat]}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InsightsTab({ historyData, selectedGameIds }) {

  const filteredNotes = historyData.notes
    .filter(note =>
      selectedGameIds.includes(note.game_id)
    )
    .sort((a, b) =>
      new Date(a.game_date) - new Date(b.game_date)
    );

  return (
    <div className="insights-container">
      <table className="history-table">
        <thead className="insights-header">
          <tr>
            <th className="insight-date">Date</th>
            <th className="insight-opponent">Opponent</th>
            <th className="insight-note">Note</th>
            <th className="insight-time">Time</th>
          </tr>
        </thead>

        <tbody>
          {filteredNotes.map(note => (
            <tr key={`${note.game_date}-${note.note}`}>
              <td className="insight-date">{note.game_date}</td>
              <td className="insight-opponent">{note.opponent}</td>
              <td className="insight-note-cell">{note.note}</td>
              <td className="insight-time">{note.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}