import React, { useState, useRef, useEffect } from "react";
import "../styles/analyze_game.css";

// Initial data structure
const INITIAL_DATA = {
  "Game State": [
    { id: 1, text: "Their quarterback...", time: "XX:XX" },
    { id: 2, text: "Our left tackle...", time: "XX:XX" },
    { id: 3, text: "Their wide receiver...", time: "XX:XX" },
    { id: 4, text: "General observation 1...", time: "XX:XX" },
    { id: 5, text: "General observation 2...", time: "XX:XX" },
    { id: 6, text: "", time: "" }
  ],
  Offensive: [
    { id: 1, text: "Offensive Line shift...", time: "10:00" },
    { id: 2, text: "QB pocket presence...", time: "12:30" },
    { id: 3, text: "WR route running...", time: "14:15" },
    { id: 4, text: "", time: "" }
  ],
  Defensive: [
    { id: 1, text: "Missed tackle LB...", time: "05:45" },
    { id: 2, text: "Safety coverage...", time: "08:20" },
    { id: 3, text: "D-Line pressure...", time: "11:10" },
    { id: 4, text: "", time: "" }
  ],
  Special: [
    { id: 1, text: "Kickoff return coverage...", time: "00:05" },
    { id: 2, text: "Punt block attempt...", time: "12:00" },
    { id: 3, text: "Field goal range...", time: "04:30" },
    { id: 4, text: "", time: "" }
  ]
};

export default function AnalyzeGamePage() {
  const [activeTab, setActiveTab] = useState("Game State");
  const [allTableData, setAllTableData] = useState(INITIAL_DATA);

  // Video state
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoName, setVideoName] = useState("");
  const videoRef = useRef(null);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  // Handle table input
  const handleInputChange = (id, field, value) => {
    if (field === "time") {
      if (!/^[0-9:]*$/.test(value)) return;
      if (value.length > 5) return;
    }

    setAllTableData(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    }));
  };

  // Add row
  const handleAddRow = () => {
    const newRow = { id: Date.now(), text: "", time: "" };
    setAllTableData(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newRow]
    }));
  };

  // Upload video
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoName(file.name);
  };

  const currentTableData = allTableData[activeTab];

  const tableHeaderTitle = {
    "Game State": "Game State Table - General",
    Offensive: "Game State Table - Offensive",
    Defensive: "Game State Table - Defensive",
    Special: "Game State Table - Special"
  }[activeTab];

  return (
    <div className="analyze-game-container">
      {/* Header */}
      <div className="analyze-header">
        <div className="analyze-title">Analyze Game</div>

        <div className="analyze-tabs">
          {["Game State", "Offensive", "Defensive", "Special"].map(tab => (
            <button
              key={tab}
              className="tab-button"
              style={
                activeTab === tab
                  ? { transform: "translate(2px, 2px)", boxShadow: "none" }
                  : {}
              }
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="analyze-content">
  {/* Video Column (button above video) */}
  <div className="video-column">
    {/* Video Upload Button */}
    <div className="video-upload-wrapper">
      <input
        type="file"
        accept="video/*"
        id="video-upload"
        style={{ display: "none" }}
        onChange={handleVideoUpload}
      />
      <button
        className="action-btn"
        onClick={() => document.getElementById("video-upload").click()}
      >
        Upload Video
      </button>
      {videoName && <span className="video-name">{videoName}</span>}
    </div>

    {/* Video Player */}
    <div className="video-player-section">
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          className="video-player"
        />
      ) : (
        <div className="video-placeholder">
          Upload a video to begin analysis
        </div>
      )}
    </div>
  </div>

        {/* Table */}
        <div className="game-state-table-container">
          <div className="table-title-header">{tableHeaderTitle}</div>

          <div className="table-header-row">
            <div className="cell col-obs">Observation</div>
            <div className="cell col-time">Time</div>
            <div className="scrollbar-spacer"></div>
          </div>

          <div className="table-scroll-area">
            {currentTableData.map(row => (
              <div className="table-row" key={row.id}>
                <div className="cell col-obs">
                  <input
                    className="table-input"
                    value={row.text}
                    onChange={e =>
                      handleInputChange(row.id, "text", e.target.value)
                    }
                  />
                </div>
                <div className="cell col-time">
                  <input
                    className="table-input center"
                    value={row.time}
                    onChange={e =>
                      handleInputChange(row.id, "time", e.target.value)
                    }
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

      {/* Footer */}
      <div className="footer-buttons">
        <button className="action-btn save">Save Changes and Exit</button>
        <button className="action-btn export">Export Current Table</button>
        <button className="action-btn exit">Exit without Saving</button>
      </div>
    </div>
  );
}
