import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/teams.css";

export default function WatchPage() {
  const navigate = useNavigate();
  const { teamId, matchId } = useParams();

  const [match, setMatch] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [teamScore, setTeamScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [description, setDescription] = useState("");

  //FETCH MATCH
  useEffect(() => {
    fetch(`/teams/matches/${matchId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.match) {
          setMatch(data.match);
          setName(data.match.name);
          setOpponent(data.match.opponent);
          setGameDate(data.match.game_date?.split("T")[0]);
          setTeamScore(data.match.team_score ?? "");
          setOpponentScore(data.match.opponent_score ?? "");
          setDescription(data.match.description || "");
        }
      });
  }, [matchId]);

  //UPDATE MATCH
  const handleUpdateMatch = () => {
    fetch(`/teams/matches/${matchId}`, {
      method: "PUT",
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
      .then((res) => res.json())
      .then((data) => {
        if (data.match) {
          setMatch(data.match);
          setShowEdit(false);
        }
      });
  };

  if (!match) {
    return (
      <p style={{ paddingTop: "110px", paddingLeft: "40px" }}>
        Loading game…
      </p>
    );
  }

  return (
    <div style={{ paddingTop: "110px", paddingLeft: "40px" }}>
      {/* BACK */}
      <button
        className="add-team-btn"
        onClick={() => navigate(`/team/${teamId}`)}
        style={{ marginBottom: "15px" }}
      >
        ← Back to Games
      </button>

      {/* ACTIONS */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "12px" }}>
        <button
          className="add-team-btn"
          onClick={() => setShowEdit(true)}
        >
          Edit Game Details
        </button>
      </div>

      <h1>{match.name}</h1>
      <p style={{ fontStyle: "italic" }}>
        vs {match.opponent}
      </p>

      {/* PLACEHOLDER CONTENT */}
      <p style={{ marginTop: "20px", maxWidth: "650px" }}>
        This page will host game video, tables, and analysis tools.
      </p>

      {/* EDIT GAME MODAL */}
      {showEdit && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Edit Game Details</h2>

            <label>Game Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label>Opponent</label>
            <input
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />

            <label>Date</label>
            <input
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />

            <label>Team Score</label>
            <input
              type="number"
              value={teamScore}
              onChange={(e) => setTeamScore(e.target.value)}
            />

            <label>Opponent Score</label>
            <input
              type="number"
              value={opponentScore}
              onChange={(e) => setOpponentScore(e.target.value)}
            />

            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="modal-actions">
              <button
                className="modal-primary"
                onClick={handleUpdateMatch}
              >
                Save Changes
              </button>
              <button
                className="modal-secondary"
                onClick={() => setShowEdit(false)}
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
