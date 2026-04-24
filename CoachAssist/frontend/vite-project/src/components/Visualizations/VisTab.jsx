// React hook for component state management
import { useState, useEffect } from "react";

// Import stat definitions
import { POSITION_GROUPS, UNIVERSAL_STATS } from "../../constants/gameConstants";

// Chart components
import OverallBarChart from "./OverallBarChart";
import OverallPieChart from "./OverallPieChart";
import OverallRadarChart from "./OverallRadarChart";
import SingleStatLineChart from "./SingleStatLineChart";
import SingleStatBarChart from "./SingleStatBarChart";
import ExpandableChart from "./ExpandableCharts";

/*
NORMALIZATION GROUPS

These determine how radar stats
are normalized.

Per Snap:
Stats scaled by playtime.

Ceiling:
Stats scaled by expected max.
*/

const SNAP_NORMALIZED_STATS = [
  "pass_attempts",
  "pass_completions",
  "rush_attempts",
  "snaps_played"
];

const CEILING_NORMALIZED_STATS = [
  "passing_yards",
  "passing_tds",
  "rushing_yards",
  "rushing_tds",
  "touchdowns",
  "turnovers",
  "interceptions_thrown",
  "penalties"
];

/* 
   RADAR STAT CEILINGS

Used to normalize radar values so different stat types scale properly.
*/

const STAT_CEILINGS = {

  passing_yards: 400,
  pass_attempts: 50,
  pass_completions: 40,
  passing_tds: 6,

  rush_attempts: 25,
  rushing_yards: 200,
  rushing_tds: 4,

  interceptions_thrown: 3,

  touchdowns: 6,
  turnovers: 3,

  penalties: 5,
  snaps_played: 80

};

// Convert stat keys like passing_yards to Passing Yards
function formatLabel(key) {
    return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function VisualizationsTab({
    historyData,
    selectedGameIds,
    selectedQuarters,
    selectedPlayer
}) {

const safeQuarters = selectedQuarters || [];

    /* STATE */

    const [overallChart, setOverallChart] = useState("bar");
    const [singleChart, setSingleChart] = useState("line");

    // Stats selected for progress comparison (max 5)
    const [progressStats, setProgressStats] = useState([]);
    const [viewMode, setViewMode] = useState("overall");

    //Total and average toggle states
    const [valueMode, setValueMode] = useState("total"); // "total" | "average"

    // Dropdown control
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [progressDropdownOpen, setProgressDropdownOpen] = useState(false);

    // Stats selected for overall charts
    const [selectedStats, setSelectedStats] = useState([]);

    // Track which stat preset is active
    const [activeStatSet, setActiveStatSet] = useState(null);

    if (!selectedPlayer) return null;

    /* DETERMINE PLAYER STAT SET*/

    const positionGroups = POSITION_GROUPS[selectedPlayer.position] || {};

    const allowedStats = [
        ...UNIVERSAL_STATS,
        ...Object.values(positionGroups).flat()
    ];

    /*
    SET DEFAULT STATS ON PLAYER CHANGE

    When switching players:
    • Reset overall stats → Performance Based Stats
    • Reset single stat → Snaps Played
    • DO NOT reset chart type selections
    */

    useEffect(() => {
        if (allowedStats.length > 0) {

            /*
            Default Overall Stats

            When switching players, reset the Overall Stats view to performance based stats.
            */

            const performanceStats = allowedStats.filter(stat =>
                !["snaps_played", "penalties", "turnovers"].includes(stat)
            );

            setSelectedStats(performanceStats);
            setActiveStatSet("performance");

            /*
            Default Stat Progress

            When switching players, reset the Stat Progress view to the Top 5 stats based on total production.
            */

            const statTotals = {};

            (historyData?.stats_by_game || []).forEach(s => {
                allowedStats.forEach(stat => {
                    statTotals[stat] = (statTotals[stat] || 0) + (s[stat] || 0);
                });
            });

            const top5 = [...allowedStats]
                .map(stat => ({
                    stat,
                    value: statTotals[stat] || 0
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5)
                .map(x => x.stat);
            setProgressStats(top5);
        }
    }, [selectedPlayer, historyData]);

    /* FILTER SELECTED GAMES*/

    const filteredStats = historyData.stats_by_game.filter(stat =>
        selectedGameIds.includes(stat.game_id) &&
        (safeQuarters.length === 0 || safeQuarters.includes(stat.quarter))
    );

    /* BUILD TOTALS*/

    const totals = {};
    let count = filteredStats.length;

    filteredStats.forEach(game => {
        allowedStats.forEach(stat => {
            totals[stat] = (totals[stat] || 0) + (game[stat] || 0);
        });
    });

    // Convert to average if needed
    if (valueMode === "average" && count > 0) {
        allowedStats.forEach(stat => {
            totals[stat] = totals[stat] / count;
        });
    }

    /*BUILD DATA FOR BAR & PIE CHARTS*/

    const overallData = selectedStats.map(stat => ({
    stat: formatLabel(stat),
    value: totals[stat] || 0
    }));

    /* 
    BUILD RADAR DATA (NORMALIZED)

    Radar charts normalize stats to a 0–100 scale so different stat types can be compared visually.
    Volume stats are normalized per snap to avoid penalizing players with fewer plays on the field.
    */

    const radarData = selectedStats.map(stat => {

    const raw = filteredStats.reduce(
        (sum, s) => sum + (s[stat] || 0),
        0
    );

    let score;
    let normalizationType;

    /*SNAP BASED NORMALIZATION*/

    if (SNAP_NORMALIZED_STATS.includes(stat)) {

        const snaps = totals["snaps_played"] || 1;

        score = Math.min(
        (raw / snaps) * 100,
        100
        );

        normalizationType = "Per Snap";

    }

    /* CEILING NORMALIZATION*/

    else {

        const ceiling = STAT_CEILINGS[stat] || 100;

        score = Math.min(
        (raw / ceiling) * 100,
        100
        );

        normalizationType = "Ceiling";

    }

    return {

        stat: formatLabel(stat),

        rawValue: raw,

        value: score,

        normalizationType

    };

    });

    /*PER GAME DATA*/

    const perGameData = historyData.games
    .filter(g => selectedGameIds.includes(g.id))
    .sort((a, b) => new Date(a.game_date) - new Date(b.game_date))
    .map(game => {

        const statsForGame = historyData.stats_by_game.filter(
            s =>
                s.game_id === game.id &&
                (safeQuarters.length === 0 || safeQuarters.includes(s.quarter))
        );

        const stats = {};

        statsForGame.forEach(qStat => {
            allowedStats.forEach(stat => {
                stats[stat] = (stats[stat] || 0) + (qStat[stat] || 0);
            });
        });

        const row = {
        game: game.opponent,
        date: game.game_date
        };

        // Add selected progress stats dynamically
        const divisor = statsForGame.length;

        progressStats.forEach(stat => {
        const total = stats[stat] || 0;

        row[stat] =
            valueMode === "average" && divisor > 0
            ? total / divisor
            : total;
        });

        return row;

    });

    const perQuarterData = ["Q1", "Q2", "Q3", "Q4"]
        .filter(q => safeQuarters.length === 0 || safeQuarters.includes(q))
        .map(q => {

            const statsForQuarter = historyData.stats_by_game.filter(
                stat =>
                    selectedGameIds.includes(stat.game_id) &&
                    (safeQuarters.length === 0 || stat.quarter === q)
            );

            const row = {
            game: q
            };

            const divisor = statsForQuarter.length;

            progressStats.forEach(statKey => {
            const total = statsForQuarter.reduce(
                (sum, s) => sum + (s[statKey] || 0),
                0
            );

            row[statKey] =
                valueMode === "average" && divisor > 0
                ? total / divisor
                : total;
            });

            return row;
     });

    /*STAT SET FUNCTIONS*/

    function selectPerformance() {

        /*Filter out non-performance stats to get performance-based stats*/
        const filtered = allowedStats.filter(stat =>
            !["snaps_played", "penalties", "turnovers"].includes(stat)
        );

        setSelectedStats(filtered);
        setActiveStatSet("performance");

    }

    /*Select alls stats*/
    function selectAll() {
        setSelectedStats([...allowedStats]);
        setActiveStatSet("all");

    }

    /*Select Top 5 stats*/
    function selectTop5() {

        const top = [...allowedStats]
            .map(stat => ({ stat, value: totals[stat] || 0 }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map(x => x.stat);

        setSelectedStats(top);
        setActiveStatSet("top5");

    }

    /*Deselect all stats*/
    function deselectAll() {

        setSelectedStats([]);
        setActiveStatSet(null);

    }

    /*Toggle player stat*/
    function toggleStat(stat) {

        setActiveStatSet(null);

        if (selectedStats.includes(stat)) {

            setSelectedStats(
                selectedStats.filter(s => s !== stat)
            );

        } else {

            setSelectedStats([
                ...selectedStats,
                stat
            ]);

        }

    }

    /*Get top 5 progress stats*/
    function selectTop5Progress() {

        const top = [...allowedStats]
            .map(stat => ({ stat, value: totals[stat] || 0 }))
            .sort((a,b) => b.value - a.value)
            .slice(0,5)
            .map(x => x.stat);

        setProgressStats(top);

        }

    /*Deselect all individual stats*/
    function deselectAllProgress() {
        setProgressStats([]);
    }

    /*Toggle individual stat*/
    function toggleProgressStat(stat) {

    if (progressStats.includes(stat)) {

        setProgressStats(
        progressStats.filter(s => s !== stat)
        );

    } else {

        // limit to 5 stats
        if (progressStats.length >= 5) return;

        setProgressStats([
        ...progressStats,
        stat
        ]);

    }

    }

    return (

        <div>

            {/*VIEW MODE TOGGLE*/}

            <div className="visualization-mode-toggle">

                <button
                    className={viewMode === "overall" ? "active-tab" : ""}
                    onClick={() => setViewMode("overall")}
                >
                    Overall Stats
                </button>

                <button
                    className={viewMode === "single" ? "active-tab" : ""}
                    onClick={() => setViewMode("single")}
                >
                    Stat Progress
                </button>

                <button
                    className={viewMode === "quarterly" ? "active-tab" : ""}
                    onClick={() => setViewMode("quarterly")}
                >
                    Quarterly Analysis
                </button>

            </div>

            <div style={{ marginTop: "10px" }}>
                <button
                    onClick={() => setValueMode("total")}
                    style={{
                    marginRight: "8px",
                    background: valueMode === "total" ? "#e2c675" : "#f2f2f2"
                    }}
                >
                    Total
                </button>

                <button
                    onClick={() => setValueMode("average")}
                    style={{
                    background: valueMode === "average" ? "#e2c675" : "#f2f2f2"
                    }}
                >
                    Average
                </button>
                </div>

            {/*OVERALL VISUALIZATIONS*/}

            {viewMode === "overall" && (

                <>

                    <h3>
                        Overall Stat Distribution ({valueMode === "average" ? "Average" : "Total"})
                    </h3>

                    {/* STAT DROPDOWN */}

                    <div style={{ position: "relative", marginBottom: "8px" }}>

                        <button onClick={() => setDropdownOpen(!dropdownOpen)}>
                            Select Stats ▼
                        </button>

                        {dropdownOpen && (

                            <div
                                style={{
                                    position: "absolute",
                                    top: "28px",
                                    left: "0",
                                    width: "260px",
                                    background: "white",
                                    color: "black",
                                    border: "1px solid #ccc",
                                    borderRadius: "6px",
                                    padding: "12px",
                                    zIndex: 1000,
                                    maxHeight: "320px",
                                    overflowY: "auto"
                                }}
                            >

                                {/*STAT SET BUTTONS */}

                                <div style={{ marginBottom: "10px" }}>

                                    <button
                                        onClick={selectPerformance}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            marginBottom: "6px",
                                            padding: "6px",
                                            background:
                                                activeStatSet === "performance"
                                                    ? "#e2c675"
                                                    : "#f2f2f2",
                                            border: "1px solid #aaa",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Performance Based Stats
                                    </button>

                                    <button
                                        onClick={selectAll}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            marginBottom: "6px",
                                            padding: "6px",
                                            background:
                                                activeStatSet === "all"
                                                    ? "#e2c675"
                                                    : "#f2f2f2",
                                            border: "1px solid #aaa",
                                            cursor: "pointer"
                                        }}
                                    >
                                        All Stats
                                    </button>

                                    <button
                                        onClick={selectTop5}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            marginBottom: "6px",
                                            padding: "6px",
                                            background:
                                                activeStatSet === "top5"
                                                    ? "#e2c675"
                                                    : "#f2f2f2",
                                            border: "1px solid #aaa",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Top 5 Stats
                                    </button>

                                    <button
                                        onClick={deselectAll}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            padding: "6px",
                                            border: "1px solid #aaa",
                                            color: "red",
                                            background: "#fff",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Deselect All
                                    </button>

                                </div>

                                <hr />

                                {/*INDIVIDUAL STAT CHECKBOXES*/}

                                {allowedStats.map(stat => (

                                    <label
                                        key={stat}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            marginBottom: "4px"
                                        }}
                                    >

                                        <input
                                            type="checkbox"
                                            checked={selectedStats.includes(stat)}
                                            onChange={() => toggleStat(stat)}
                                        />

                                        <span>
                                            {formatLabel(stat)}
                                        </span>

                                    </label>

                                ))}

                            </div>

                        )}

                    </div>

                    {/* CHART TYPE BUTTONS */}

                    <div className="visualization-buttons">

                        <button onClick={() => setOverallChart("bar")}>
                            Bar
                        </button>

                        <button onClick={() => setOverallChart("pie")}>
                            Pie
                        </button>

                        <button onClick={() => setOverallChart("radar")}>
                            Radar
                        </button>

                    </div>

                    {/* CHART RENDER */}

                    {overallChart === "bar" &&
                        <ExpandableChart>
                        <OverallBarChart data={overallData} />
                        </ExpandableChart>
                    }

                    {overallChart === "pie" &&
                        <ExpandableChart
                            render={(expanded) => (
                                <OverallPieChart
                                data={overallData}
                                expanded={expanded}
                                />
                            )}
                            />
                    }

                    {overallChart === "radar" && (

                        <>
                            <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "6px" }}>
                                Radar chart is based on total values for consistency
                            </p>

                            <ExpandableChart
                                render={(expanded) => (
                                    <OverallRadarChart
                                        data={radarData}
                                        expanded={expanded}
                                    />
                                )}
                            />
                        </>
                    )}

                </>

            )}

            {/*SINGLE STAT VISUALIZATIONS*/}

            {(viewMode === "single" || viewMode === "quarterly") && (

                <>

                    {/*STAT PROGRESS VISUALIZATIONS*/}

                        <>

                            <h3 style={{ marginTop: 40 }}>
                                {viewMode === "quarterly"
                                    ? `Quarterly Analysis (${valueMode === "average" ? "Average" : "Total"})`
                                    : `Stat Progress (${valueMode === "average" ? "Average" : "Total"})`}
                            </h3>

                            {/* STAT SELECTION DROPDOWN */}

                            <div style={{ position: "relative", marginBottom: "8px" }}>

                                <button onClick={() => setProgressDropdownOpen(!progressDropdownOpen)}>
                                    Select Stats ▼
                                </button>

                                {progressDropdownOpen && (

                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "28px",
                                            left: "0",
                                            width: "260px",
                                            background: "white",
                                            color: "black",
                                            border: "1px solid #ccc",
                                            borderRadius: "6px",
                                            padding: "12px",
                                            zIndex: 1000,
                                            maxHeight: "320px",
                                            overflowY: "auto"
                                        }}
                                    >

                                        {/* PRESET BUTTONS */}

                                        <div style={{ marginBottom: "10px" }}>

                                            <button
                                                onClick={selectTop5Progress}
                                                style={{
                                                    display: "block",
                                                    width: "100%",
                                                    marginBottom: "6px",
                                                    padding: "6px",
                                                    background: "#e2c675",
                                                    border: "1px solid #aaa"
                                                }}
                                            >
                                                Top 5 Stats
                                            </button>

                                            <button
                                                onClick={deselectAllProgress}
                                                style={{
                                                    display: "block",
                                                    width: "100%",
                                                    padding: "6px",
                                                    border: "1px solid #aaa",
                                                    color: "red"
                                                }}
                                            >
                                                Deselect All
                                            </button>

                                        </div>

                                        <hr />

                                        {/* STAT CHECKBOXES */}

                                        {allowedStats.map(stat => (

                                            <label
                                                key={stat}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    marginBottom: "4px"
                                                }}
                                            >

                                                <input
                                                    type="checkbox"
                                                    checked={progressStats.includes(stat)}
                                                    onChange={() => toggleProgressStat(stat)}
                                                />

                                                <span>
                                                    {formatLabel(stat)}
                                                </span>

                                            </label>

                                        ))}

                                    </div>

                                )}

                            </div>

                            {/* CHART TYPE BUTTONS */}

                            <div className="visualization-buttons">

                                <button onClick={() => setSingleChart("line")}>
                                    Line
                                </button>

                                <button onClick={() => setSingleChart("bar")}>
                                    Bar
                                </button>

                            </div>

                            {/* MULTI STAT CHARTS */}

                            {singleChart === "line" &&
                                <ExpandableChart>
                                <SingleStatLineChart
                                    data={viewMode === "quarterly" ? perQuarterData : perGameData}
                                    stats={progressStats}
                                />
                                </ExpandableChart>
                            }

                            {singleChart === "bar" &&
                                <ExpandableChart>
                                <SingleStatBarChart
                                    data={viewMode === "quarterly" ? perQuarterData : perGameData}
                                    stats={progressStats}
                                />
                                </ExpandableChart>
                            }

                        </>

                    
                </>

            )}

        </div>

    );
}