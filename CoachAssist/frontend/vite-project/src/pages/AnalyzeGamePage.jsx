import React, { useState } from "react";
import "../styles/analyze_game.css";

// Initial data structure
const INITIAL_DATA = {
    "Game State": [
        { id: 1, text: "Their quarterback...", time: "XX:XX" },
        { id: 2, text: "Our left tackle...", time: "XX:XX" },
        { id: 3, text: "Their wide receiver...", time: "XX:XX" },
        { id: 4, text: "General observation 1...", time: "XX:XX" },
        { id: 5, text: "General observation 2...", time: "XX:XX" },
        { id: 6, text: "", time: "" },
    ],
    "Offensive": [
        { id: 1, text: "Offensive Line shift...", time: "10:00" },
        { id: 2, text: "QB pocket presence...", time: "12:30" },
        { id: 3, text: "WR route running...", time: "14:15" },
        { id: 4, text: "", time: "" },
    ],
    "Defensive": [
        { id: 1, text: "Missed tackle LB...", time: "05:45" },
        { id: 2, text: "Safety coverage...", time: "08:20" },
        { id: 3, text: "D-Line pressure...", time: "11:10" },
        { id: 4, text: "", time: "" },
    ],
    "Special": [
        { id: 1, text: "Kickoff return coverage...", time: "00:05" },
        { id: 2, text: "Punt block attempt...", time: "12:00" },
        { id: 3, text: "Field goal range...", time: "04:30" },
        { id: 4, text: "", time: "" },
    ]
};

export default function AnalyzeGamePage() {
    const [activeTab, setActiveTab] = useState("Game State");
    // Main state holding all data
    const [allTableData, setAllTableData] = useState(INITIAL_DATA);

    // Helper to update specific cell
    const handleInputChange = (id, field, value) => {
        // Validation for Time field: allow only digits and ':'
        if (field === 'time') {
            const isValid = /^[0-9:]*$/.test(value);
            if (!isValid) return; // Ignore invalid characters
            if (value.length > 5) return; // Max length check (e.g. 12:34)
        }

        setAllTableData(prevData => {
            const currentList = prevData[activeTab];
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
            const currentList = prevData[activeTab];
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
        default:
            tableHeaderTitle = "Game State Table";
    }

    const handleSave = () => {
        console.log("Save Changes and Exit clicked. Data:", allTableData);
    };

    const handleExport = () => {
        console.log("Export Current Table clicked for:", activeTab);
    };

    const handleExit = () => {
        console.log("Exit without Saving clicked");
    };

    return (
        <div className="analyze-game-container">
            {/* Header */}
            <div className="analyze-header">
                <div className="analyze-title">Analyze Game</div>
                <div className="analyze-tabs">
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
                </div>
            </div>

            {/* Main Content */}
            <div className="analyze-content">
                {/* Video Player Area */}
                <div className="video-player-section">
                    <div className="video-placeholder">
                        {/* Visual simulation of a video player */}
                        <div style={{ width: "100%", height: "100%", backgroundColor: "#555", position: "relative" }}>
                            <div style={{
                                width: "100%", height: "100%",
                                background: "linear-gradient(45deg, #3a3a3a 25%, #444 25%, #444 50%, #3a3a3a 50%, #3a3a3a 75%, #444 75%, #444 100%)",
                                backgroundSize: "20px 20px"
                            }}></div>

                            <div className="play-button-overlay">
                                <div className="play-icon"></div>
                            </div>

                            {/* Controls Bar */}
                            <div className="video-controls">
                                <span className="control-icon">▶</span>
                                <span className="control-icon">||</span>
                                <div className="progress-bar">
                                    <div className="progress-fill"></div>
                                </div>
                                <span className="control-icon">🔊</span>
                                <span className="control-icon">⚙</span>
                                <span className="control-icon">⛶</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Game State Table Area (Flex Grid) */}
                <div className="game-state-table-container">
                    <div className="table-title-header">{tableHeaderTitle}</div>

                    {/* Header Row */}
                    <div className="table-header-row">
                        <div className="cell col-obs">Observation</div>
                        <div className="cell col-time">Time</div>
                        {/* Spacer to align with scrollbar in body */}
                        <div className="scrollbar-spacer"></div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="table-scroll-area">
                        {currentTableData.map((row) => (
                            <div className="table-row" key={row.id}>
                                <div className="cell col-obs">
                                    <input
                                        className="table-input"
                                        value={row.text}
                                        onChange={(e) => handleInputChange(row.id, 'text', e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                                <div className="cell col-time">
                                    <input
                                        className="table-input center"
                                        value={row.time}
                                        onChange={(e) => handleInputChange(row.id, 'time', e.target.value)}
                                        placeholder="00:00"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fixed Footer for Add Row Button */}
                    <div className="table-footer-row">
                        <div className="add-btn-cell">
                            <button className="add-row-btn" onClick={handleAddRow}>
                                Add Row +
                            </button>
                        </div>
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
        </div>
    );
}
