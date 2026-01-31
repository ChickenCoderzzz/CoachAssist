import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function TeamPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [games, setGames] = useState([]);

  // Fetch team info + games
  useEffect(() => {
    // Get team details
    fetch(`/teams/${teamId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.team) {
          setTeam(data.team);
        }
      });

    // Get games for this team
    fetch(`/teams/${teamId}/games`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setGames(data.games || []));
  }, [teamId]);

  if (!team) {
    return (
      <div style={{ paddingTop: "110px", paddingLeft: "40px" }}>
        <p>Loading team...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        paddingTop: "110px",
        paddingLeft: "40px",
        paddingRight: "40px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "25px" }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ marginBottom: "15px", cursor: "pointer" }}
        >
          ← Back to Teams
        </button>

        <h1 style={{ marginBottom: "5px" }}>{team.name}</h1>
        {team.description && (
          <p style={{ fontStyle: "italic" }}>{team.description}</p>
        )}
      </div>

      {/* Team actions */}
      <div style={{ marginBottom: "25px" }}>
        <button style={{ marginRight: "10px" }}>Edit Team Details</button>
        <button style={{ marginRight: "10px" }}>Edit / View Roster</button>
        <button style={{ marginRight: "10px" }}>Strategy Analysis</button>
      </div>

      {/* Games section */}
      <div
        style={{
          border: "3px solid black",
          borderRadius: "12px",
          padding: "25px",
          maxWidth: "1000px",
        }}
      >
        <h2 style={{ marginBottom: "15px" }}>Games</h2>

        {games.length === 0 && (
          <p style={{ fontStyle: "italic" }}>
            No games yet. Add a game to begin analysis.
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          {games.map((game) => (
            <div
              key={game.id}
              onClick={() =>
                navigate(`/team/${teamId}/game/${game.id}`)
              }
              style={{
                width: "160px",
                height: "120px",
                border: "2px solid black",
                borderRadius: "10px",
                padding: "10px",
                cursor: "pointer",
              }}
            >
              <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
                {game.title || "Untitled Game"}
              </p>
              <p style={{ fontSize: "12px" }}>
                {new Date(game.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
