import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/game_history.css";

export default function GameHistoryPage() {
const { teamId } = useParams();
const navigate = useNavigate();


const [matches, setMatches] = useState([]);
const [loading, setLoading] = useState(true);

const [activeView, setActiveView] = useState("table");
const [selectedGame, setSelectedGame] = useState(null);
const [gameNotes, setGameNotes] = useState({});
const [gameMetrics, setGameMetrics] = useState({});
const [modalTab, setModalTab] = useState("notes");
const [expandedGames, setExpandedGames] = useState({});
const [selectedQuarter, setSelectedQuarter] = useState("All");

useEffect(() => {
    fetch(`/teams/${teamId}/matches`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
        .then((res) => res.json())
        .then((data) => {
            setMatches(data.matches || []);
            setLoading(false);
        })
        .catch(() => setLoading(false));
}, [teamId]);

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
};

const getResult = (teamScore, opponentScore) => {
    if (teamScore == null || opponentScore == null) return "—";
    if (teamScore > opponentScore) return "W";
    if (teamScore < opponentScore) return "L";
    return "T";
};

const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.game_date) - new Date(b.game_date)
);

/* ✅ FIXED STAT KEYS (ALWAYS SHOW) */
const allStatKeys = [
    "points",
    "total_yards",
    "turnovers",
    "penalties",
    "penalty_yards",
    "third_down_conversions",
    "third_down_attempts",
    "time_of_possession"
];

const openGameModal = async (match) => {
    setSelectedGame(match);
    setModalTab("notes");
    setSelectedQuarter("All");

    try {
        const [notesRes, metricsRes] = await Promise.all([
            fetch(`/games/${match.id}/state`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            }),
            fetch(`/games/${match.id}/metrics`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            }),
        ]);

        setGameNotes(await notesRes.json());
        setGameMetrics((await metricsRes.json())?.metrics || {});
    } catch (err) {
        console.error(err);
    }
};

/* ===== NOTES ===== */

const flattenNotes = () => Object.values(gameNotes).flat();

const getFilteredNotes = () => {
    const all = flattenNotes();
    if (selectedQuarter === "All") return all;

    return all.filter(n =>
        n.quarter === selectedQuarter ||
        n.quarter === selectedQuarter.replace("Q","")
    );
};

/* ===== METRICS ===== */

const formatStat = (stat) =>
    stat.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

const getFilteredMetrics = () => {
    if (selectedQuarter === "All") return gameMetrics;
    return { [selectedQuarter]: gameMetrics[selectedQuarter] || {} };
};

const statGroups = {
    General: ["points", "turnovers", "penalties"],
    Yardage: ["total_yards", "penalty_yards"],
    Downs: ["third_down_conversions", "third_down_attempts"],
    Possession: ["time_of_possession"]
};

const calculateTotalsAndAverages = () => {
    const filtered = getFilteredMetrics();

    const teamTotals = {};
    const oppTotals = {};
    const counts = {};

    Object.values(filtered).forEach(qStats => {
        Object.entries(qStats || {}).forEach(([key, val]) => {
            if (["id","game_id","quarter","created_at"].includes(key)) return;

            if (key.startsWith("opp_")) {
                const cleanKey = key.replace("opp_","");
                oppTotals[cleanKey] = (oppTotals[cleanKey] || 0) + (val || 0);
            } else {
                teamTotals[key] = (teamTotals[key] || 0) + (val || 0);
                counts[key] = (counts[key] || 0) + 1;
            }
        });
    });

    const teamAvg = {};
    const oppAvg = {};

    Object.keys(teamTotals).forEach(key => {
        teamAvg[key] = counts[key]
            ? (teamTotals[key] / counts[key]).toFixed(2)
            : "0.00";

        oppAvg[key] = counts[key]
            ? (oppTotals[key] / counts[key]).toFixed(2)
            : "0.00";
    });

    return { teamTotals, teamAvg, oppTotals, oppAvg };
};

if (loading) {
    return <p style={{ paddingTop: "110px" }}>Loading…</p>;
}

return (
    <div className="game-history-page">

        {/* HEADER */}
        <div className="game-history-header">
            <h1>Game History</h1>
            <button className="go-back-btn" onClick={() => navigate(`/team/${teamId}`)}>
                Go Back
            </button>
        </div>

        {/* TOGGLE */}
        <div className="history-view-toggle">
            <button className={activeView === "table" ? "active" : ""} onClick={() => setActiveView("table")}>
                Game Table
            </button>
            <button className={activeView === "stats" ? "active" : ""} onClick={() => setActiveView("stats")}>
                All Game Stats
            </button>
        </div>

        {/* ================= GAME TABLE ================= */}
        {activeView === "table" && (
            <div className="game-history-table-wrapper">
                <table className="game-history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Opponent</th>
                            <th>Home</th>
                            <th>Away</th>
                            <th>W/L</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMatches.map(match => {
                            const result = getResult(match.team_score, match.opponent_score);
                            return (
                                <tr key={match.id}>
                                    <td>{formatDate(match.game_date)}</td>
                                    <td>{match.opponent}</td>
                                    <td>{match.team_score ?? "—"}</td>
                                    <td>{match.opponent_score ?? "—"}</td>
                                    <td>{result}</td>
                                    <td>
                                        <button className="view-game-btn" onClick={() => openGameModal(match)}>
                                            View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {/* ================= ALL GAME STATS ================= */}
        {activeView === "stats" && (
            <div className="game-history-table-wrapper">
                <table className="game-history-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Date</th>
                            <th>Opponent</th>
                            <th>Score</th>
                            {allStatKeys.map(stat => <th key={stat}>{formatStat(stat)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMatches.map(match => {
                            const metrics = match.metrics || {};
                            const overall = metrics.overall || {};
                            const totalCols = 4 + allStatKeys.length;

                            return (
                                <React.Fragment key={match.id}>

                                    <tr>
                                        <td>
                                            <button className="expand-btn"
                                                onClick={() =>
                                                    setExpandedGames(prev => ({
                                                        ...prev,
                                                        [match.id]: !prev[match.id]
                                                    }))
                                                }>
                                                {expandedGames[match.id] ? "−" : "+"}
                                            </button>
                                        </td>

                                        <td>{formatDate(match.game_date)}</td>
                                        <td>{match.opponent}</td>
                                        <td>{match.team_score ?? 0} - {match.opponent_score ?? 0}</td>

                                        {allStatKeys.map(stat => (
                                            <td key={stat}>{overall[stat] ?? 0}</td>
                                        ))}
                                    </tr>

                                    {expandedGames[match.id] &&
                                        ["Q1","Q2","Q3","Q4"].map(q => (
                                            <tr className="expanded-row" key={q}>
                                                <td colSpan={4}>{q}</td>
                                                {allStatKeys.map(stat => (
                                                    <td key={stat}>{metrics[q]?.[stat] ?? 0}</td>
                                                ))}
                                            </tr>
                                        ))
                                    }

                                    {expandedGames[match.id] && (
                                        <tr className="opponent-section-row">
                                            <td colSpan={totalCols}>Opponent Stats</td>
                                        </tr>
                                    )}

                                    {expandedGames[match.id] && (
                                        <tr className="expanded-row opponent-row">
                                            <td colSpan={4}>Overall</td>
                                            {allStatKeys.map(stat => (
                                                <td key={stat}>{overall[`opp_${stat}`] ?? 0}</td>
                                            ))}
                                        </tr>
                                    )}

                                    {expandedGames[match.id] &&
                                        ["Q1","Q2","Q3","Q4"].map(q => (
                                            <tr className="expanded-row opponent-row" key={`opp-${q}`}>
                                                <td colSpan={4}>{q}</td>
                                                {allStatKeys.map(stat => (
                                                    <td key={stat}>{metrics[q]?.[`opp_${stat}`] ?? 0}</td>
                                                ))}
                                            </tr>
                                        ))
                                    }

                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {/* ================= MODAL ================= */}
        {selectedGame && (
            <div className="modal-overlay">
                <div className="modal-card large">

                    <h2>{selectedGame.opponent} ({formatDate(selectedGame.game_date)})</h2>

                    <div className="modal-tabs">
                        <button className={modalTab==="notes"?"active-tab":""} onClick={()=>setModalTab("notes")}>Notes</button>
                        <button className={modalTab==="metrics"?"active-tab":""} onClick={()=>setModalTab("metrics")}>Metrics</button>
                    </div>

                    <div className="quarter-filter">
                        <label>Quarter: </label>
                        <select value={selectedQuarter} onChange={(e)=>setSelectedQuarter(e.target.value)}>
                            <option value="All">All</option>
                            <option value="Q1">Q1</option>
                            <option value="Q2">Q2</option>
                            <option value="Q3">Q3</option>
                            <option value="Q4">Q4</option>
                        </select>
                    </div>

                    <div className="modal-content">

                        {modalTab === "notes" && (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Quarter</th>
                                        <th>Time</th>
                                        <th>Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getFilteredNotes().map((n,i)=>(
                                        <tr key={i}>
                                            <td>{n.quarter}</td>
                                            <td>{n.time}</td>
                                            <td>{n.text}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {modalTab === "metrics" && (() => {
                            const { teamTotals, teamAvg, oppTotals, oppAvg } = calculateTotalsAndAverages();

                            return (
                                <div>
                                    {Object.entries(statGroups).map(([group,keys])=>(
                                        <div key={group} className="metric-section">
                                            <h3>{group}</h3>
                                            {keys.map(stat=>(
                                                <div key={stat} className="metric-row">
                                                    <span>{formatStat(stat)}</span>

                                                    <span className="metric-values">
                                                        <div className="team-value">
                                                            Team: {teamTotals[stat] || 0} (Avg {teamAvg[stat]})
                                                        </div>
                                                        <div className="opp-value">
                                                            Opponent: {oppTotals[stat] || 0} (Avg {oppAvg[stat]})
                                                        </div>
                                                    </span>

                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                    </div>

                    <button className="close-btn" onClick={()=>setSelectedGame(null)}>
                        Close
                    </button>

                </div>
            </div>
        )}

    </div>
);


}

