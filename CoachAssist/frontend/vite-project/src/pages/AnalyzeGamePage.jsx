import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/analyze_game.css";
import "../styles/teams.css";
import { INITIAL_DATA, POSITION_LABELS, getFullPositionName } from "../constants/gameConstants";
import PlayerInsightsModal from "../components/PlayerInsightsModal";
import VideoTable from "../components/VideoTable";
import ClipVideoModal from "../components/ClipVideoModal";
import useVideos from "../hooks/useVideos";
import usePlayerInsights from "../hooks/usePlayerInsights";

// Helper to convert time to seconds for sorting
const timeToSeconds = (t) => {
    if (!t) return 0;
    if (t.includes(':')) {
        const parts = t.split(':');
        return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }
    return parseInt(t, 10) || 0;
};

const getThirdDownPct = (conv, att) => {
    if (!att) return "0%";
    return ((conv / att) * 100).toFixed(0) + "%";
};

const getColor = (team, opp, inverse = false) => {
    if (team === opp) return "white";
    if (inverse) return team < opp ? "#4caf50" : "#f44336";
    return team > opp ? "#4caf50" : "#f44336";
};

export default function AnalyzeGamePage() {
    const { teamId, matchId } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("Game State");

    const [gameView, setGameView] = useState("state"); 
    const [selectedQuarter, setSelectedQuarter] = useState("Q1");

    const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "overall"];

    const METRIC_FIELDS = [
        { key: "points", label: "Points" },
        { key: "total_yards", label: "Total Yards" },
        { key: "turnovers", label: "Turnovers" },
        { key: "penalties", label: "Penalties" },
        { key: "penalty_yards", label: "Penalty Yards" },
        { key: "third_down_conversions", label: "3rd Down Conversions" },
        { key: "third_down_attempts", label: "3rd Down Attempts" },
        { key: "time_of_possession", label: "Time of Possession" }
];

const [gameMetrics, setGameMetrics] = useState({});
    // Main state holding all data
    const [allTableData, setAllTableData] = useState(INITIAL_DATA);

    // Player Table State
    const [players, setPlayers] = useState([]); //Holds players for selected unit

    // Player Insights (extracted to hook)
    const {
        selectedPlayer, showPlayerModal, playerStats, setPlayerStats,
        playerNotes, isSavingPlayer,
        openPlayerModal, savePlayerInsights, cancelPlayerModal,
        updatePlayerNote, addPlayerNoteRow, deletePlayerNoteRow
    } = usePlayerInsights(matchId);

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

    // Fetch Match Details & Game State
    useEffect(() => {
        if (matchId) {
            // Fetch Match Details
            fetch(`/teams/matches/${matchId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            })
                .then((res) => res.json())
                .then((data) => {
                    // Backend returns nested structure directly
                    //Edited by Wences Jacob Lorenzo
                    if (data) {
                        Object.keys(data).forEach(tab => {
                            if (Array.isArray(data[tab])) {

                                //  Ensure every row has a quarter field
                                data[tab] = data[tab].map(row => ({
                                    ...row,
                                    text: row.text || row.note || row.observation || "",  // 🔥 FIX
                                    quarter: row.quarter || ""
                                }));

                                //  Keep your existing sorting
                                data[tab].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
                            }
                        });

                        setAllTableData(data);
                    }
                });
            fetch(`/games/${matchId}/metrics`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            })
                .then(res => res.json())
                .then(data => {
                    if (data?.metrics) {
                        setGameMetrics(data.metrics);
                    }
                });
        }
    }, [matchId]);

    // Fetch Players for Offensive / Defensive / Special tabs
    // Added by Wences Jacob Lorenzo
    useEffect(() => {
        let unit = null;

        if (activeTab === "Offensive") unit = "offense";
        if (activeTab === "Defensive") unit = "defense";
        if (activeTab === "Special") unit = "special";


        //If not a player-based tab, do nothing
        if (!unit) return;

        fetch(`/teams/${teamId}/players?unit=${unit}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
            .then(res => res.json())
            .then(data => {
                console.log("ANALYZE PLAYERS:", data);

                //  STEP 1: ONLY ACTIVE PLAYERS
                const activePlayers = (data || []).filter(p => p.is_active);

                //  STEP 2: GROUP BY athlete_id
                const uniquePlayersMap = {};

                activePlayers.forEach((p) => {
                    const key = p.athlete_id;

                    if (!uniquePlayersMap[key]) {
                        uniquePlayersMap[key] = p;
                    }
                });

                const uniquePlayers = Object.values(uniquePlayersMap);

                //  STEP 3: SORT (same logic as before)
                const sorted = uniquePlayers.sort((a, b) => {
                    if ((b.is_priority ? 1 : 0) !== (a.is_priority ? 1 : 0)) {
                        return (b.is_priority ? 1 : 0) - (a.is_priority ? 1 : 0);
                    }
                    return a.id - b.id;
                });

                setPlayers(sorted);
            });
    }, [activeTab, teamId]);

    // PRIORITY TOGGLE (Game Analysis Page)
    // Allows users to adjust player priority directly while analyzing game footage.
    // Updates backend and re-sorts players immediately.
    const togglePriority = async (player) => {
        try {
            const res = await fetch(`/teams/players/${player.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    player_name: player.player_name,
                    jersey_number: Number(player.jersey_number),
                    position: player.position,
                    is_priority: !player.is_priority,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update priority");
            }

            setPlayers((prevPlayers) => {
                const updated = prevPlayers.map((p) =>
                    p.id === player.id
                        ? { ...p, is_priority: !p.is_priority }
                        : p
                );

                return updated.sort((a, b) => {
                    if ((b.is_priority ? 1 : 0) !== (a.is_priority ? 1 : 0)) {
                        return (b.is_priority ? 1 : 0) - (a.is_priority ? 1 : 0);
                    }
                    return a.id - b.id;
                });
            });
        } catch (error) {
            console.error("Error updating priority:", error);
            alert("Unable to update player priority.");
        }
    };

    // Update Match Details
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

    // Helper to format time string
    const formatTime = (input) => {
        if (!input) return "";

        // If it already has a colon, try to normalize it
        if (input.includes(":")) {
            const parts = input.split(":");
            if (parts.length === 2) {
                const m = parseInt(parts[0], 10) || 0;
                const s = parseInt(parts[1], 10) || 0;
                return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            return input;
        }

        // If it's just numbers, treat as seconds
        const totalSeconds = parseInt(input, 10);
        if (!isNaN(totalSeconds)) {
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        return input;
    };

    const handleTimeBlur = (id, value) => {
        let formatted = formatTime(value);

        if (videoRef?.current?.duration && !isNaN(videoRef.current.duration)) {
            let totalSeconds = 0;
            if (formatted.includes(":")) {
                const parts = formatted.split(":");
                totalSeconds = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
            } else {
                totalSeconds = parseInt(formatted, 10) || 0;
            }

            const maxDuration = Math.floor(videoRef.current.duration);
            if (totalSeconds > maxDuration) {
                alert("Timestamp cannot exceed the video duration.");
                const m = Math.floor(maxDuration / 60);
                const s = maxDuration % 60;
                formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        }

        // Update the value AND sort the array so rows naturally order by timestamp
        setAllTableData(prevData => {
            const currentList = prevData[activeTab] || [];
            const updatedList = currentList.map(row => {
                if (row.id === id) {
                    return { ...row, time: formatted };
                }
                return row;
            });

            updatedList.sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));

            return {
                ...prevData,
                [activeTab]: updatedList
            };
        });
    };

    // Video logic (extracted to hook)
    const {
        videoList, videoSrc, videoName, videoRef,
        uploading, clipTarget,
        upscaleJobs,
        setVideoSrc, setVideoName,
        handleVideoUpload, handleDeleteVideo,
        handleRenameVideo,
        openClipModal, closeClipModal, handleClipVideo,
        handleUpscaleVideo, handleUpscaleClick
    } = useVideos(teamId, matchId);





    // Handle table input
    const handleInputChange = (id, field, value) => {
        if (field === "time") {
            if (!/^[0-9:]*$/.test(value)) return;
            if (value.length > 5) return;
        }

        setAllTableData(prevData => {
            const currentList = prevData[activeTab] || [];
            const updatedList = currentList.map(row => {
                if (row.id === id) {
                    return { ...row, [field]: value };
                }
                return row;
            });

            return {
                ...prevData,
                [activeTab]: updatedList
            };
        });
    };

    // Logic to add a new row
    const handleAddRow = () => {
        const newRow = { id: Date.now(), text: "", time: "", quarter: "" }; //Edit by Wences Jacob Lorenzo

        setAllTableData(prevData => {
            const currentList = prevData[activeTab] || [];
            return {
                ...prevData,
                [activeTab]: [...currentList, newRow]
            };
        });
    };

    const handleDeleteRow = (id) => {
        setAllTableData(prevData => {
            const currentList = prevData[activeTab] || [];

            return {
                ...prevData,
                [activeTab]: currentList.filter(row => row.id !== id)
            };
        });
    };

    // Determine current table data from state
    const currentTableData = allTableData[activeTab] || [];

    // Determine header title
    let tableHeaderTitle = "";
    switch (activeTab) {
        case "Game State":
            tableHeaderTitle = "Game State Table - General";
            break;
        case "Offensive":
            tableHeaderTitle = "Game State Table - Offensive";
            break;
        case "Defensive":
            tableHeaderTitle = "Game State Table - Defensive";
            break;
        case "Special":
            tableHeaderTitle = "Game State Table - Special";
            break;
        case "Videos":
            tableHeaderTitle = "Game State Table - Videos";
            break;
        default:
            tableHeaderTitle = "Game State Table";
    }

    const handleSave = () => {

        //  VALIDATION 
        for (const tab in allTableData) {
            const rows = allTableData[tab];

            if (Array.isArray(rows)) {
                for (const row of rows) {
                    if (!row.quarter) {
                        alert("All insights must have a quarter (Q1–Q4) before saving.");
                        return; // STOP saving completely
                    }
                }
            }
        }

        fetch(`/games/${matchId}/metrics`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
                metrics: gameMetrics
            }),
        });

        // Quick final sort before saving to ensure everything is perfect
        const finalData = { ...allTableData };
        Object.keys(finalData).forEach(tab => {
            if (Array.isArray(finalData[tab])) {
                finalData[tab].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
            }
        });

        fetch(`/games/${matchId}/state`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(finalData),
        })
            .then((res) => {
                if (res.ok) {
                    // Navigate back on success
                    navigate(`/team/${teamId}`);
                } else {
                    alert("Failed to save changes.");
                }
            });
    };

    const handleExport = () => {
        const unitMap = {
            Offensive: "offense",
            Defensive: "defense",
            Special: "special"
        };

        const unit = unitMap[activeTab];
        if (!unit) {
            alert("PDF export is only available for Offensive, Defensive, and Special tabs.");
            return;
        }

        fetch(`/teams/${teamId}/players/export/pdf?unit=${unit}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || "Export failed");
                }

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `team_${teamId}_${unit}_players.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch((err) => {
                console.error("Export failed:", err);
                alert("Failed to export PDF.");
            });
    };

    const handleExit = () => {
        setShowExitConfirm(true);
    };

    const confirmExit = () => {
        navigate(`/team/${teamId}`);
    };


    // FILTER PLAYERS BY UNIT
    const filteredPlayers = players.filter(player => {
        if (activeTab === "Offensive") return player.unit === "offense";
        if (activeTab === "Defensive") return player.unit === "defense";
        if (activeTab === "Special") return player.unit === "special";
        return false;
    });


    return (
        <div className="analyze-game-container">
            {/* Header */}
            <div className="analyze-header" style={{ flexDirection: 'column', height: 'auto', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {teamId && (
                            <button
                                className="add-team-btn"
                                onClick={() => navigate(`/team/${teamId}`)}
                                style={{ margin: 0, padding: '8px 16px', fontSize: '14px' }}
                            >
                                ← Back to Games
                            </button>
                        )}
                        <div className="analyze-title tutorial-analyze-title" style={{ margin: 0, fontSize: '24px' }}>
                            {match ? `${match.name} vs ${match.opponent}` : "Analyze Game"}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Video Upload Logic */}
                        <div className="video-upload-wrapper">
                            <input
                                type="file"
                                accept="video/*"
                                id="video-upload"
                                style={{ display: "none" }}
                                onChange={handleVideoUpload}
                                disabled={uploading}
                            />
                            {uploading && <div>Uploading... ⏳</div>}
                            <button
                                className="add-team-btn"
                                onClick={() => document.getElementById("video-upload").click()}
                                style={{ margin: 0, padding: '8px 16px', fontSize: '14px' }}
                            >
                                Upload Video
                            </button>
                            {videoName && <span className="video-name" style={{ marginLeft: '10px', fontSize: '14px' }}>{videoName}</span>}
                        </div>

                        {match && (
                            <button
                                className="add-team-btn"
                                onClick={() => setShowEdit(true)}
                                style={{ margin: 0, padding: '8px 16px', fontSize: '14px' }}
                            >
                                Edit Game Details
                            </button>
                        )}
                    </div>
                </div>

                <div className="analyze-tabs" style={{ alignSelf: 'flex-start' }}>
                    <button
                        className="tab-button"
                        style={activeTab === "Game State" ? { transform: "translate(2px, 2px)", boxShadow: "none" } : {}}
                        onClick={() => setActiveTab("Game State")}
                    >
                        Game State
                    </button>
                    <button
                        className="tab-button"
                        style={activeTab === "Offensive" ? { transform: "translate(2px, 2px)", boxShadow: "none" } : {}}
                        onClick={() => setActiveTab("Offensive")}
                    >
                        Offensive
                    </button>
                    <button
                        className="tab-button"
                        style={activeTab === "Defensive" ? { transform: "translate(2px, 2px)", boxShadow: "none" } : {}}
                        onClick={() => setActiveTab("Defensive")}
                    >
                        Defensive
                    </button>
                    <button
                        className="tab-button"
                        style={activeTab === "Special" ? { transform: "translate(2px, 2px)", boxShadow: "none" } : {}}
                        onClick={() => setActiveTab("Special")}
                    >
                        Special
                    </button>
                    <button
                        className="tab-button"
                        style={activeTab === "Videos" ? { transform: "translate(2px, 2px)", boxShadow: "none" } : {}}
                        onClick={() => setActiveTab("Videos")}
                    >
                        Videos
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="analyze-content">
                {/* LEFT COLUMN */}
                <div className="video-column">
                    {/* Video Player Section */}
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

                {/* RIGHT COLUMN */}
                <div className="table-column">
                    {/* Game View Toggle */}
                    {activeTab === "Game State" && (
                        <div className="game-view-toggle">
                            <button
                                className="tab-button"
                                style={gameView === "state" ? { transform: "translate(2px,2px)", boxShadow: "none" } : {}}
                                onClick={() => setGameView("state")}
                            >
                                Game State Table
                            </button>

                            <button
                                className="tab-button"
                                style={gameView === "metrics" ? { transform: "translate(2px,2px)", boxShadow: "none" } : {}}
                                onClick={() => setGameView("metrics")}
                            >
                                Quantitative Metrics
                            </button>
                        </div>
                    )}

                    {/* Table */}
                    {activeTab === "Videos" ? (
                        <VideoTable
                            videoList={videoList}
                            setVideoSrc={setVideoSrc}
                            setVideoName={setVideoName}
                            handleDeleteVideo={handleDeleteVideo}
                            handleClipVideo={openClipModal}
                            handleRenameVideo={handleRenameVideo}
                            handleUpscaleVideo={handleUpscaleVideo}
                            handleUpscaleClick={handleUpscaleClick}
                            upscaleJobs={upscaleJobs}
                        />
                    ) : activeTab === "Game State" && gameView === "state" ? (

                        // ORIGINAL GAME STATE TABLE (unchanged)
                        <div className="game-state-table-container">
                            <div className="table-title-header">{tableHeaderTitle}</div>

                            {/*Edited by Wences Jacob Lorenzo*/}
                            <div className="table-header-row">
                                <div className="cell col-obs">Observation</div>
                                <div className="cell col-time">Time</div>
                                <div className="cell col-quarter">Quarter</div>
                                <div className="cell col-play">Play</div>
                                <div className="cell col-delete"></div> {/* NEW */}
                                <div className="scrollbar-spacer"></div>
                            </div>

                            <div className="table-scroll-area">
                                {currentTableData.map((row) => (
                                    <div className="table-row" key={row.id}>
                                        <div className="cell col-obs">
                                            <input
                                                className="table-input"
                                                value={row.text}
                                                onChange={(e) => handleInputChange(row.id, 'text', e.target.value)}
                                            />
                                        </div>

                                        <div className="cell col-time">
                                            <input
                                                className="table-input center"
                                                value={row.time}
                                                onChange={(e) => handleInputChange(row.id, 'time', e.target.value)}
                                                onBlur={(e) => handleTimeBlur(row.id, e.target.value)}
                                            />
                                        </div>

                                        {/* NEW: Quarter dropdown. Added by Wences Jacob Lorenzo */}
                                        <div className="cell col-quarter">
                                            <select
                                                className="table-input center"
                                                value={row.quarter || ""}
                                                onChange={(e) => handleInputChange(row.id, "quarter", e.target.value)}
                                            >
                                                <option value="">Select</option>
                                                <option value="Q1">Q1</option>
                                                <option value="Q2">Q2</option>
                                                <option value="Q3">Q3</option>
                                                <option value="Q4">Q4</option>
                                            </select>
                                        </div>

                                        <div className="cell col-play">
                                            <button 
                                                className="play-row-btn"
                                                onClick={() => {
                                                    if (videoRef.current && row.time) {
                                                        videoRef.current.currentTime = timeToSeconds(row.time);
                                                        videoRef.current.play();
                                                    }
                                                }}
                                                title="Play from timestamp"
                                            >
                                                ▶
                                            </button>
                                        </div>

                                        <div className="cell col-delete">
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDeleteRow(row.id)}
                                                title="Delete row"
                                            >
                                                ✕
                                            </button>
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

                    ) : activeTab === "Game State" && gameView === "metrics" ? (

                        <div className="game-state-table-container">
                            <div className="table-title-header">
                                Game Metrics - Quantitative
                            </div>

                            {/* Quarter Selector */}
                            <div style={{ marginBottom: "10px" }}>
                                <label style={{ marginRight: "8px" }}>Quarter:</label>
                                <select
                                    value={selectedQuarter}
                                    onChange={(e) => setSelectedQuarter(e.target.value)}
                                >
                                    {QUARTERS.map(q => (
                                        <option key={q} value={q}>
                                            {q === "overall" ? "Overall Game" : q}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="metrics-container">
                                {/* Metrics Grid */}
                                <div className="stats-grid">
                                    {METRIC_FIELDS.map(({ key, label }) => {
                                        const teamVal = selectedQuarter === "overall"
                                            ? gameMetrics["overall"]?.[key] || 0
                                            : gameMetrics[selectedQuarter]?.[key] || 0;

                                        const oppKey = `opp_${key}`;
                                        const oppVal = selectedQuarter === "overall"
                                            ? gameMetrics["overall"]?.[oppKey] || 0
                                            : gameMetrics[selectedQuarter]?.[oppKey] || 0;

                                        const isInverse = ["turnovers", "penalties", "penalty_yards"].includes(key);

                                        return (
                                            <div key={key} className="stat-field">
                                                <label>{label}</label>

                                                <div className="metrics-row">

                                                    {/* TEAM */}
                                                    <div className="metrics-col">
                                                        <div className="metrics-label team">TEAM</div>

                                                        <input
                                                            type="number"
                                                            style={{ borderColor: getColor(teamVal, oppVal, isInverse) }}
                                                            value={teamVal}
                                                            onChange={(e) => {
                                                                if (selectedQuarter === "overall") return;

                                                                setGameMetrics(prev => ({
                                                                    ...prev,
                                                                    [selectedQuarter]: {
                                                                        ...(prev[selectedQuarter] || {}),
                                                                        [key]: parseInt(e.target.value) || 0
                                                                    }
                                                                }));
                                                            }}
                                                        />

                                                        {key === "third_down_conversions" && (
                                                            <div className="third-down-pct">
                                                                {`${gameMetrics[selectedQuarter]?.third_down_conversions || 0} / 
                                                                ${gameMetrics[selectedQuarter]?.third_down_attempts || 0}
                                                                (${getThirdDownPct(
                                                                    gameMetrics[selectedQuarter]?.third_down_conversions || 0,
                                                                    gameMetrics[selectedQuarter]?.third_down_attempts || 0
                                                                )})`}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* OPP */}
                                                    <div className="metrics-col">
                                                        <div className="metrics-label opp">OPP</div>

                                                        <input
                                                            type="number"
                                                            style={{ borderColor: getColor(oppVal, teamVal, isInverse) }}
                                                            value={oppVal}
                                                            onChange={(e) => {
                                                                if (selectedQuarter === "overall") return;

                                                                setGameMetrics(prev => ({
                                                                    ...prev,
                                                                    [selectedQuarter]: {
                                                                        ...(prev[selectedQuarter] || {}),
                                                                        [oppKey]: parseInt(e.target.value) || 0
                                                                    }
                                                                }));
                                                            }}
                                                        />

                                                        {key === "third_down_conversions" && (
                                                            <div className="third-down-pct">
                                                                {`${gameMetrics[selectedQuarter]?.opp_third_down_conversions || 0} / 
                                                                ${gameMetrics[selectedQuarter]?.opp_third_down_attempts || 0}
                                                                (${getThirdDownPct(
                                                                    gameMetrics[selectedQuarter]?.opp_third_down_conversions || 0,
                                                                    gameMetrics[selectedQuarter]?.opp_third_down_attempts || 0
                                                                )})`}
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    ) : (

                        // PLAYER TABLE REPLACES GAME STATE TABLE
                        <div className="game-state-table-container analysis-side-table">
                            {/* Dynamic header color based on unit */}
                            <div
                                className={`table-title-header ${activeTab === "Offensive"
                                    ? "offense"
                                    : activeTab === "Defensive"
                                        ? "defense"
                                        : activeTab === "Special"
                                            ? "special"
                                            : ""
                                    }`}
                            >
                                Player Table - {activeTab}
                            </div>

                            <div className="table-header-row analysis-player-header">
                                <div className="cell col-player-number">#</div>
                                <div className="cell col-player-name">Name</div>
                                <div className="cell col-player-position">Position</div>
                                <div className="cell col-player-priority">★</div>
                                <div className="cell col-player-action">Action</div>
                            </div>

                            <div className="table-scroll-area analysis-alt-table-scroll">
                                {filteredPlayers.length > 0 ? filteredPlayers.map((player) => (
                                    <div className="table-row analysis-player-row" key={player.id}>
                                        <div className="cell col-player-number">{player.jersey_number}</div>
                                        <div className="cell col-player-name">{player.player_name}</div>
                                        <div className="cell col-player-position">{getFullPositionName(player.position)}</div>

                                        <div className="cell col-player-priority">
                                            <button
                                                className={`priority-star ${player.is_priority ? "active" : ""}`}
                                                title={player.is_priority ? "Remove Priority" : "Mark as Priority"}
                                                onClick={() => togglePriority(player)}
                                            >
                                                {player.is_priority ? "★" : "☆"}
                                            </button>
                                        </div>

                                        <div className="cell col-player-action">
                                            <button
                                                className="player-view-btn"
                                                onClick={() => openPlayerModal(player)}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="table-row analysis-player-row">
                                        <div className="cell col-empty">No players found for this unit</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    )}

                </div>

                {/* Footer Buttons */}
                <div className="footer-buttons">
                    <button className="action-btn save" onClick={handleSave}>
                        Save Changes and Exit
                    </button>
                    <button className="action-btn export tutorial-export-btn" onClick={handleExport}>
                        Export Current Table
                    </button>
                    <button className="action-btn exit" onClick={handleExit}>
                        Exit without Saving
                    </button>
                </div>

                {/* Edit Game Modal */}
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

                {/* Exit Confirm Modal */}
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
                            <button
                                className="confirm-cancel"
                                onClick={() => setShowExitConfirm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Player Insights Modal */}
                {showPlayerModal && (
                    <PlayerInsightsModal
                        selectedPlayer={selectedPlayer}
                        playerStats={playerStats}
                        setPlayerStats={setPlayerStats}
                        playerNotes={playerNotes}
                        updatePlayerNote={updatePlayerNote}
                        addPlayerNoteRow={addPlayerNoteRow}
                        deletePlayerNoteRow={deletePlayerNoteRow}
                        savePlayerInsights={savePlayerInsights}
                        cancelPlayerModal={cancelPlayerModal}
                        isSavingPlayer={isSavingPlayer}
                        videoRef={videoRef}
                    />
                )}

                {/* Clip Video Modal */}
                {clipTarget && (
                    <ClipVideoModal
                        video={clipTarget}
                        onSave={handleClipVideo}
                        onDiscard={closeClipModal}
                    />
                )}
            </div>
        </div>
    );
}
