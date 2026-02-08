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
  const [videoList, setVideoList] = useState([]);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [loadingVideos, setLoadingVideos] = useState(true);
  const videoRef = useRef(null);

  // Auth token from localStorage
  const token = localStorage.getItem("token");

  // Fetch videos from backend
  const fetchVideos = async () => {
    if (!token) return;

    try {
      const res = await fetch("/videos", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        console.error("Failed to fetch videos", await res.text());
        return;
      }

      const videos = await res.json();
      setVideoList(videos);

      // Load the first video if exists
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

  // Table input handler
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

  // Register a YouTube video
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
          "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ youtube_id: youtubeInput, filename: "Game Film" })
    });

if (!res.ok) {
    let errorDetail = "";
    const text = await res.text(); // Read body once
    try {
        const data = JSON.parse(text); // Try parse as JSON
        errorDetail = data.detail || JSON.stringify(data);
    } catch {
        errorDetail = text; // fallback to raw text
    }
    alert(`Failed to register video: ${errorDetail} (Status ${res.status})`);
    console.error("Failed to register video", errorDetail);
    return;
}

    const newVideo = await res.json();
    setVideoList(prev => [newVideo, ...prev]);
    setVideoSrc(newVideo.playback_url);
    setVideoName(newVideo.filename);
    alert("Video added successfully!");
  } catch (err) {
    alert("Error adding YouTube video:\n" + err);
  }
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
        {/* Video Column */}
        <div className="video-column">
            {/*upload button*/}
          <div className="video-upload-wrapper">
            <button className="action-btn" onClick={handleYouTubeVideo}>
              Add YouTube Video
            </button>
            {videoName && <span className="video-name">{videoName}</span>}
          </div>

          {/*fetch button*/}
            <div className="video-upload-wrapper">
            <button className="action-btn" onClick={fetchVideos}>
            Fetch YouTube Video
            </button>
            {videoName && <span className="video-name">{videoName}</span>}
            </div>

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
              <div className="video-placeholder">
                Upload a video to begin analysis
              </div>
            )}
          </div>

          {/* Video list selection */}
          {videoList.length > 1 && (
            <div className="video-list">
              {videoList.map(v => (
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
