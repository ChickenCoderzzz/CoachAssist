import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/teams.css";

export default function TeamPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [matches, setMatches] = useState([]);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);

  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [teamScore, setTeamScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  //FETCH
  useEffect(() => {
    fetch(`/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => data.team && setTeam(data.team));

    fetch(`/teams/${teamId}/matches`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setMatches(data.matches || []));
  }, [teamId]);

  //CREATE MATCH
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

  //DELETE MATCH
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

  //UPDATE TEAM
  const handleUpdateTeam = () => {
    if (!editName.trim()) return;

    fetch(`/teams/${teamId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        name: editName,
        description: editDescription,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.team) {
          setTeam(data.team);
          setShowEditTeam(false);
        }
      });
  };

  const filteredMatches = matches.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!team) {
    return (
      <p style={{ paddingTop: "110px", paddingLeft: "40px" }}>
        Loading…
      </p>
    );
  }

  return (
    <div style={{ paddingTop: "110px", paddingBottom: "60px" }}>
      {/* HEADER */}
      <div style={{ marginLeft: "40px", marginBottom: "25px" }}>
        <button
          className="add-team-btn"
          onClick={() => navigate("/dashboard")}
          style={{ marginBottom: "15px" }}
        >
          ← Back to Teams
        </button>

        <h1 style={{ marginBottom: "5px" }}>{team.name}</h1>
        {team.description && (
          <p style={{ fontStyle: "italic" }}>{team.description}</p>
        )}
      </div>

      {/* TEAM ACTIONS */}
      <div
        style={{
          marginLeft: "40px",
          marginBottom: "30px",
          display: "flex",
          gap: "12px",
        }}
      >
        <button
          className="add-team-btn"
          onClick={() => {
            setEditName(team.name);
            setEditDescription(team.description || "");
            setShowEditTeam(true);
          }}
        >
          Edit Team Details
        </button>

        <button className="add-team-btn">Edit / View Roster</button>
        <button className="add-team-btn">Strategy Analysis</button>
      </div>

      {/* GAMES CONTAINER */}
      <div className="dashboard-container">
        <h2>Games</h2>

        <div className="dashboard-controls">
          <button
            className="add-team-btn"
            onClick={() => setShowCreate(true)}
          >
            Add Game
          </button>

          <input
            type="text"
            placeholder="Search games"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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

      {/* EDIT TEAM MODAL */}
      {showEditTeam && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Edit Team Details</h2>

            <label>Team Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <label>Description</label>
            <textarea
              value={editDescription}
              onChange={(e) =>
                setEditDescription(e.target.value)
              }
            />

            <div className="modal-actions">
              <button
                className="modal-primary"
                onClick={handleUpdateTeam}
              >
                Save Changes
              </button>
              <button
                className="modal-secondary"
                onClick={() => setShowEditTeam(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE + DELETE MODALS */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Add Game</h2>

            {error && (
              <p style={{ color: "#ff9b9b" }}>{error}</p>
            )}

            <input
              placeholder="Game name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="Opponent"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />
            <input
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
            <input
              type="number"
              placeholder="Team score"
              value={teamScore}
              onChange={(e) => setTeamScore(e.target.value)}
            />
            <input
              type="number"
              placeholder="Opponent score"
              value={opponentScore}
              onChange={(e) =>
                setOpponentScore(e.target.value)
              }
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
            />

            <div className="modal-actions">
              <button
                className="modal-primary"
                onClick={handleCreateMatch}
              >
                Create
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

      {matchToDelete && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <p>
              Delete this game?
              <br />
              <strong>This cannot be undone.</strong>
            </p>
            <button
              className="confirm-yes"
              onClick={confirmDeleteMatch}
            >
              Yes, Delete
            </button>
            <button
              className="confirm-cancel"
              onClick={() => setMatchToDelete(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
