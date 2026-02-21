import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/teams.css";
import PlayersTable from "../components/PlayersTable.jsx";

export default function Dashboard() {
  const [teams, setTeams] = useState([]); //Team list state
  const [search, setSearch] = useState(""); //Search input state
  const [showCreate, setShowCreate] = useState(false); //Team creation modal state
  const [teamToDelete, setTeamToDelete] = useState(null); //Delete confirmation modal state

  //New team state from input
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const navigate = useNavigate();

  //Fetch teams
  useEffect(() => {
    fetch("/teams/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setTeams(data.teams || []);
      });
  }, []);

  //Create team
  const handleCreateTeam = () => {
    if (!newName.trim()) return; //PRevent empty name

    fetch("/teams/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        name: newName,
        description: newDesc,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.team) {
          setTeams((prev) => [...prev, data.team]); //Add new team to state

          //Reset form
          setNewName("");
          setNewDesc("");

          //Close modal
          setShowCreate(false);
        }
      });
  };

  //Search teams
  const handleSearch = (value) => {
    setSearch(value);

    fetch(`/teams/search?query=${value}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setTeams(data.teams || []));
  };

  //Delete team
  const confirmDeleteTeam = () => {
    fetch(`/teams/${teamToDelete.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }).then(() => {
      //Remove deleted teams from state
      setTeams((prev) => prev.filter((t) => t.id !== teamToDelete.id));
      setTeamToDelete(null);
    });
  };

  return (
    <div style={{ paddingTop: "110px", paddingBottom: "60px" }}>
      {/* Page Title */}
      <h1 style={{ marginLeft: "40px", marginBottom: "20px" }}>Teams</h1>

      {/* Main Container */}
      <div
        style={{
          border: "3px solid black",
          borderRadius: "12px",
          padding: "30px",
          width: "100%",
          maxWidth: "1300px",
          margin: "0 auto",
        }}
      >
        {/* Controls */}
        <div style={{ marginBottom: "20px" }}>
          <button className="add-team-btn" onClick={() => setShowCreate(true)}>
            Add Team
          </button>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search for Team"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ padding: "8px", width: "250px", marginLeft: "15px" }}
          />
        </div>

        {/* Team grid */}
        <div className="team-grid">
          {teams.length === 0 && (
            <p style={{ fontStyle: "italic" }}>
              No teams yet. Create one to get started.
            </p>
          )}

          {/* Team Cards */}
          {teams.map((team) => (
            <div
              key={team.id}
              className="team-card"
              onClick={() => navigate(`/team/${team.id}`)}
            >

              {/* Delete Button */}
              <button
                className="team-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setTeamToDelete(team);
                }}
              >
                X
              </button>


              {/* Team Image */}
              <div className="team-icon">
                <img src={team.image_url || "/team.png"} alt={team.name} />
              </div>

              {/* Team Name */}
              <div className="team-name">{team.name}</div>

              {/* Optional Description */}
              {team.description && (
                <div className="team-description">{team.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>


      {/* Create Team Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Add Team</h2>

            <label>Team Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} />

            <label>Team Description</label>
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />

            <div className="modal-actions">
              <button className="modal-primary" onClick={handleCreateTeam}>
                Add Team
              </button>
              <button
                className="modal-secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {teamToDelete && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <p>
              Are you sure you want to delete this team?
              <br />
              <strong>All data will be lost.</strong>
            </p>

            <button className="confirm-yes" onClick={confirmDeleteTeam}>
              Yes I’m Sure
            </button>
            <button
              className="confirm-cancel"
              onClick={() => setTeamToDelete(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
