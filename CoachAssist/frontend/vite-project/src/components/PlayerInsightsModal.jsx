import React from "react";
import { POSITION_LABELS, UNIVERSAL_STATS, POSITION_GROUPS } from "../constants/gameConstants";

export default function PlayerInsightsModal({
    selectedPlayer,
    playerStats,
    setPlayerStats,
    playerNotes,
    updatePlayerNote,
    addPlayerNoteRow,
    deletePlayerNoteRow,
    savePlayerInsights,
    cancelPlayerModal,
    isSavingPlayer,
    videoRef
}) {

    const [activeView, setActiveView] = React.useState("insights"); // View control
    const [selectedQuarter, setSelectedQuarter] = React.useState("Q1");

    //Quarter handling
    const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "overall"];
    const isOverall = selectedQuarter === "overall";

    //Overall stats
    const computedOverall = Object.values(playerStats || {}).reduce((acc, quarterStats) => {
        if (!quarterStats) return acc;

        Object.entries(quarterStats).forEach(([key, value]) => {
            if (typeof value === "number") {
                acc[key] = (acc[key] || 0) + value;
            }
        });

        return acc;
    }, {});

    return (
        <div className="player-modal-overlay">
            <div className="player-modal">

                {/* Header */}
                <div className="player-modal-header">
                    #{selectedPlayer?.jersey_number} {selectedPlayer?.player_name}
                    {" - "}
                    {POSITION_LABELS[selectedPlayer?.position] || selectedPlayer?.position}
                </div>

                {/*  BUTTONS BELOW HEADER */}
                <div className="player-modal-tabs">
                    <button
                        className="tab-button"
                        onClick={() => setActiveView("insights")}
                    >
                        Player Insights
                    </button>

                    <button
                        className="tab-button"
                        onClick={() => setActiveView("metrics")}
                    >
                        Metrics
                    </button>

                </div>

                {/* Body */}
                <div className="player-modal-body">

                    {/* ================= INSIGHTS ================= */}
                    {/* Structural update */}
                    {activeView === "insights" && (
                        <div className="player-notes-wrapper">

                            <div className="player-observations-title">
                                Player Observations
                            </div>

                            <div className="player-notes-container">

                                <div className="notes-scroll-container">

                                    <div className="notes-header">
                                        <div>Observation</div>
                                        <div>Time</div>
                                        <div>Quarter</div>
                                        <div>Play</div>
                                        <div></div>
                                    </div>

                                    <div className="notes-body">
                                        {playerNotes.map((row) => (
                                            <div className="notes-row" key={row.id}>

                                                <div className="note-cell">
                                                    <input
                                                        value={row.note}
                                                        onChange={(e) =>
                                                            updatePlayerNote(row.id, "note", e.target.value)
                                                        }
                                                    />
                                                    {row.note && (
                                                        <span className="note-tooltip">
                                                            {row.note}
                                                        </span>
                                                    )}
                                                </div>

                                                <input
                                                    value={row.time}
                                                    onChange={(e) =>
                                                        updatePlayerNote(row.id, "time", e.target.value)
                                                    }
                                                />

                                                <select
                                                    value={row.quarter || ""}
                                                    onChange={(e) =>
                                                        updatePlayerNote(row.id, "quarter", e.target.value)
                                                    }
                                                >
                                                    <option value="">Select</option>
                                                    <option value="Q1">Q1</option>
                                                    <option value="Q2">Q2</option>
                                                    <option value="Q3">Q3</option>
                                                    <option value="Q4">Q4</option>
                                                </select>

                                                <div>
                                                    <button
                                                        className="play-row-btn"
                                                        onClick={() => {
                                                            if (videoRef?.current && row.time) {
                                                                const parts = row.time.split(":");
                                                                const seconds =
                                                                    parts.length === 2
                                                                        ? parseInt(parts[0]) * 60 + parseInt(parts[1])
                                                                        : parseInt(row.time);

                                                                videoRef.current.currentTime = seconds || 0;
                                                                videoRef.current.play();
                                                            }
                                                        }}
                                                    >
                                                        ▶
                                                    </button>
                                                </div>

                                                <div className="delete-cell">
                                                    <button
                                                        className="delete-btn"
                                                        onClick={() => deletePlayerNoteRow(row.id)}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                            </div>
                                        ))}
                                    </div>

                                </div>

                                <button
                                    className="add-row-btn"
                                    onClick={addPlayerNoteRow}
                                >
                                    Add Row +
                                </button>

                            </div>
                        </div>
                    )}

                    {/* ================= METRICS ================= */}
                    {activeView === "metrics" && (
                        <div className="player-stats-container">

                            <div className="quarter-selector" style={{ marginBottom: "10px" }}>
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

                            <div className="player-stats-section">
                                <div className="player-stats-title">General</div>

                                <div className="stats-grid">
                                    {UNIVERSAL_STATS.map(stat => (
                                        <div key={stat} className="stat-field">
                                            <label>
                                                {stat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                            </label>
                                            {/*Universal stat input*/}
                                            <input
                                                type="number"
                                                value={
                                                    isOverall
                                                        ? computedOverall[stat] || 0
                                                        : playerStats[selectedQuarter]?.[stat] || 0
                                                }
                                                onChange={(e) => {
                                                    if (isOverall) return;

                                                    setPlayerStats({
                                                        ...playerStats,
                                                        [selectedQuarter]: {
                                                            ...(playerStats[selectedQuarter] || {}),
                                                            [stat]: parseInt(e.target.value) || 0
                                                        }
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {POSITION_GROUPS[selectedPlayer?.position] &&
                                Object.entries(
                                    POSITION_GROUPS[selectedPlayer.position]
                                ).map(([groupName, stats]) => (
                                    <div key={groupName} className="player-stats-section">
                                        <div className="player-stats-title">
                                            {groupName}
                                        </div>

                                        <div className="stats-grid">
                                            {stats.map(stat => (
                                                <div key={stat} className="stat-field">
                                                    <label>
                                                        {stat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                                    </label>
                                                    {/*Position group stats */}
                                                    <input
                                                        type="number"
                                                        value={
                                                            isOverall
                                                                ? computedOverall[stat] || 0
                                                                : playerStats[selectedQuarter]?.[stat] || 0
                                                        }
                                                        onChange={(e) => {
                                                            if (isOverall) return;

                                                            setPlayerStats({
                                                                ...playerStats,
                                                                [selectedQuarter]: {
                                                                    ...(playerStats[selectedQuarter] || {}),
                                                                    [stat]: parseInt(e.target.value) || 0
                                                                }
                                                            });
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            }

                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="player-modal-footer two-btn">
                    <button
                        className="action-btn save"
                        onClick={savePlayerInsights}
                        disabled={isSavingPlayer}
                    >
                        {isSavingPlayer ? "Saving..." : "Save & Close"}
                    </button>

                    <button
                        className="action-btn danger"
                        onClick={cancelPlayerModal}
                        disabled={isSavingPlayer}
                    >
                        Exit without Saving
                    </button>
                </div>
            </div>
        </div>
    );
}