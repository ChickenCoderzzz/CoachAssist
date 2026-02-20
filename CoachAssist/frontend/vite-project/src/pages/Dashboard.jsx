import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/teams.css";
import defaultLogo from "../assets/default_team_logo.png";
import PlayersTable from "../components/PlayersTable.jsx";

const TEAM_COLOR_OPTIONS = [ //Colormap
  "#B38F8F", // red
  "#B39A8F", // orange
  "#B3AD8F", // yellow
  "#9DBA8A", // green
  "#8FA8B3", // blue
  "#A88FB3", // purple
  "#E5E5E5", // white
  "#5F5F5F"  // dark grey
];

export default function Dashboard() {
  const [teams, setTeams] = useState([]); //Team list state
  const [search, setSearch] = useState(""); //Search input state
  const [showCreate, setShowCreate] = useState(false); //Team creation modal state
  const [teamToDelete, setTeamToDelete] = useState(null); //Delete confirmation modal state

  //New team state from input
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [imageFile, setImageFile] = useState(null); //Team logo file
  const [previewUrl, setPreviewUrl] = useState(null); //Preview of selected logo
  const [isCreating, setIsCreating] = useState(false); //Loading state for team creation
  const [newColor, setNewColor] = useState("#9DBA8A"); //Color state

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

  //Create team (Updated for image + loading)
  const handleCreateTeam = async () => {
    if (!newName.trim() || isCreating) return; //Prevent empty name + double submit

    setIsCreating(true);

    const formData = new FormData();
    formData.append("name", newName);
    formData.append("description", newDesc || "");
    formData.append("color", newColor);

    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const response = await fetch("/teams/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.team) {
        setTeams((prev) => [...prev, data.team]); //Add new team to state

        //Reset form
        setNewName("");
        setNewDesc("");
        setImageFile(null);
        setPreviewUrl(null);

        //Close modal
        setShowCreate(false);
      }
    } finally {
      setIsCreating(false);
    }
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
              <div
                className="team-icon"
                style={{
                  backgroundColor: team.color || "#9DBA8A"
                }}
              >
                <img
                  src={team.image_url || defaultLogo}
                  alt={team.name}
                  style={{
                    filter: team.color === "#5F5F5F" ? "invert(1)" : "none"
                  }}
                />
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
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <label>Team Description</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />

            {/* Team Color */}
            <label style={{ display: "block", textAlign: "center", marginTop: "10px" }}>
              Team Color
            </label>

            <div className="color-options">
              {TEAM_COLOR_OPTIONS.map((color) => (
                <div
                  key={color}
                  className={`color-circle ${
                    newColor === color ? "selected" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewColor(color)}
                />
              ))}
            </div>

            {/* Live Preview Circle */}
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                overflow: "hidden",
                margin: "15px auto",
                border: "2px solid #000",
                backgroundColor: newColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s ease"
              }}
            >
              <img
                src={previewUrl ? previewUrl : defaultLogo}
                alt="Preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: newColor === "#5F5F5F" ? "invert(1)" : "none"
                }}
              />
            </div>

            {/* Team Logo Upload */}
            <label>Team Logo (Optional)</label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => {
                const file = e.target.files[0];
                setImageFile(file);

                if (file) {
                  setPreviewUrl(URL.createObjectURL(file));
                } else {
                  setPreviewUrl(null);
                }
              }}
            />

            <div className="modal-actions">
              <button
                className="modal-primary"
                onClick={handleCreateTeam}
                style={{
                  opacity: isCreating ? 0.7 : 1,
                  cursor: isCreating ? "not-allowed" : "pointer",
                }}
              >
                {isCreating ? (
                  <>
                    <span className="spinner"></span>
                    Creating...
                  </>
                ) : (
                  "Add Team"
                )}
              </button>

              <button
                className="modal-secondary"
                onClick={() => {
                  setShowCreate(false);
                  setImageFile(null);
                  setPreviewUrl(null);
                  setNewColor("#9DBA8A");
                }}
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