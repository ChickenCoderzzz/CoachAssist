import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/analyze_game.css";
import "../styles/teams.css";
import { INITIAL_DATA, POSITION_LABELS, getFullPositionName } from "../constants/gameConstants";
import PlayerInsightsModal from "../components/PlayerInsightsModal";
import VideoTable from "../components/VideoTable";
import useVideos from "../hooks/useVideos";
import usePlayerInsights from "../hooks/usePlayerInsights";

export default function AnalyzeGamePage() {
    const { teamId, matchId } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("Game State");
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
                    if (data) {
                        setAllTableData(data);
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


        //videos tab, added by Peter Van Vooren
        if (activeTab === "Videos") {
            fetchVideos();
            setPlayers(videoList);
        }

        //If not a player-based tab, do nothing
        if (!unit) return;

        fetch(`/teams/${teamId}/players?unit=${unit}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
            .then(res => res.json())
            .then(data => setPlayers(data || []));
    }, [activeTab, teamId]);


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
        const formatted = formatTime(value);
        if (formatted !== value) {
            handleInputChange(id, 'time', formatted);
        }
    };

    // Video logic (extracted to hook)
    const {
        videoList, videoSrc, videoName, videoRef,
        setVideoSrc, setVideoName,
        fetchVideos, handleVideoUpload, handleDeleteVideo
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
        const newRow = { id: Date.now(), text: "", time: "" };

        setAllTableData(prevData => {
            const currentList = prevData[activeTab] || [];
            return {
                ...prevData,
                [activeTab]: [...currentList, newRow]
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
        fetch(`/games/${matchId}/state`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(allTableData),
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
        console.log("Export Current Table clicked for:", activeTab);
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
                        <div className="analyze-title" style={{ margin: 0, fontSize: '24px' }}>
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
                            />
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
                {/* Table */}
                {activeTab === "Videos" ? (
                    <VideoTable
                        videoList={videoList}
                        setVideoSrc={setVideoSrc}
                        setVideoName={setVideoName}
                        handleDeleteVideo={handleDeleteVideo}
                    />
                ) : activeTab === "Game State" ? (

                    // ORIGINAL GAME STATE TABLE (unchanged)
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
                                </div>
                            ))}
                        </div>

                        <div className="table-footer-row">
                            <button className="add-row-btn" onClick={handleAddRow}>
                                Add Row +
                            </button>
                        </div>
                    </div>

                ) : (

                    // PLAYER TABLE REPLACES GAME STATE TABLE
                    <div className="game-state-table-container player-table">
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

                        {/* Table header row */}
                        <div className="player-table-header">
                            <div>#</div>
                            <div>Name</div>
                            <div>Position</div>
                            <div>Action</div>
                        </div>

                        {/* Player rows.*/}
                        <div className="player-table-body">
                            {filteredPlayers.map((player) => (
                                <div className="player-table-row" key={player.id}>
                                    <div>{player.jersey_number}</div>
                                    <div>{player.player_name}</div>
                                    <div>{getFullPositionName(player.position)}</div>

                                    {/* Open modal */}
                                    <div>
                                        <button
                                            className="player-view-btn"
                                            onClick={() => openPlayerModal(player)}
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                )}

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
                />
            )}

        </div>
    );
}
