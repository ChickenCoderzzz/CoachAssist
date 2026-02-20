import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/teams.css";
import defaultLogo from "../assets/default_team_logo.png";

const TEAM_COLOR_OPTIONS = [
  "#B38F8F", // red
  "#B39A8F", // orange
  "#B3AD8F", // yellow
  "#9DBA8A", // green
  "#8FA8B3", // blue
  "#A88FB3", // purple
  "#E5E5E5", // white
  "#5F5F5F"  // dark grey
];

export default function TeamPage() {
  //Get dynamic team ID from URL
  const { teamId } = useParams();
  const navigate = useNavigate();

  //States
  const [team, setTeam] = useState(null); //Current team details
  const [matches, setMatches] = useState([]); //Games for team
  const [search, setSearch] = useState(""); //Search filter for games

  const [showCreate, setShowCreate] = useState(false); //Show add game modal
  const [matchToDelete, setMatchToDelete] = useState(null); //Delete confirmation modal

  const [showEditTeam, setShowEditTeam] = useState(false); //Edit team modal
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#9DBA8A");
  const [editDescription, setEditDescription] = useState("");

  //NEW: Image editing state
  const [editImageFile, setEditImageFile] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Loading state for team update

  //New game form fields
  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [teamScore, setTeamScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  //Fetch team and matches
  useEffect(() => {
    //Fetch team details
    fetch(`/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => data.team && setTeam(data.team));

    //Fetch team matches
    fetch(`/teams/${teamId}/matches`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setMatches(data.matches || []));
  }, [teamId]);

  //Create Match
  const handleCreateMatch = () => {
    setError("");

    if (!name || !opponent || !gameDate) {
      setError("Please fill out all required fields.");
      return;
    }

    fetch(`/teams/${teamId}/matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        name,
        opponent,
        game_date: gameDate,
        team_score: teamScore || null,
        opponent_score: opponentScore || null,
        description,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw data;
        return data;
      })
      .then((data) => {
        setMatches((prev) => [...prev, data.match]);
        setShowCreate(false);
        setName("");
        setOpponent("");
        setGameDate("");
        setTeamScore("");
        setOpponentScore("");
        setDescription("");
      })
      .catch((err) =>
        setError(err.detail || "Failed to create game.")
      );
  };

  //Delete Match
  const confirmDeleteMatch = () => {
    fetch(`/teams/matches/${matchToDelete.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }).then(() => {
      setMatches((prev) =>
        prev.filter((m) => m.id !== matchToDelete.id)
      );
      setMatchToDelete(null);
    });
  };

  //Update Team Details (supports replace + remove image)
  const handleUpdateTeam = async () => {
    if (!editName.trim() || isSaving) return;

    setIsSaving(true);

    const formData = new FormData();
    formData.append("name", editName);
    formData.append("description", editDescription || "");
    formData.append("color", editColor);

    if (removeImage) {
      formData.append("remove_image", "true");
    } else if (editImageFile) {
      formData.append("image", editImageFile);
    }

    try {
      const response = await fetch(`/teams/${teamId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.team) {
        setTeam(data.team);
        setShowEditTeam(false);
        setEditImageFile(null);
        setEditPreviewUrl(null);
        setRemoveImage(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  //Filter games by search input
  const filteredMatches = matches.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!team) {
    return <p style={{ paddingTop: "110px", paddingLeft: "40px" }}>Loading…</p>;
  }

  return (
    <div style={{ paddingTop: "110px", paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ marginLeft: "40px", marginBottom: "25px" }}>
        <button
          className="add-team-btn"
          onClick={() => navigate("/dashboard")}
          style={{ marginBottom: "15px" }}
        >
          ← Back to Teams
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              backgroundColor: team.color || "#9DBA8A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "2px solid #000"
            }}
          >
            <img
              src={team.image_url || defaultLogo}
              alt={team.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: team.color === "#5F5F5F" ? "invert(1)" : "none"
              }}
            />
          </div>
          <h1 style={{ marginBottom: "5px" }}>{team.name}</h1>
        </div>
        {team.description && (
          <p style={{ fontStyle: "italic" }}>{team.description}</p>
        )}
      </div>

      {/* Team Actions */}
      <div style={{ marginLeft: "40px", marginBottom: "30px", display: "flex", gap: "12px" }}>
        <button
          className="add-team-btn"
          onClick={() => {
            setEditName(team.name);
            setEditColor(team.color || "#9DBA8A");
            setEditDescription(team.description || "");
            setRemoveImage(false);
            setEditImageFile(null);
            setEditPreviewUrl(null);
            setShowEditTeam(true);
          }}
        >
          Edit Team Details
        </button>

        <button
          className="add-team-btn"
          onClick={() => navigate(`/teams/${teamId}/roster`)}
        >
          Edit / View Roster
        </button>

        <button className="add-team-btn">Strategy Analysis</button>
      </div>

      {/* Games Container */}
      <div className="dashboard-container">
        <h2>Games</h2>

        <div className="dashboard-controls">
          <button className="add-team-btn" onClick={() => setShowCreate(true)}>
            Add Game
          </button>

          <input
            type="text"
            placeholder="Search games"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Game Cards */}
        <div className="team-grid">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              className="game-card"
              onClick={() =>
                navigate(`/team/${teamId}/match/${match.id}`)
              }
            >
              <button
                className="game-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setMatchToDelete(match);
                }}
              >
                X
              </button>

              <div className="game-title">{match.name}</div>
              <div className="game-opponent">vs {match.opponent}</div>

              <div className="game-hover">
                {match.team_score !== null &&
                  match.opponent_score !== null && (
                    <div className="game-score">
                      {match.team_score} – {match.opponent_score}
                    </div>
                  )}
                {match.description && (
                  <div className="game-description">
                    {match.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT TEAM Modal */}
      {showEditTeam && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Edit Team Details</h2>

            {/* Team Color Picker (only if no image or image removed) */}
            {(!editImageFile && (removeImage || !team.image_url)) && (
              <>
                <label>Team Color</label>
                <div className="color-options">
                  {TEAM_COLOR_OPTIONS.map((color) => (
                    <div
                      key={color}
                      className={`color-circle ${
                        editColor === color ? "selected" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditColor(color)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Image Preview */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  margin: "0 auto 12px",
                  border: "2px solid #000",
                  backgroundColor: editColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <img
                  src={
                    editPreviewUrl
                      ? editPreviewUrl
                      : removeImage
                      ? defaultLogo
                      : team.image_url || defaultLogo
                  }
                  alt="Team Logo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <label>Replace Team Logo (Optional)</label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                style={{ display: "block", margin: "8px auto" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  setEditImageFile(file);
                  setRemoveImage(false);
                  if (file) {
                    setEditPreviewUrl(URL.createObjectURL(file));
                  }
                }}
              />

              {/* Remove image option */}
              {(!removeImage && (editImageFile || team.image_url)) && (
                <button
                  type="button"
                  className="modal-secondary"
                  style={{
                    marginTop: "8px",
                    display: "block",
                    marginLeft: "auto",
                    marginRight: "auto"
                  }}
                  onClick={() => {
                    setRemoveImage(true);
                    setEditImageFile(null);
                    setEditPreviewUrl(null);
                  }}
                >
                  Remove Image
                </button>
              )}
            </div>

            <label>Team Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} />

            <label>Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <div className="modal-actions">
              <button
                  className="modal-primary"
                  onClick={handleUpdateTeam}
                  disabled={isSaving}
                  style={{
                    opacity: isSaving ? 0.7 : 1,
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              <button
                className="modal-secondary"
                onClick={() => {
                  setShowEditTeam(false);
                  setEditImageFile(null);
                  setEditPreviewUrl(null);
                  setRemoveImage(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GAME Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Add Game</h2>

            {error && <p style={{ color: "#ff9b9b" }}>{error}</p>}

            <input placeholder="Game name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
            <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
            <input type="number" placeholder="Team score" value={teamScore} onChange={(e) => setTeamScore(e.target.value)} />
            <input type="number" placeholder="Opponent score" value={opponentScore} onChange={(e) => setOpponentScore(e.target.value)} />
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

            <div className="modal-actions">
              <button className="modal-primary" onClick={handleCreateMatch}>
                Create
              </button>
              <button className="modal-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {matchToDelete && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <p>
              Delete this game?
              <br />
              <strong>This cannot be undone.</strong>
            </p>
            <button className="confirm-yes" onClick={confirmDeleteMatch}>
              Yes, Delete
            </button>
            <button className="confirm-cancel" onClick={() => setMatchToDelete(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}