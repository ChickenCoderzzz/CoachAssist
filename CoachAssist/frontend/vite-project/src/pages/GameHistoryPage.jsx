import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/game_history.css";
import OverallBarChart from "../components/visualizations/OverallBarChart";
import OverallPieChart from "../components/visualizations/OverallPieChart";
import OverallRadarChart from "../components/visualizations/OverallRadarChart";
import SingleStatLineChart from "../components/visualizations/SingleStatLineChart";
import SingleStatBarChart from "../components/visualizations/SingleStatBarChart";
import ExpandableChart from "../components/visualizations/ExpandableCharts";

export default function GameHistoryPage() {
const { teamId } = useParams();
const navigate = useNavigate();

/* STAT KEYS (ALWAYS SHOW) */
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

const [matches, setMatches] = useState([]);
const [loading, setLoading] = useState(true);

//Viewing States - Wences Jacob Lorenzo
const [activeView, setActiveView] = useState("table");
const [selectedGame, setSelectedGame] = useState(null);
const [gameNotes, setGameNotes] = useState({});
const [gameMetrics, setGameMetrics] = useState({});
const [modalTab, setModalTab] = useState("notes");
const [expandedGames, setExpandedGames] = useState({});
const [selectedQuarter, setSelectedQuarter] = useState("All");

//Data visualization states - Wences Jacob Lorenzo
const [vizMode, setVizMode] = useState("overall");
const [vizChart, setVizChart] = useState("bar");
const [valueMode, setValueMode] = useState("total");
const [compareMode, setCompareMode] = useState("team"); 

//Game and quarter states - Wences Jacob Lorenzo
const [selectedGameIds, setSelectedGameIds] = useState([]);
const [selectedQuartersViz, setSelectedQuartersViz] = useState([]);

//Stat select states - Wences Jacob Lorenzo
const [selectedStats, setSelectedStats] = useState(allStatKeys);
const [progressStats, setProgressStats] = useState(allStatKeys.slice(0,3));

//Dropdown States - Wences Jacob Lorenzo
const [showGameDropdown, setShowGameDropdown] = useState(false);
const [showStatDropdown, setShowStatDropdown] = useState(false);
const [showQuarterDropdown, setShowQuarterDropdown] = useState(false);

const gameDropdownRef = useRef(null);
const statDropdownRef = useRef(null);
const quarterDropdownRef = useRef(null);

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

//Auto select games - Wences Jacob Lorenzo
useEffect(() => {
    setSelectedGameIds(matches.map(m => m.id));
}, [matches]);

//Chart safety logic - Wences Jacob Lorenzo
useEffect(() => {
    if (
        vizMode !== "overall" &&
        (vizChart === "pie" || vizChart === "radar")
    ) {
        setVizChart("bar");
    }
}, [vizMode]);

useEffect(() => {
    const handleClick = (e) => {

        if (
            gameDropdownRef.current &&
            !gameDropdownRef.current.contains(e.target)
        ) {
            setShowGameDropdown(false);
        }

        if (
            statDropdownRef.current &&
            !statDropdownRef.current.contains(e.target)
        ) {
            setShowStatDropdown(false);
        }

        if (
            quarterDropdownRef.current &&
            !quarterDropdownRef.current.contains(e.target)
        ) {
            setShowQuarterDropdown(false);
        }
    };

    //Click-outside dropdown handling - Wences Jacob Lorenzo
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
}, []);

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

//Stat formatter - Wences Jacob Lorenzo
const formatStat = (stat) =>
    stat.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.game_date) - new Date(b.game_date)
);

const safeQuarters = selectedQuartersViz || [];

//Filter games - Wences Jacob Lorenzo
const filteredGames = sortedMatches.filter(g =>
    selectedGameIds.includes(g.id)
);

//Build quarter level stat rows - Wences Jacob Lorenzo
const filteredStats = filteredGames.flatMap(g => {
    const metrics = g.metrics || {};

    return Object.entries(metrics)
        .filter(([key]) => key.startsWith("Q"))
        .filter(([q]) =>
            safeQuarters.length === 0 || safeQuarters.includes(q)
        )
        .map(([q, stats]) => {

            const base = {
                game_id: g.id,
                opponent: g.opponent,
                date: g.game_date,
                quarter: q
            };

            return { ...base, ...stats };
        });
});

//Calculate totals for stats - Wences Jacob Lorenzo
const totals = {};
let count = filteredStats.length;

filteredStats.forEach(row => {
    allStatKeys.forEach(stat => {

    // TEAM
    totals[stat] = (totals[stat] || 0) + (row[stat] || 0);

    // OPPONENT
    totals[`opp_${stat}`] =
        (totals[`opp_${stat}`] || 0) + (row[`opp_${stat}`] || 0);
});
});

if (valueMode === "average" && count > 0) {
    allStatKeys.forEach(stat => {
        totals[stat] = totals[stat] / count;

        //  Opponent average
        totals[`opp_${stat}`] =
            totals[`opp_${stat}`] / count;
    });
}

//Calculate overall data
const overallData = selectedStats.flatMap(stat => {

    if (compareMode === "both") {
        return [
            {
                stat: `${formatStat(stat)} (Team)`,
                value: totals[stat] || 0
            },
            {
                stat: `${formatStat(stat)} (Opp)`,
                value: totals[`opp_${stat}`] || 0
            }
        ];
    }

    const key = compareMode === "opponent"
        ? `opp_${stat}`
        : stat;

    return [{
        stat: formatStat(stat),
        value: totals[key] || 0
    }];
});

//Retrieve data per game
const perGameData = filteredGames.map(game => {

    const statsForGame = filteredStats.filter(s => s.game_id === game.id);

    const row = {
        game: game.opponent,
        date: game.game_date
    };

    const divisor = statsForGame.length;

    progressStats.forEach((stat, i) => {
        const teamTotal = statsForGame.reduce(
            (sum, s) => sum + (s[stat] || 0),
            0
        );

        const oppTotal = statsForGame.reduce(
            (sum, s) => sum + (s[`opp_${stat}`] || 0),
            0
        );

        row[stat] =
            valueMode === "average" && statsForGame.length > 0
                ? teamTotal / statsForGame.length
                : teamTotal;

        row[`opp_${stat}`] =
            valueMode === "average" && statsForGame.length > 0
                ? oppTotal / statsForGame.length
                : oppTotal;
            });

    return row;
});

//Retrieve data per quarter
const perQuarterData = ["Q1","Q2","Q3","Q4"]
.filter(q => safeQuarters.length === 0 || safeQuarters.includes(q))
.map(q => {

    const statsForQuarter = filteredStats.filter(s => s.quarter === q);

    const row = { game: q };

    const divisor = statsForQuarter.length;

    progressStats.forEach((stat) => {
        const teamTotal = statsForQuarter.reduce(
            (sum, s) => sum + (s[stat] || 0),
            0
        );

        const oppTotal = statsForQuarter.reduce(
            (sum, s) => sum + (s[`opp_${stat}`] || 0),
            0
        );

        row[stat] =
            valueMode === "average" && statsForQuarter.length > 0
                ? teamTotal / statsForQuarter.length
                : teamTotal;

        row[`opp_${stat}`] =
            valueMode === "average" && statsForQuarter.length > 0
                ? oppTotal / statsForQuarter.length
                : oppTotal;
    });

        return row;
    });

//Access game modal
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
            <button className={activeView === "visualizations" ? "active" : ""} onClick={() => setActiveView("visualizations")}>
                Data Visualizations
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

        {/* ================= VISUALIZATIONS ================= */}
        {activeView === "visualizations" && (

        <div style={{ width: "100%", padding: "20px" }}>

            <h2>Game Visualizations ({valueMode === "average" ? "Average" : "Total"})</h2>

            {/* GAME SELECTOR */}
            <div className="dropdown" ref={gameDropdownRef}>
                <div
                    className="dropdown-toggle"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowGameDropdown(prev => !prev);
                    }}
                >
                    Select Games ▼ ({selectedGameIds.length})
                </div>

                {showGameDropdown && (
                    <div className="dropdown-menu">
                        {sortedMatches.map(game => (
                            <label key={game.id} className="dropdown-item">
                                <input
                                    type="checkbox"
                                    checked={selectedGameIds.includes(game.id)}
                                    onChange={() => {
                                        if (selectedGameIds.includes(game.id)) {
                                            setSelectedGameIds(selectedGameIds.filter(id => id !== game.id));
                                        } else {
                                            setSelectedGameIds([...selectedGameIds, game.id]);
                                        }
                                    }}
                                />
                                {game.opponent} ({formatDate(game.game_date)})
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* MODE */}
            <div className="viz-controls">
                <button
                    className={vizMode === "overall" ? "active-btn" : ""}
                    onClick={() => setVizMode("overall")}
                >
                    Overall
                </button>

                <button
                    className={vizMode === "progress" ? "active-btn" : ""}
                    onClick={() => setVizMode("progress")}
                >
                    Stat Progress
                </button>

                <button
                    className={vizMode === "quarterly" ? "active-btn" : ""}
                    onClick={() => setVizMode("quarterly")}
                >
                    Quarterly
                </button>
            </div>


            {/* VALUE MODE */}
            <div className="viz-controls">
                <button
                    className={valueMode === "total" ? "active-btn green" : ""}
                    onClick={() => setValueMode("total")}
                >
                    Total
                </button>

                <button
                    className={valueMode === "average" ? "active-btn yellow" : ""}
                    onClick={() => setValueMode("average")}
    >
        Average
    </button>
</div>


{/* TEAM / OPPONENT */}
<div className="viz-controls">
    <button
        className={compareMode === "team" ? "active-btn green" : ""}
        onClick={() => setCompareMode("team")}
    >
        Team
    </button>

    <button
        className={compareMode === "opponent" ? "active-btn yellow" : ""}
        onClick={() => setCompareMode("opponent")}
    >
        Opponent
    </button>

    {vizChart !== "radar" && (
        <button
            className={compareMode === "both" ? "active-btn dual" : ""}
            onClick={() => setCompareMode("both")}
        >
            Both
        </button>
    )}
</div>


{/* CHART TYPE */}
<div className="viz-controls">
    <button
        className={vizChart === "bar" ? "active-btn" : ""}
        onClick={() => setVizChart("bar")}
    >
        Bar
    </button>

    {(vizMode === "progress" || vizMode === "quarterly") && (
        <button
            className={vizChart === "line" ? "active-btn" : ""}
            onClick={() => setVizChart("line")}
        >
            Line
        </button>
    )}

    {vizMode === "overall" && (
        <>
            <button
                className={vizChart === "pie" ? "active-btn" : ""}
                onClick={() => setVizChart("pie")}
            >
                Pie
            </button>

            <button
                className={vizChart === "radar" ? "active-btn" : ""}
                onClick={() => setVizChart("radar")}
            >
                Radar
            </button>
        </>
    )}
</div>

            {/* STAT SELECTOR */}
            <div className="dropdown" ref={statDropdownRef}>
                <div
                    className="dropdown-toggle"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowStatDropdown(prev => !prev);
                    }}
                >
                    {vizMode === "overall" ? "Select Stats" : "Select Stats for Chart ▼"}
                </div>

                {showStatDropdown && (
                    <div className="dropdown-menu">
                        {allStatKeys.map(stat => {
                            const activeList =
                                vizMode === "overall" ? selectedStats : progressStats;

                            return (
                                <label key={stat} className="dropdown-item">
                                    <input
                                        type="checkbox"
                                        checked={activeList.includes(stat)}
                                        onChange={() => {
                                            if (vizMode === "overall") {
                                                if (selectedStats.includes(stat)) {
                                                    if (selectedStats.length === 1) return;
                                                    setSelectedStats(selectedStats.filter(s => s !== stat));
                                                } else {
                                                    setSelectedStats([...selectedStats, stat]);
                                                }
                                            } else {
                                                if (progressStats.includes(stat)) {
                                                    if (progressStats.length === 1) return;
                                                    setProgressStats(progressStats.filter(s => s !== stat));
                                                } else {
                                                    setProgressStats([...progressStats, stat]);
                                                }
                                            }
                                        }}
                                    />
                                    {formatStat(stat)}
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* QUARTERS */}
            <div className="dropdown" ref={quarterDropdownRef}>
                <div
                    className="dropdown-toggle"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowQuarterDropdown(prev => !prev);
                    }}
                >
                    Select Quarters ▼ ({selectedQuartersViz.length || "All"})
                </div>

                {showQuarterDropdown && (
                    <div className="dropdown-menu">
                        {["Q1","Q2","Q3","Q4"].map(q => (
                            <label key={q} className="dropdown-item">
                                <input
                                    type="checkbox"
                                    checked={selectedQuartersViz.includes(q)}
                                    onChange={() => {
                                        if (selectedQuartersViz.includes(q)) {
                                            setSelectedQuartersViz(selectedQuartersViz.filter(x => x !== q));
                                        } else {
                                            setSelectedQuartersViz([...selectedQuartersViz, q]);
                                        }
                                    }}
                                />
                                {q}
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* CHART */}
            {vizMode === "overall" && (
                <div className="chart-wrapper">
                    <ExpandableChart>
                        {vizChart === "bar" && (
                        <OverallBarChart
                            data={overallData}
                            useComparisonColors={true}
                            compareMode={compareMode}
                        />
                        )}

                        {vizChart === "pie" && (
                        <OverallPieChart
                            data={overallData}
                            useComparisonColors={true}
                            compareMode={compareMode}
                        />
                        )}

                        {vizChart === "radar" && (
                        <OverallRadarChart
                            data={overallData}
                            useComparisonColors={true}
                            compareMode={compareMode}
                        />
                        )}
                    </ExpandableChart>
                </div>
            )}

            {(vizMode === "progress" || vizMode === "quarterly") && (
                <div className="chart-wrapper">
                    <ExpandableChart>
                        {vizChart === "bar" && (
                            <SingleStatBarChart
                                data={vizMode === "quarterly" ? perQuarterData : perGameData}
                                stats={
                                    compareMode === "both"
                                        ? progressStats.flatMap(s => [
                                            s,
                                            `opp_${s}`
                                        ])
                                        : compareMode === "opponent"
                                            ? progressStats.map(s => `opp_${s}`)
                                            : progressStats
                                }
                                useComparisonColors={true}
                                compareMode={compareMode}
                            />
                        )}

                        {vizChart === "line" && (
                           <SingleStatLineChart
                                data={vizMode === "quarterly" ? perQuarterData : perGameData}
                                stats={
                                    compareMode === "both"
                                        ? progressStats.flatMap(s => [
                                            s,
                                            `opp_${s}`
                                        ])
                                        : compareMode === "opponent"
                                            ? progressStats.map(s => `opp_${s}`)
                                            : progressStats
                                }
                                useComparisonColors={true}
                                compareMode={compareMode}
                            />
                        )}
                    </ExpandableChart>
                </div>
            )}

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

