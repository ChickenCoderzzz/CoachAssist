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
    isSavingPlayer
}) {
    return (
        <div className="player-modal-overlay">
            <div className="player-modal">

                {/* Header */}
                <div className="player-modal-header">
                    #{selectedPlayer?.jersey_number} {selectedPlayer?.player_name}
                    {" - "}
                    {POSITION_LABELS[selectedPlayer?.position] || selectedPlayer?.position}
                </div>

                {/* Body */}
                <div className="player-modal-body">

                    {/* LEFT SIDE - NOTES. Added by Wences Jacob Lorenzo */}
                    <div className="player-notes-wrapper">

                        <div className="player-observations-title">
                            Player Observations
                        </div>

                        <div className="player-notes-container">

                            {/* Table Header */}
                            <div className="notes-header">
                                <div>Observation</div>
                                <div>Time</div>
                                <div></div>
                            </div>

                            {/* Table Body */}
                            <div className="notes-body">
                                {playerNotes.map((row) => (
                                    <div className="notes-row" key={row.id}>

                                        {/* Observation */}
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

                                        {/* Time */}
                                        <input
                                            value={row.time}
                                            onChange={(e) =>
                                                updatePlayerNote(row.id, "time", e.target.value)
                                            }
                                        />

                                        {/* Delete */}
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

                            {/* Add Row */}
                            <button
                                className="add-row-btn"
                                onClick={addPlayerNoteRow}
                            >
                                Add Row +
                            </button>

                        </div>
                    </div>

                    {/* RIGHT SIDE - STATS */}
                    <div className="player-stats-container">

                        {/* GENERAL */}
                        <div className="player-stats-section">
                            <div className="player-stats-title">General</div>

                            <div className="stats-grid">
                                {UNIVERSAL_STATS.map(stat => (
                                    <div key={stat} className="stat-field">
                                        <label>
                                            {stat
                                                .replace(/_/g, " ")
                                                .replace(/\b\w/g, c => c.toUpperCase())}
                                        </label>
                                        <input
                                            type="number"
                                            value={playerStats[stat] || 0}
                                            onChange={(e) =>
                                                setPlayerStats({
                                                    ...playerStats,
                                                    [stat]: parseInt(e.target.value) || 0
                                                })
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* POSITION GROUPS */}
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
                                                    {stat
                                                        .replace(/_/g, " ")
                                                        .replace(/\b\w/g, c => c.toUpperCase())}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={playerStats[stat] || 0}
                                                    onChange={(e) =>
                                                        setPlayerStats({
                                                            ...playerStats,
                                                            [stat]: parseInt(e.target.value) || 0
                                                        })
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }

                    </div>

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
