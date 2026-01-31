import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Fetch all teams on load
  useEffect(() => {
    fetch("/teams/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched teams:", data);
        setTeams(data.teams || []);
      });
  }, []);

  // Create a new team
  const handleCreateTeam = () => {
    const name = prompt("Enter team name:");
    if (!name) return;

    fetch("/teams/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ name }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Create team response:", data);

        if (data.team) {
          setTeams((prev) => [...prev, data.team]);
        }
      });
  };

  // Search teams
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

  // Delete team
  const handleDeleteTeam = (teamId) => {
    if (!window.confirm("Delete this team? This cannot be undone.")) return;

    fetch(`/teams/${teamId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }).then(() => {
      setTeams((prev) => prev.filter((team) => team.id !== teamId));
    });
  };

  return (
    <div
      style={{
        paddingTop: "110px",
        paddingLeft: "40px",
        paddingRight: "40px",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>Teams</h1>

      <div
        style={{
          border: "3px solid black",
          borderRadius: "12px",
          padding: "25px",
          maxWidth: "1000px",
        }}
      >
        {/* Controls */}
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={handleCreateTeam}
            style={{
              marginRight: "15px",
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Add Team
          </button>

          <input
            type="text"
            placeholder="Search for Team"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              padding: "8px",
              width: "250px",
            }}
          />
        </div>

        {/* Team folders */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          {teams.length === 0 && (
            <p style={{ fontStyle: "italic" }}>
              No teams yet. Create one to get started.
            </p>
          )}

          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => navigate(`/team/${team.id}`)}
              style={{
                position: "relative",
                width: "150px",
                height: "150px",
                border: "2px solid black",
                borderRadius: "10px",
                padding: "10px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTeam(team.id);
                }}
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "8px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
                title="Delete Team"
              >
                Delete
              </button>

              <img
                src={team.image_url || "/team.png"}
                alt={team.name}
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "contain",
                  marginBottom: "10px",
                }}
              />
              <p style={{ margin: 0 }}>{team.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
