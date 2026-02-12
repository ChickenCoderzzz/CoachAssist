import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/analyze_game.css";
import "../styles/teams.css";

// Initial data structure
const INITIAL_DATA = {
  "Game State": [],
  Offensive: [],
  Defensive: [],
  Special: [],
};

export default function AnalyzeGamePage() {
  const { teamId, matchId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Game State");
  const [allTableData, setAllTableData] = useState(INITIAL_DATA);

  // Match State
  const [match, setMatch] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  // Edit Form State
  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [teamScore, setTeamScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [description, setDescription] = useState("");

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Auth token
  const token = localStorage.getItem("token");

  // ----------------------------
  // Fetch Match details + game state
  // ----------------------------
  useEffect(() => {
    if (!matchId) return;

    // Fetch Match Details
    fetch(`/teams/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${token}` },
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

    // Fetch Game State
    fetch(`/games/${matchId}/state`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) setAllTableData(data);
      });
  }, [matchId]);

  // Update Match Details
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

  // ----------------------------
  // Time formatting helpers
  // ----------------------------
  const formatTime = (input) => {
    if (!input) return "";

    if (input.includes(":")) {
      const parts = input.split(":");
      if (parts.length === 2) {
        const m = parseInt(parts[0], 10) || 0;
        const s = parseInt(parts[1], 10) || 0;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      }
      return input;
    }

    const totalSeconds = parseInt(input, 10);
    if (!isNaN(totalSeconds)) {
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    return input;
  };

  const handleTimeBlur = (id, value) => {
    const formatted = formatTime(value);
    if (formatted !== value) {
      handleInputChange(id, "time", formatted);
    }
  };

  // ----------------------------
  // Table input handler (for Game State entries)
  // ----------------------------
  const handleInputChange = (id, field, value) => {
    if (field === "time") {
      if (!/^[0-9:]*$/.test(value)) return;
      if (value.length > 5) return;
    }

    setAllTableData((prevData) => {
      const currentList = prevData[activeTab] || [];
      const updatedList = currentList.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      );

      return { ...prevData, [activeTab]: updatedList };
    });
  };

  const handleAddRow = () => {
    const newRow = { id: Date.now(), text: "", time: "" };

    setAllTableData((prevData) => {
      const currentList = prevData[activeTab] || [];
      return { ...prevData, [activeTab]: [...currentList, newRow] };
    });
  };

  const currentTableData = allTableData[activeTab] || [];
  const tableHeaderTitle =
    {
      "Game State": "Game State Table - General",
      Offensive: "Game State Table - Offensive",
      Defensive: "Game State Table - Defensive",
      Special: "Game State Table - Special",
    }[activeTab] || "Game State Table";

  // ----------------------------
  // Save / Export / Exit
  // ----------------------------
  const handleSave = () => {
    fetch(`/games/${matchId}/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(allTableData),
    }).then((res) => {
      if (res.ok) {
        navigate(`/team/${teamId}`);
      } else {
        alert("Failed to save changes.");
      }
    });
  };

  const handleExport = () => {
    console.log("Export Current Table clicked for:", activeTab);
  };

  const handleExit = () => setShowExitConfirm(true);
  const confirmExit = () => navigate(`/team/${teamId}`);

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

      if (!res.ok) {
        console.error("Failed to fetch videos", await res.text());
        return;
      }

      const videos = await res.json();
      setVideoList(videos);

      if (videos.length > 0) {
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
  }, []);

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
        } catch {}
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
  // Render
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

      {/* Main Content */}
      <div className="analyze-content">
        {/* Video Column */}
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
            ></iframe>
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

        {/* Right table (still game-state for now) */}
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
      </div>

      {/* Footer Buttons */}
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
