import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/edit_rosters.css";

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
      .then(setPlayers)
      .catch((err) => console.error(err));
  };

  //Re-fetch when unit changes
  useEffect(() => {
    fetchPlayers();
  }, [teamId, unit]);

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

      {/* PLAYER TABLE */}
      <div className="roster-wrapper">
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
              <tr key={p.id}>
                <td>{p.jersey_number}</td>
                <td>{p.player_name}</td>
                <td
                  className="position-cell"
                  title={POSITION_LABELS[p.position]}
                >
                  {p.position}
                </td>

                {/* Edit + Delete actions */}
                <td className="actions">
                  <button
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
                  <button onClick={() => setDeleteTarget(p)}>❌</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Player Button */}
        <button className="add-player-wide" onClick={() => setShowAdd(true)}>
          Add Player +
        </button>
      </div>

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
