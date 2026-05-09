import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/player_analysis.css";
import { POSITION_GROUPS } from "../constants/gameConstants";

const POSITION_NAMES = {
  QB: "Quarterback",
  RB: "Running Back",
  FB: "Fullback",
  WR: "Wide Receiver",
  TE: "Tight End",
  LT: "Left Tackle",
  LG: "Left Guard",
  C: "Center",
  RG: "Right Guard",
  RT: "Right Tackle",
  DE: "Defensive End",
  DT: "Defensive Tackle",
  NT: "Nose Tackle",
  OLB: "Outside Linebacker",
  MLB: "Middle Linebacker",
  ILB: "Inside Linebacker",
  CB: "Cornerback",
  FS: "Free Safety",
  SS: "Strong Safety",
  K: "Kicker",
  P: "Punter"
};

const getUnit = (pos) => {
  if (["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"].includes(pos)) return "offense";
  if (["DE", "DT", "NT", "OLB", "MLB", "ILB", "CB", "FS", "SS"].includes(pos)) return "defense";
  if (["K", "P"].includes(pos)) return "special";
  return "other";
};

const formatAnalysisText = (text) => {
  if (!text) return [];

  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#+/g, "")
    .trim();

  return cleaned.split("\n").map((line) => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    const isHeader =
      lower.includes("summary") ||
      lower.includes("strength") ||
      lower.includes("weakness") ||
      lower.includes("improvement") ||
      lower.includes("offensive") ||
      lower.includes("defensive") ||
      lower.includes("special teams") ||
      lower.includes("turning point") ||
      lower.includes("takeaway") ||
      lower.includes("recommendation");

    const isNumbered = /^\d+\./.test(trimmed);

    return {
      text: trimmed,
      isHeader,
      isNumbered
    };
  });
};

export default function PlayerAnalysisPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [mode, setMode] = useState("analyze");

  // ================= PLAYER ANALYSIS =================
  const [unit, setUnit] = useState("offense");
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [selectedQuarters, setSelectedQuarters] = useState(["all"]);
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showQuarterDropdown, setShowQuarterDropdown] = useState(false);
  const [expandedGames, setExpandedGames] = useState({});
  const [aiResult, setAiResult] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // ================= SAVED PLAYER ANALYSIS =================
  const [savedList, setSavedList] = useState([]);
  const [selectedSaved, setSelectedSaved] = useState(null);
  const [filterUnit, setFilterUnit] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ================= GAME ANALYSIS =================
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [gameDataLoading, setGameDataLoading] = useState(false);
  const [gameDataError, setGameDataError] = useState("");
  const [selectedMatchMeta, setSelectedMatchMeta] = useState(null);
  const [selectedGameState, setSelectedGameState] = useState(null);
  const [selectedGameMetrics, setSelectedGameMetrics] = useState(null);
  const [selectedGameUnits, setSelectedGameUnits] = useState({ offense: [], defense: [], special: [] });
  const [gameAiResult, setGameAiResult] = useState(null);
  const [gameSelectedQuarters, setGameSelectedQuarters] = useState(["all"]);
  const [showGameQuarterDropdown, setShowGameQuarterDropdown] = useState(false);
  const [gameLoadingAI, setGameLoadingAI] = useState(false);
  const [gameSaveMessage, setGameSaveMessage] = useState("");
  const [comparisonGameOneId, setComparisonGameOneId] = useState("");
  const [comparisonGameTwoId, setComparisonGameTwoId] = useState("");
  const [comparisonType, setComparisonType] = useState("games");
  const [comparisonUnit, setComparisonUnit] = useState("offense");
  const [comparisonPlayers, setComparisonPlayers] = useState([]);
  const [comparisonPlayerOneId, setComparisonPlayerOneId] = useState("");
  const [comparisonPlayerTwoId, setComparisonPlayerTwoId] = useState("");
  const [comparisonGameScope, setComparisonGameScope] = useState("all");
  const [comparisonSelectedGameIds, setComparisonSelectedGameIds] = useState([]);
  const [showComparisonGameDropdown, setShowComparisonGameDropdown] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");

  // ================= SAVED GAME ANALYSIS =================
  const [savedGameList, setSavedGameList] = useState([]);
  const [selectedSavedGame, setSelectedSavedGame] = useState(null);
  const [notesModalUnit, setNotesModalUnit] = useState(null);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // ================= FETCH PLAYERS =================
  useEffect(() => {
    fetch(`/teams/${teamId}/players?unit=${unit}`, {
      headers: authHeaders,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("PLAYER ANALYSIS PLAYERS:", data);

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

        //  STEP 3: SORT (same as before)
        const sorted = uniquePlayers.sort((a, b) => {
          if ((b.is_priority ? 1 : 0) !== (a.is_priority ? 1 : 0)) {
            return (b.is_priority ? 1 : 0) - (a.is_priority ? 1 : 0);
          }
          return a.id - b.id;
        });

        setPlayers(sorted);
      });
  }, [teamId, unit]);

  useEffect(() => {
    if (mode === "saved-player") {
      fetch(`http://127.0.0.1:8000/ai/saved-player-analysis/${teamId}`, {
        headers: authHeaders,
      })
        .then((res) => res.json())
        .then((data) => {
          setSavedList(data || []);
          setSelectedSaved(null);
        });
    }
  }, [mode, teamId]);

  useEffect(() => {
    if (mode === "game" || mode === "comparison") {
      setMatchesLoading(true);
      fetch(`/teams/${teamId}/matches`, {
        headers: authHeaders,
      })
        .then((res) => res.json())
        .then((data) => setMatches(data.matches || []))
        .finally(() => setMatchesLoading(false));
    }
  }, [mode, teamId]);

  useEffect(() => {
    if (!(mode === "comparison" && comparisonType === "players")) return;

    fetch(`/teams/${teamId}/players?unit=${comparisonUnit}`, {
      headers: authHeaders,
    })
      .then((res) => res.json())
      .then((data) => {
        const activePlayers = (data || []).filter((p) => p.is_active);
        const uniquePlayersMap = {};

        activePlayers.forEach((p) => {
          const key = p.athlete_id;
          if (!uniquePlayersMap[key]) {
            uniquePlayersMap[key] = p;
          }
        });

        const uniquePlayers = Object.values(uniquePlayersMap);
        const sorted = uniquePlayers.sort((a, b) => {
          if ((b.is_priority ? 1 : 0) !== (a.is_priority ? 1 : 0)) {
            return (b.is_priority ? 1 : 0) - (a.is_priority ? 1 : 0);
          }
          return a.id - b.id;
        });

        setComparisonPlayers(sorted);
      });
  }, [mode, comparisonType, comparisonUnit, teamId]);

  useEffect(() => {
    if (mode !== "comparison") return;
    if (comparisonType !== "players") return;

    if (comparisonGameScope === "all") {
      setComparisonSelectedGameIds([]);
      return;
    }

    setComparisonSelectedGameIds(sortedMatches.map((m) => m.id));
  }, [mode, comparisonType, comparisonGameScope]);

  useEffect(() => {
    if (mode === "saved-game") {
      fetch(`http://127.0.0.1:8000/ai/saved-game-analysis/${teamId}`, {
        headers: authHeaders,
      })
        .then((res) => res.json())
        .then((data) => {
          setSavedGameList(data || []);
          setSelectedSavedGame(null);
        });
    }
  }, [mode, teamId]);

  // ================= PLAYER ANALYSIS HELPERS =================
  const analyzePlayer = async (player) => {
    setSelectedPlayer(player);

    const res = await fetch(`/players/${player.id}/history`, {
      headers: authHeaders,
    });

    const data = await res.json();
    console.log("FULL historyData:", data);
  console.log("ALL stats_by_game:", data.stats_by_game);
    setHistoryData(data);
    setSelectedGameIds((data.games || []).map((g) => g.id));
  };

  const filteredGames =
    (historyData?.games || []).filter((g) =>
      selectedGameIds.includes(g.id)
    );

  const getStatsForGame = (gameId) => {
    if (!Array.isArray(historyData?.stats_by_game)) return {};

    const includeAll =
      selectedQuarters.length === 0 ||
      selectedQuarters.includes("all");

    const filtered = historyData.stats_by_game.filter(
      (s) =>
        s &&
        typeof s === "object" &&
        Number(s.game_id) === Number(gameId) &&
        (includeAll || selectedQuarters.includes(s?.quarter || ""))
    );

    const combined = {};

    filtered.forEach((qStat) => {
      if (!qStat || typeof qStat !== "object") return;

      Object.entries(qStat).forEach(([key, value]) => {
        if (
          ["id", "player_id", "game_id", "quarter", "created_at"].includes(key)
        )
          return;

        combined[key] =
          (combined[key] || 0) + Number(value || 0);
      });
    });

    return combined;
  };

  const getNotesForGame = (gameId) => {
    return (historyData?.notes || []).filter((n) => {
      const includeAll =
        selectedQuarters.length === 0 ||
        selectedQuarters.includes("all");

      return (
        Number(n.game_id) === Number(gameId) &&
        (includeAll || selectedQuarters.includes(n?.quarter || ""))
      );
    });
  };

  const getStatColumns = () => {
    if (!selectedPlayer) return [];

    const positionGroups = POSITION_GROUPS[selectedPlayer.position] || {};

    const orderedGroups = [
      "Passing",
      "Rushing",
      "Receiving",
      "Blocking",
      "Snapping",
      "Defense",
      "Coverage",
      "Kicking",
      "Punting",
      "Returns"
    ];

    const roleStats = orderedGroups.flatMap((group) => positionGroups[group] || []);
    const universalStats = ["snaps_played", "penalties", "turnovers"];
    
    return [...universalStats, ...roleStats];
  };

  const runAIAnalysis = async () => {
    const payload = {
      player: {
        id: selectedPlayer.id,
        name: selectedPlayer.player_name,
        position: selectedPlayer.position,
      },
      games: filteredGames.map((game) => ({
        game_id: game.id,
        opponent: game.opponent,
        date: game.game_date,
        totals: getStatsForGame(game.id),
        quarters: (
          selectedQuarters.includes("all")
            ? ["Q1", "Q2", "Q3", "Q4"]
            : selectedQuarters
        ).reduce((acc, q) => {
          const quarterStats = historyData.stats_by_game
            .filter(
              (s) =>
                Number(s.game_id) === Number(game.id) &&
                s.quarter === q
            )
            .reduce((qAcc, row) => {
              Object.entries(row).forEach(([key, val]) => {
                if (
                  ["id", "player_id", "game_id", "quarter", "created_at"].includes(key)
                )
                  return;

                qAcc[key] = (qAcc[key] || 0) + Number(val || 0);
              });
              return qAcc;
            }, {});

          if (Object.keys(quarterStats).length > 0) {
            acc[q] = quarterStats;
          }
          return acc;
        }, {}),
        insights: getNotesForGame(game.id).map((n) => ({
          note: n.note,
          time: n.time,
          opponent: n.opponent,
          date: n.game_date,
        })),
      })),
    };
    console.log("AI PAYLOAD:", JSON.stringify(payload, null, 2));

    try {
      setLoadingAI(true);
      setAiResult(null);

      const res = await fetch("http://127.0.0.1:8000/ai/analyze-player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ payload }),
      });

      let data = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setAiResult("Failed to generate analysis.");
        return;
      }

      setAiResult(data?.analysis || "No analysis available.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  const saveAnalysis = async () => {
    try {
      await fetch("http://127.0.0.1:8000/ai/save-player-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          team_id: Number(teamId),
          player: {
            id: selectedPlayer.id,
            name: selectedPlayer.player_name,
            position: selectedPlayer.position,
            jersey_number: selectedPlayer.jersey_number,
          },
          analysis: aiResult,
        }),
      });

      setSaveMessage("Saved!");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setSaveMessage("Error saving");
    }
  };

  const deleteAnalysis = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/ai/delete-player-analysis/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      setSavedList((prev) => prev.filter((item) => item.id !== id));

      if (selectedSaved?.id === id) {
        setSelectedSaved(null);
      }
    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  // ================= GAME ANALYSIS HELPERS =================
  const aggregateUnitStats = (unitData) => {
    const includeAll =
      gameSelectedQuarters.length === 0 ||
      gameSelectedQuarters.includes("all");

    return unitData.reduce(
      (acc, entry) => {
        //  Normalize stats safely
        const stats = (() => {
          if (!entry.stats) return {};

          // If array, merge all objects
          if (Array.isArray(entry.stats)) {
            return entry.stats.reduce((sAcc, obj) => {
              if (!obj || typeof obj !== "object") return sAcc;

              Object.entries(obj).forEach(([k, v]) => {
                sAcc[k] = (sAcc[k] || 0) + Number(v || 0);
              });

              return sAcc;
            }, {});
          }

          // If already object
          if (typeof entry.stats === "object") {
            return entry.stats;
          }

          return {};
        })();

        //  Normalize notes safely
        const notes = Array.isArray(entry.notes) ? entry.notes : [];

        acc.penalties += Number(stats.penalties || 0);
        acc.turnovers += Number(stats.turnovers || 0);
        acc.touchdowns += Number(stats.touchdowns || 0);

        acc.notes += notes.filter(
          (n) =>
            includeAll ||
            gameSelectedQuarters.includes(n?.quarter || "")
        ).length;

        return acc;
      },
      { penalties: 0, turnovers: 0, touchdowns: 0, notes: 0 }
    );
  };

  const getUnitNotesList = (unitName) => {
    const unitRows = selectedGameUnits[unitName] || [];
    return unitRows.flatMap((entry) => {
      const playerName = entry?.player?.name || "Unknown Player";
      const jersey = entry?.player?.jersey_number ?? "—";
      const notes = entry?.notes || [];

      const includeAll =
        gameSelectedQuarters.length === 0 ||
        gameSelectedQuarters.includes("all");

      return notes
        .filter((noteRow) =>
          includeAll ||
          gameSelectedQuarters.includes(noteRow.quarter)
        )
        .map((noteRow) => ({
          playerName,
          jersey,
          note: noteRow?.note || "",
          quarter: noteRow?.quarter,
        }));
    });
  };

  const fetchGameAnalysisDataset = async (matchId) => {
    const includeAll =
      gameSelectedQuarters.length === 0 ||
      gameSelectedQuarters.includes("all");

    const [matchResResult, gameStateResResult, metricsResResult] = await Promise.allSettled([
      fetch(`/teams/matches/${matchId}`, { headers: authHeaders }),
      fetch(`/games/${matchId}/state`, { headers: authHeaders }),
      fetch(`/games/${matchId}/metrics`, { headers: authHeaders }),
    ]);

    if (
      matchResResult.status !== "fulfilled" ||
      gameStateResResult.status !== "fulfilled" ||
      !matchResResult.value.ok ||
      !gameStateResResult.value.ok
    ) {
      throw new Error("Failed to fetch game details.");
    }

    const matchJson = await matchResResult.value.json();
    const gameStateJson = await gameStateResResult.value.json();
    let gameMetricsJson = null;

    if (metricsResResult.status === "fulfilled" && metricsResResult.value.ok) {
      try {
        const metricsData = await metricsResResult.value.json();
        gameMetricsJson = metricsData?.metrics || null;
      } catch {
        gameMetricsJson = null;
      }
    }

    const unitsPayload = { offense: [], defense: [], special: [] };

    for (const unitName of ["offense", "defense", "special"]) {
      const playersRes = await fetch(`/teams/${teamId}/players?unit=${unitName}`, {
        headers: authHeaders,
      });

      const unitPlayers = playersRes.ok ? await playersRes.json() : [];

      const playerRows = await Promise.all(
        (unitPlayers || []).map(async (p) => {
          const insightRes = await fetch(`/games/${matchId}/players/${p.id}`, {
            headers: authHeaders,
          });

          let insightData = { stats: {}, notes: [] };
          if (insightRes.ok) {
            insightData = await insightRes.json();
          }

          return {
            player: {
              id: p.id,
              name: p.player_name,
              position: p.position,
              jersey_number: p.jersey_number,
            },
            stats: Array.isArray(insightData.stats)
              ? insightData.stats[0] || {}
              : (typeof insightData.stats === "object" && insightData.stats !== null
                  ? insightData.stats
                  : {}),
            notes: Array.isArray(insightData.notes)
              ? insightData.notes.filter(
                  (n) =>
                    includeAll ||
                    gameSelectedQuarters.includes(n?.quarter || "")
                )
              : [],
          };
        })
      );

      unitsPayload[unitName] = playerRows;
    }

    return {
      game: matchJson.match || null,
      gameState: gameStateJson || {},
      gameMetrics: gameMetricsJson,
      units: unitsPayload,
    };
  };

  const loadGameData = async (match) => {
    setSelectedMatch(match);
    setGameAiResult(null);
    setGameSaveMessage("");
    setGameDataError("");
    setSelectedGameMetrics(null);
    setGameDataLoading(true);

    try {
      const gameData = await fetchGameAnalysisDataset(match.id);
      setSelectedMatchMeta(gameData.game || match);
      setSelectedGameState(gameData.gameState);
      setSelectedGameMetrics(gameData.gameMetrics);
      setSelectedGameUnits(gameData.units);
    } catch (err) {
      console.error("LOAD GAME DATA ERROR:", err);
      setGameDataError("Failed to load game analysis data.");
    } finally {
      setGameDataLoading(false);
    }
  };

  const buildGamePayloadFromData = ({ game, gameState, gameMetrics, units }) => {
    const includeAll =
      gameSelectedQuarters.length === 0 ||
      gameSelectedQuarters.includes("all");

    //  Helper to filter stats
    const filterStats = (statsObj) => {
      return Object.fromEntries(
        Object.entries(statsObj || {}).filter(([key]) => {
          if (key === "overall") return true;

          return (
            includeAll ||
            gameSelectedQuarters.includes(key)
          );
        })
      );
    };

    //  Helper to filter notes
    const filterNotes = (notesArr) => {
      return (notesArr || []).filter(
        (n) =>
          n &&
          (n.quarter === null || // keep general notes
            includeAll ||
            gameSelectedQuarters.includes(n.quarter))
      );
    };

    const filterGameMetrics = () => {
      if (!gameMetrics || typeof gameMetrics !== "object") {
        return null;
      }

      const quarterOrder = ["Q1", "Q2", "Q3", "Q4"];
      const filtered = {};

      if (
        gameMetrics.overall &&
        typeof gameMetrics.overall === "object" &&
        Object.keys(gameMetrics.overall).length > 0
      ) {
        filtered.overall = gameMetrics.overall;
      }

      quarterOrder.forEach((quarter) => {
        if (!includeAll && !gameSelectedQuarters.includes(quarter)) {
          return;
        }

        const quarterMetrics = gameMetrics?.[quarter];
        if (
          quarterMetrics &&
          typeof quarterMetrics === "object" &&
          Object.keys(quarterMetrics).length > 0
        ) {
          filtered[quarter] = quarterMetrics;
        }
      });

      return Object.keys(filtered).length > 0 ? filtered : null;
    };

    return {
      game: {
        id: game?.id,
        name: game?.name,
        opponent: game?.opponent,
        date: game?.game_date,
        team_score: game?.team_score,
        opponent_score: game?.opponent_score,
        description: game?.description,
      },

      //  Filtered game state
      game_state: {
        "Game State": (gameState?.["Game State"] || []).filter(
          (g) =>
            includeAll ||
            gameSelectedQuarters.includes(g?.quarter || "")
        ),
      },
      game_metrics: filterGameMetrics(),

      //  Filtered units
      units: {
        offense: (units?.offense || []).map((p) => ({
          ...p,
          stats: filterStats(p.stats),
          notes: filterNotes(p.notes),
        })),

        defense: (units?.defense || []).map((p) => ({
          ...p,
          stats: filterStats(p.stats),
          notes: filterNotes(p.notes),
        })),

        special: (units?.special || []).map((p) => ({
          ...p,
          stats: filterStats(p.stats),
          notes: filterNotes(p.notes),
        })),
      },

      //  Summary metrics (already filtered upstream via notes logic)
      summary_metrics: {
        offense: aggregateUnitStats(units?.offense || []),
        defense: aggregateUnitStats(units?.defense || []),
        special: aggregateUnitStats(units?.special || []),
      },
    };
  };

  const buildGamePayload = () => {
    const game = selectedMatchMeta || selectedMatch;
    return buildGamePayloadFromData({
      game,
      gameState: selectedGameState,
      gameMetrics: selectedGameMetrics,
      units: selectedGameUnits,
    });
  };

  const runGameAIAnalysis = async () => {
    if (!selectedMatch) return;

    try {
      setGameLoadingAI(true);
      setGameAiResult(null);

      const payload = buildGamePayload();
      console.log("AI PAYLOAD (GAME):", JSON.stringify(payload, null, 2));

      const res = await fetch("http://127.0.0.1:8000/ai/analyze-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          team_id: Number(teamId),
          game_id: selectedMatch.id,
          payload,
        }),
      });

      let data = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setGameAiResult("Failed to generate analysis.");
        return;
      }

      setGameAiResult(data?.analysis || "No analysis available.");
    } catch (err) {
      console.error("GAME AI ERROR:", err);
    } finally {
      setGameLoadingAI(false);
    }
  };

  const fetchPlayerHistoryData = async (playerId) => {
    const res = await fetch(`/players/${playerId}/history`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      throw new Error("Failed to fetch player history.");
    }

    return res.json();
  };

  const buildPlayerComparisonSidePayload = (player, history) => {
    const selectedGameSet =
      comparisonGameScope === "selected"
        ? new Set((comparisonSelectedGameIds || []).map((id) => Number(id)))
        : null;

    const games = (history?.games || []).filter((g) => {
      if (!selectedGameSet) return true;
      return selectedGameSet.has(Number(g.id));
    });

    const statsByGame = Array.isArray(history?.stats_by_game)
      ? history.stats_by_game
      : [];
    const notes = Array.isArray(history?.notes)
      ? history.notes
      : [];

    const gameRows = games.map((game) => {
      const gameStatsRows = statsByGame.filter(
        (s) => Number(s.game_id) === Number(game.id)
      );
      const gameNotesRows = notes.filter(
        (n) => Number(n.game_id) === Number(game.id)
      );

      const totals = gameStatsRows.reduce((acc, row) => {
        Object.entries(row).forEach(([key, value]) => {
          if (
            ["id", "player_id", "game_id", "quarter", "created_at"].includes(key)
          ) {
            return;
          }
          acc[key] = (acc[key] || 0) + Number(value || 0);
        });
        return acc;
      }, {});

      const quarters = gameStatsRows.reduce((acc, row) => {
        const quarter = row?.quarter;
        if (!quarter) return acc;

        const quarterStats = {};
        Object.entries(row).forEach(([key, value]) => {
          if (
            ["id", "player_id", "game_id", "quarter", "created_at"].includes(key)
          ) {
            return;
          }
          quarterStats[key] = Number(value || 0);
        });

        acc[quarter] = quarterStats;
        return acc;
      }, {});

      const insights = gameNotesRows.map((n) => ({
        note: n.note,
        time: n.time,
        quarter: n.quarter,
        opponent: n.opponent,
        date: n.game_date,
      }));

      return {
        game_id: game.id,
        opponent: game.opponent,
        date: game.game_date,
        team_score: game.team_score,
        opponent_score: game.opponent_score,
        totals,
        quarters,
        insights,
      };
    });

    return {
      player: {
        id: player.id,
        name: player.player_name,
        jersey_number: player.jersey_number,
        position: player.position,
        unit: player.unit,
      },
      games: gameRows,
    };
  };

  const runComparisonAIAnalysis = async () => {
    if (comparisonType === "players") {
      const playerOneId = Number(comparisonPlayerOneId);
      const playerTwoId = Number(comparisonPlayerTwoId);

      if (!playerOneId || !playerTwoId || playerOneId === playerTwoId) {
        setComparisonError("Please select two different players.");
        return;
      }

      if (
        comparisonGameScope === "selected" &&
        (!comparisonSelectedGameIds || comparisonSelectedGameIds.length === 0)
      ) {
        setComparisonError("Select at least one game for the selected game scope.");
        return;
      }

      const playerOne = comparisonPlayers.find((p) => Number(p.id) === playerOneId);
      const playerTwo = comparisonPlayers.find((p) => Number(p.id) === playerTwoId);

      if (!playerOne || !playerTwo) {
        setComparisonError("Selected players are unavailable for this unit.");
        return;
      }

      setComparisonLoading(true);
      setComparisonError("");
      setComparisonResult(null);

      try {
        const [playerOneHistory, playerTwoHistory] = await Promise.all([
          fetchPlayerHistoryData(playerOneId),
          fetchPlayerHistoryData(playerTwoId),
        ]);

        const payload = {
          player_one: buildPlayerComparisonSidePayload(playerOne, playerOneHistory),
          player_two: buildPlayerComparisonSidePayload(playerTwo, playerTwoHistory),
        };

        const res = await fetch("http://127.0.0.1:8000/ai/compare-players", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            team_id: Number(teamId),
            player_one_id: playerOneId,
            player_two_id: playerTwoId,
            payload,
          }),
        });

        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok) {
          setComparisonError("Failed to generate comparison.");
          return;
        }

        setComparisonResult(data?.comparison || "No comparison available.");
      } catch (err) {
        console.error("COMPARE PLAYERS ERROR:", err);
        setComparisonError("Failed to generate comparison.");
      } finally {
        setComparisonLoading(false);
      }

      return;
    }

    const gameOneId = Number(comparisonGameOneId);
    const gameTwoId = Number(comparisonGameTwoId);

    if (!gameOneId || !gameTwoId || gameOneId === gameTwoId) {
      setComparisonError("Please select two different games.");
      return;
    }

    setComparisonLoading(true);
    setComparisonError("");
    setComparisonResult(null);

    try {
      const [gameOneData, gameTwoData] = await Promise.all([
        fetchGameAnalysisDataset(gameOneId),
        fetchGameAnalysisDataset(gameTwoId),
      ]);

      const payload = {
        game_one: buildGamePayloadFromData({
          game: gameOneData.game,
          gameState: gameOneData.gameState,
          gameMetrics: gameOneData.gameMetrics,
          units: gameOneData.units,
        }),
        game_two: buildGamePayloadFromData({
          game: gameTwoData.game,
          gameState: gameTwoData.gameState,
          gameMetrics: gameTwoData.gameMetrics,
          units: gameTwoData.units,
        }),
      };

      const res = await fetch("http://127.0.0.1:8000/ai/compare-games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          team_id: Number(teamId),
          game_one_id: gameOneId,
          game_two_id: gameTwoId,
          payload,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setComparisonError("Failed to generate comparison.");
        return;
      }

      setComparisonResult(data?.comparison || "No comparison available.");
    } catch (err) {
      console.error("COMPARE GAMES ERROR:", err);
      setComparisonError("Failed to generate comparison.");
    } finally {
      setComparisonLoading(false);
    }
  };

  const saveGameAnalysis = async () => {
    if (!selectedMatch || !gameAiResult) return;

    try {
      await fetch("http://127.0.0.1:8000/ai/save-game-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          team_id: Number(teamId),
          game_id: selectedMatch.id,
          game: {
            name: selectedMatchMeta?.name,
            opponent: selectedMatchMeta?.opponent,
            date: selectedMatchMeta?.game_date,
          },
          analysis: gameAiResult,
        }),
      });

      setGameSaveMessage("Saved!");
      setTimeout(() => setGameSaveMessage(""), 2000);
    } catch (err) {
      console.error("SAVE GAME ANALYSIS ERROR:", err);
      setGameSaveMessage("Error saving");
    }
  };

  const deleteSavedGameAnalysis = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/ai/delete-game-analysis/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      setSavedGameList((prev) => prev.filter((item) => item.id !== id));
      if (selectedSavedGame?.id === id) {
        setSelectedSavedGame(null);
      }
    } catch (err) {
      console.error("DELETE SAVED GAME ERROR:", err);
    }
  };

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(b.game_date) - new Date(a.game_date)
  );

  const metricMetaFields = ["id", "game_id", "quarter", "created_at"];
  const metricsQuarterOrder = ["Q1", "Q2", "Q3", "Q4"];
  const includeAllGameQuarters =
    gameSelectedQuarters.length === 0 ||
    gameSelectedQuarters.includes("all");
  const visibleMetricQuarters = metricsQuarterOrder.filter(
    (quarter) => includeAllGameQuarters || gameSelectedQuarters.includes(quarter)
  );
  const overallMetrics = selectedGameMetrics?.overall || {};
  const quarterMetricsForDisplay = visibleMetricQuarters
    .map((quarter) => ({
      quarter,
      values: selectedGameMetrics?.[quarter] || {},
    }))
    .filter((row) =>
      Object.keys(row.values).some((key) => !metricMetaFields.includes(key))
    );
  const metricKeysForDisplay = Array.from(
    new Set([
      ...Object.keys(overallMetrics).filter((key) => !metricMetaFields.includes(key)),
      ...quarterMetricsForDisplay.flatMap((row) =>
        Object.keys(row.values).filter((key) => !metricMetaFields.includes(key))
      ),
    ])
  ).sort();
  const hasGameMetrics =
    metricKeysForDisplay.length > 0 || quarterMetricsForDisplay.length > 0;
  const selectedComparisonPlayerOne = comparisonPlayers.find(
    (p) => Number(p.id) === Number(comparisonPlayerOneId)
  );
  const selectedComparisonPlayerTwo = comparisonPlayers.find(
    (p) => Number(p.id) === Number(comparisonPlayerTwoId)
  );
  const comparisonPositionsDiffer =
    comparisonType === "players" &&
    selectedComparisonPlayerOne &&
    selectedComparisonPlayerTwo &&
    selectedComparisonPlayerOne.position !== selectedComparisonPlayerTwo.position;

  return (
    <div className="player-analysis-page">
      <div className="top-buttons tutorial-ai-tabs">
        <button
          className={`top-btn tutorial-player-analysis-tab ${mode === "analyze" ? "active" : ""}`}
          onClick={() => setMode("analyze")}
        >
          Player Analysis
        </button>

        <button
          className={`top-btn tutorial-game-ai-tab ${mode === "game" ? "active" : ""}`}
          onClick={() => setMode("game")}
        >
          Game Analysis
        </button>

        <button
          className={`top-btn tutorial-comparison-tab ${mode === "comparison" ? "active" : ""}`}
          onClick={() => setMode("comparison")}
        >
          AI Comparison
        </button>

        <button
          className={`top-btn tutorial-saved-player-tab ${mode === "saved-player" ? "active" : ""}`}
          onClick={() => setMode("saved-player")}
        >
          Saved Player Analysis
        </button>

        <button
          className={`top-btn tutorial-saved-game-tab ${mode === "saved-game" ? "active" : ""}`}
          onClick={() => setMode("saved-game")}
        >
          Saved Game Analysis
        </button>

        <button className="top-btn back" onClick={() => navigate(`/team/${teamId}`)}>
          Go Back
        </button>
      </div>

      {mode === "analyze" && (
        <>
          {!selectedPlayer && (
            <>
              <h2>Select Player</h2>

              <div className="unit-buttons tutorial-player-unit-filter">
                {["offense", "defense", "special"].map((u) => (
                  <button
                    key={u}
                    className={`unit-btn ${u} ${unit === u ? "active" : ""}`}
                    onClick={() => setUnit(u)}
                  >
                    {u.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="table-container tutorial-player-select-table">
                {players.length === 0 && (
                  <p className="tutorial-player-empty">No active players found for this unit.</p>
                )}
                <table className="player-table white-bg">
                  <thead className={`table-header-${unit}`}>
                    <tr>
                      <th>No.</th>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id}>
                        <td>{p.jersey_number}</td>
                        <td>{p.player_name}</td>
                        <td>{POSITION_NAMES[p.position] || p.position}</td>
                        <td>
                          <button className="analyze-btn" onClick={() => analyzePlayer(p)}>
                            Analyze
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {selectedPlayer && historyData && (
            <div className="analysis-wrapper">
              <h2>
                #{selectedPlayer.jersey_number} {selectedPlayer.player_name}
              </h2>

              <button className="top-btn back" onClick={() => setSelectedPlayer(null)}>
                ← Back
              </button>

              <div className="dropdown-container">
                <button className="dropdown-btn" onClick={() => setShowGameDropdown(!showGameDropdown)}>
                  Select Games ▼
                </button>

                {showGameDropdown && (
                  <div className="dropdown-menu">
                    <label className="dropdown-item">
                      <input
                        type="checkbox"
                        checked={selectedGameIds.length === historyData.games.length}
                        onChange={() =>
                          setSelectedGameIds(
                            selectedGameIds.length === historyData.games.length
                              ? []
                              : historyData.games.map((g) => g.id)
                          )
                        }
                      />
                      All Games
                    </label>

                    <div className="dropdown-divider" />

                    {historyData.games.map((game) => (
                      <label key={game.id} className="dropdown-item">
                        <input
                          type="checkbox"
                          checked={selectedGameIds.includes(game.id)}
                          onChange={() => {
                            setSelectedGameIds((prev) =>
                              prev.includes(game.id)
                                ? prev.filter((id) => id !== game.id)
                                : [...prev, game.id]
                            );
                          }}
                        />
                        {game.opponent} ({game.game_date})
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="dropdown-container">
                <button
                  className="dropdown-btn"
                  onClick={() => setShowQuarterDropdown(prev => !prev)}
                >
                  Select Quarters ▼
                </button>

                {showQuarterDropdown && (
                  <div className="dropdown-menu">
                    <label className="dropdown-item">
                      <input
                        type="checkbox"
                        checked={selectedQuarters.includes("all")}
                        onChange={() => {
                          setSelectedQuarters(["all"]);
                        }}
                      />
                      All Quarters
                    </label>

                    <div className="dropdown-divider" />

                    {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                      <label key={q} className="dropdown-item">
                        <input
                          type="checkbox"
                          checked={selectedQuarters.includes(q)}
                          onChange={() => {
                            setSelectedQuarters((prev) => {
                              if (prev.includes("all")) return [q];

                              return prev.includes(q)
                                ? prev.filter((x) => x !== q)
                                : [...prev, q];
                            });
                          }}
                        />
                        {q}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="analysis-container">
                <div className="table-section">
                  <h3>Player Data By Game</h3>
                  <p className="table-desc">Game-by-game breakdown with recorded statistics.</p>

                  <div className="table-scroll-container">
                    <table className="player-table white-bg">
                      <thead className={`table-header-${unit}`}>
                        <tr>
                          <th></th>
                          <th>Date</th>
                          <th>Opponent</th>
                          {getStatColumns().map((stat) => (
                            <th key={stat}>
                              {stat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredGames.map((game) => {
                          const stats = getStatsForGame(game.id);
                          console.log("GAME ID:", game.id);
                          console.log(
                            "FILTERED STATS:",
                            historyData.stats_by_game.filter(
                              (s) =>
                                Number(s.game_id) === Number(game.id) &&
                                (selectedQuarters.includes("all") ||
                                  selectedQuarters.includes(s?.quarter || ""))
                            )
                          );
                          console.log("COMBINED STATS:", stats);
                          return (
                            <React.Fragment key={game.id}>
                              {/* MAIN GAME ROW */}
                              <tr>
                                <td>
                                  <button
                                    onClick={() =>
                                      setExpandedGames((prev) => ({
                                        ...prev,
                                        [game.id]: !prev[game.id],
                                      }))
                                    }
                                  >
                                    {expandedGames[game.id] ? "−" : "+"}
                                  </button>
                                </td>

                                <td>{game.game_date}</td>
                                <td>{game.opponent}</td>

                                {getStatColumns().map((stat) => (
                                  <td key={stat}>{stats[stat] ?? 0}</td>
                                ))}
                              </tr>

                              {/* QUARTER ROWS */}
                              {expandedGames[game.id] && //Expanded rows
                                ["Q1", "Q2", "Q3", "Q4"].map((q) => {
                                  const quarterStats = historyData.stats_by_game
                                    .filter(
                                      (s) =>
                                        Number(s.game_id) === Number(game.id) &&
                                        s.quarter === q
                                    )
                                    .reduce((acc, row) => {
                                      Object.entries(row).forEach(([key, val]) => {
                                        if (
                                          ["id", "player_id", "game_id", "quarter", "created_at"].includes(key)
                                        )
                                          return;

                                        acc[key] = (acc[key] || 0) + Number(val || 0);
                                      });
                                      return acc;
                                    }, {});

                                  return (
                                    <tr key={`${game.id}-${q}`} style={{ background: "#f9f9f9" }}>
                                      <td></td>
                                      <td style={{ paddingLeft: "15px" }}>{q}</td>
                                      <td></td>

                                      {getStatColumns().map((stat) => (
                                        <td key={stat}>{quarterStats[stat] ?? 0}</td>
                                      ))}
                                    </tr>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="table-section">
                  <h3>Player Insights</h3>
                  <p className="table-desc">Chronological observations from selected games.</p>

                  <div className="table-scroll-container">
                    <table className="player-table white-bg">
                      <thead className="insights-header">
                        <tr>
                          <th>Date</th>
                          <th>Opponent</th>
                          <th>Quarter</th>
                          <th>Note</th>
                          <th>Time</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredGames.map((game) =>
                          getNotesForGame(game.id).map((note, i) => (
                            <tr key={`${game.id}-${note.quarter}-${note.time}-${i}`}>
                              <td>{game.game_date}</td>
                              <td>{game.opponent}</td>
                              <td>{note.quarter || "—"}</td>
                              <td>{note.note}</td>
                              <td>{note.time}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="ai-button-wrapper">
                <button className="ai-button tutorial-analysis-run" onClick={runAIAnalysis}>
                  Analyze Player with AI
                </button>
              </div>

              {loadingAI && (
                <p style={{ textAlign: "center", marginTop: "10px" }}>
                  Generating analysis...
                </p>
              )}

              {aiResult && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "15px",
                    backgroundColor: "#f4f4f4",
                    borderRadius: "8px",
                    maxWidth: "900px",
                    marginLeft: "auto",
                    marginRight: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <h3>AI Analysis</h3>
                  <div className="ai-analysis-text">
                    {formatAnalysisText(aiResult).map((line, i) => (
                      <p
                        key={i}
                        className={
                          line.isHeader
                            ? "ai-header"
                            : line.isNumbered
                            ? "ai-numbered"
                            : "ai-line"
                        }
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button className="save-analysis-btn tutorial-analysis-save" onClick={saveAnalysis} disabled={!aiResult}>
                      Save Analysis
                    </button>

                    {saveMessage && (
                      <span style={{ color: "green", fontWeight: "bold" }}>
                        {saveMessage}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {mode === "game" && (
        <div className="saved-container game-analysis-shell tutorial-game-ai-section">
          <h2>Game Analysis</h2>

          {!selectedMatch && (
            <>
              <p className="table-desc">Select a game to build and run AI game analysis.</p>

              {matchesLoading ? (
                <p>Loading games...</p>
              ) : (
                <div className="table-scroll-container tutorial-game-ai-list">
                  {sortedMatches.length === 0 && (
                    <p className="tutorial-game-ai-empty">No games are available yet.</p>
                  )}
                  <table className="player-table white-bg">
                    <thead className="insights-header">
                      <tr>
                        <th>Date</th>
                        <th>Game</th>
                        <th>Opponent</th>
                        <th>Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMatches.map((m) => (
                        <tr key={m.id}>
                          <td>{m.game_date}</td>
                          <td>{m.name}</td>
                          <td>{m.opponent}</td>
                          <td>
                            {m.team_score != null && m.opponent_score != null
                              ? `${m.team_score} - ${m.opponent_score}`
                              : "—"}
                          </td>
                          <td>
                            <button className="analyze-btn" onClick={() => loadGameData(m)}>
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {selectedMatch && (
            <>
              <button
                className="top-btn back"
                onClick={() => {
                  setSelectedMatch(null);
                  setSelectedMatchMeta(null);
                  setSelectedGameState(null);
                  setSelectedGameMetrics(null);
                  setSelectedGameUnits({ offense: [], defense: [], special: [] });
                  setGameAiResult(null);
                  setGameDataError("");
                }}
              >
                ← Back to Games
              </button>

              <div className="game-analysis-selected">
                <div className="game-analysis-header-card">
                  <h3 className="game-analysis-title">
                    {selectedMatchMeta?.name} vs {selectedMatchMeta?.opponent}
                  </h3>
                  <div className="dropdown-container">
                    <button
                      className="dropdown-btn"
                      onClick={() => setShowGameQuarterDropdown(prev => !prev)}
                    >
                      Select Quarters ▼
                    </button>

                    {showGameQuarterDropdown && (
                      <div className="dropdown-menu">
                        <label className="dropdown-item">
                          <input
                            type="checkbox"
                            checked={gameSelectedQuarters.includes("all")}
                            onChange={() =>
                              setGameSelectedQuarters(
                                gameSelectedQuarters.includes("all")
                                  ? ["Q1", "Q2", "Q3", "Q4"]
                                  : ["all"]
                              )
                            }
                          />
                          All Quarters
                        </label>

                        <div className="dropdown-divider" />

                        {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                          <label key={q} className="dropdown-item">
                            <input
                              type="checkbox"
                              checked={gameSelectedQuarters.includes(q)}
                              onChange={() => {
                                setGameSelectedQuarters((prev) => {
                                  if (prev.includes("all")) return [q];
                                  return prev.includes(q)
                                    ? prev.filter((x) => x !== q)
                                    : [...prev, q];
                                });
                              }}
                            />
                            {q}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="table-desc game-analysis-meta">
                    Date: {selectedMatchMeta?.game_date || "—"} | Score: {selectedMatchMeta?.team_score ?? "—"} - {selectedMatchMeta?.opponent_score ?? "—"}
                  </p>
                  {selectedMatchMeta?.description && (
                    <p className="table-desc game-analysis-meta">Notes: {selectedMatchMeta.description}</p>
                  )}
                </div>

                {gameDataLoading && <p>Loading game data...</p>}
                {gameDataError && <p style={{ color: "#b10000" }}>{gameDataError}</p>}

                {!gameDataLoading && !gameDataError && selectedGameState && (
                  <>
                    <div className="game-analysis-grid">
                      <div className="game-analysis-card">
                        <h3>Game State Observations</h3>
                        <div className="table-scroll-container" style={{ marginTop: "8px" }}>
                          <table className="player-table white-bg">
                            <thead className="insights-header">
                              <tr>
                                <th>Quarter</th>
                                <th>Observation</th>
                                <th>Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedGameState?.["Game State"] || []).length === 0 ? (
                                <tr>
                                  <td colSpan={3}>No entries.</td>
                                </tr>
                              ) : (
                                (selectedGameState?.["Game State"] || [])
                                  .filter((r) => {
                                    const includeAll =
                                      gameSelectedQuarters.length === 0 ||
                                      gameSelectedQuarters.includes("all");

                                    return (
                                      includeAll ||
                                      gameSelectedQuarters.includes(r.quarter || "")
                                    );
                                  })
                                  .map((r) => (
                                  <tr key={`${r.id ?? "gs"}-${r.quarter}-${r.time}-${r.text}`}>
                                    <td>{r.quarter || "—"}</td>
                                    <td>{r.text}</td>
                                    <td>{r.time || "—"}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="game-analysis-card">
                        <h3>Unit Summary</h3>
                        <div className="table-scroll-container">
                          <table className="player-table white-bg">
                            <thead className="insights-header">
                              <tr>
                                <th>Unit</th>
                                <th>Players</th>
                                <th>Penalties</th>
                                <th>Turnovers</th>
                                <th>Touchdowns</th>
                                <th>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {["offense", "defense", "special"].map((u) => {
                                const totals = aggregateUnitStats(selectedGameUnits[u] || []);
                                return (
                                  <tr key={u}>
                                    <td>{u.toUpperCase()}</td>
                                    <td>{(selectedGameUnits[u] || []).length}</td>
                                    <td>{totals.penalties}</td>
                                    <td>{totals.turnovers}</td>
                                    <td>{totals.touchdowns}</td>
                                    <td>
                                      <div className="unit-notes-cell">
                                        <span>{totals.notes}</span>
                                        <button
                                          className="analyze-btn unit-notes-btn"
                                          onClick={() => setNotesModalUnit(u)}
                                        >
                                          View Notes
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="table-desc" style={{ marginTop: "10px" }}>
                          Offensive, defensive, and special teams insights are derived from player stats and notes for this selected game.
                        </p>
                      </div>

                      <div className="game-analysis-card">
                        <h3>Game Metrics</h3>
                        {!hasGameMetrics ? (
                          <p className="table-desc">No game metrics recorded for this game.</p>
                        ) : (
                          <div className="table-scroll-container">
                            <table className="player-table white-bg">
                              <thead className="insights-header">
                                <tr>
                                  <th>Metric</th>
                                  <th>Overall</th>
                                  {quarterMetricsForDisplay.map((row) => (
                                    <th key={`metric-quarter-${row.quarter}`}>{row.quarter}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {metricKeysForDisplay.map((metricKey) => (
                                  <tr key={`metric-key-${metricKey}`}>
                                    <td>{metricKey.replace(/_/g, " ")}</td>
                                    <td>{overallMetrics?.[metricKey] ?? "—"}</td>
                                    {quarterMetricsForDisplay.map((row) => (
                                      <td key={`metric-cell-${metricKey}-${row.quarter}`}>
                                        {row.values?.[metricKey] ?? "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ai-button-wrapper game-analysis-action">
                      <button className="ai-button tutorial-game-ai-run" onClick={runGameAIAnalysis}>
                        Analyze Game with AI
                      </button>
                    </div>

                    {gameLoadingAI && (
                      <p style={{ textAlign: "center", marginTop: "10px" }}>
                        Generating game analysis...
                      </p>
                    )}

                    {gameAiResult && (
                      <div className="game-analysis-result-card">
                        <h3>Game AI Analysis</h3>
                        <div className="ai-analysis-text">
                          {formatAnalysisText(gameAiResult).map((line, i) => (
                            <p
                              key={i}
                              className={
                                line.isHeader
                                  ? "ai-header"
                                  : line.isNumbered
                                  ? "ai-numbered"
                                  : "ai-line"
                              }
                            >
                              {line.text}
                            </p>
                          ))}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <button
                            className="save-analysis-btn tutorial-game-ai-save"
                            onClick={saveGameAnalysis}
                            disabled={!gameAiResult}
                          >
                            Save Game Analysis
                          </button>

                          {gameSaveMessage && (
                            <span style={{ color: "green", fontWeight: "bold" }}>
                              {gameSaveMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {mode === "comparison" && (
        <div className="saved-container game-analysis-shell">
          <h2>AI Comparison</h2>
          <p className="table-desc">
            Compare games or players side-by-side to understand what changed in performance.
          </p>

          {matchesLoading ? (
            <p>Loading games...</p>
          ) : (
            <div className="game-analysis-selected">
              <div className="game-analysis-card tutorial-comparison-type">
                <h3>Comparison Type</h3>
                <div className="unit-buttons" style={{ marginBottom: 0 }}>
                  <button
                    className={`unit-btn ${comparisonType === "games" ? "active" : ""}`}
                    onClick={() => {
                      setComparisonType("games");
                      setComparisonError("");
                      setComparisonResult(null);
                    }}
                  >
                    Compare Games
                  </button>
                  <button
                    className={`unit-btn ${comparisonType === "players" ? "active" : ""}`}
                    onClick={() => {
                      setComparisonType("players");
                      setComparisonError("");
                      setComparisonResult(null);
                    }}
                  >
                    Compare Players
                  </button>
                </div>
              </div>

              {comparisonType === "games" && (
                <>
              <div className="game-analysis-card tutorial-comparison-selectors">
                <h3>Select Games to Compare</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginTop: "10px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Select Game 1</label>
                    <select
                      value={comparisonGameOneId}
                      onChange={(e) => {
                        setComparisonGameOneId(e.target.value);
                        setComparisonError("");
                      }}
                      style={{ width: "100%", padding: "8px", border: "2px solid black", borderRadius: "8px" }}
                    >
                      <option value="">Choose a game</option>
                      {sortedMatches.map((m) => (
                        <option key={`comparison-game-one-${m.id}`} value={m.id}>
                          {m.game_date} | {m.name} vs {m.opponent}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Select Game 2</label>
                    <select
                      value={comparisonGameTwoId}
                      onChange={(e) => {
                        setComparisonGameTwoId(e.target.value);
                        setComparisonError("");
                      }}
                      style={{ width: "100%", padding: "8px", border: "2px solid black", borderRadius: "8px" }}
                    >
                      <option value="">Choose a game</option>
                      {sortedMatches.map((m) => (
                        <option key={`comparison-game-two-${m.id}`} value={m.id}>
                          {m.game_date} | {m.name} vs {m.opponent}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
                </>
              )}

              {comparisonType === "players" && (
                <div className="game-analysis-card tutorial-comparison-selectors">
                  <h3>Select Players to Compare</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "10px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Unit</label>
                      <select
                        value={comparisonUnit}
                        onChange={(e) => {
                          setComparisonUnit(e.target.value);
                          setComparisonPlayerOneId("");
                          setComparisonPlayerTwoId("");
                          setComparisonError("");
                        }}
                        style={{ width: "100%", padding: "8px", border: "2px solid black", borderRadius: "8px" }}
                      >
                        <option value="offense">Offense</option>
                        <option value="defense">Defense</option>
                        <option value="special">Special</option>
                      </select>
                      <p className="table-desc" style={{ marginTop: "6px", marginBottom: 0 }}>
                        Tip: Comparing players at the same position gives more direct statistical insights.
                      </p>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Player 1</label>
                      <select
                        value={comparisonPlayerOneId}
                        onChange={(e) => {
                          setComparisonPlayerOneId(e.target.value);
                          setComparisonError("");
                        }}
                        style={{ width: "100%", padding: "8px", border: "2px solid black", borderRadius: "8px" }}
                      >
                        <option value="">Choose player</option>
                        {comparisonPlayers.map((p) => (
                          <option key={`comparison-player-one-${p.id}`} value={p.id}>
                            #{p.jersey_number} {p.player_name} ({p.position})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Player 2</label>
                      <select
                        value={comparisonPlayerTwoId}
                        onChange={(e) => {
                          setComparisonPlayerTwoId(e.target.value);
                          setComparisonError("");
                        }}
                        style={{ width: "100%", padding: "8px", border: "2px solid black", borderRadius: "8px" }}
                      >
                        <option value="">Choose player</option>
                        {comparisonPlayers.map((p) => (
                          <option key={`comparison-player-two-${p.id}`} value={p.id}>
                            #{p.jersey_number} {p.player_name} ({p.position})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Game Scope</label>
                      <select
                        value={comparisonGameScope}
                        onChange={(e) => {
                          setComparisonGameScope(e.target.value);
                          setComparisonError("");
                        }}
                        style={{ width: "100%", padding: "8px", border: "2px solid black", borderRadius: "8px" }}
                      >
                        <option value="all">All Games</option>
                        <option value="selected">Selected Games</option>
                      </select>
                    </div>

                    {comparisonGameScope === "selected" && (
                      <div className="dropdown-container" style={{ marginTop: 0 }}>
                        <button
                          className="dropdown-btn"
                          onClick={() => setShowComparisonGameDropdown((prev) => !prev)}
                        >
                          Select Games ({comparisonSelectedGameIds.length}) ▼
                        </button>

                        {showComparisonGameDropdown && (
                          <div className="dropdown-menu">
                            <label className="dropdown-item">
                              <input
                                type="checkbox"
                                checked={comparisonSelectedGameIds.length === sortedMatches.length}
                                onChange={() => {
                                  setComparisonSelectedGameIds((prev) =>
                                    prev.length === sortedMatches.length ? [] : sortedMatches.map((m) => m.id)
                                  );
                                }}
                              />
                              All Games
                            </label>

                            <div className="dropdown-divider" />

                            {sortedMatches.map((m) => (
                              <label key={`comparison-scope-game-${m.id}`} className="dropdown-item">
                                <input
                                  type="checkbox"
                                  checked={comparisonSelectedGameIds.includes(m.id)}
                                  onChange={() => {
                                    setComparisonSelectedGameIds((prev) =>
                                      prev.includes(m.id)
                                        ? prev.filter((id) => id !== m.id)
                                        : [...prev, m.id]
                                    );
                                  }}
                                />
                                {m.game_date} | {m.opponent}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {comparisonPositionsDiffer && (
                <div
                  style={{
                    backgroundColor: "#fff6d8",
                    border: "1px solid #e0c46a",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#5f4a00",
                    fontWeight: 500,
                  }}
                >
                  These players play different positions. Comparison will focus on role-specific performance and observations rather than direct statistical comparison.
                </div>
              )}

              <div className="ai-button-wrapper game-analysis-action">
                <button className="ai-button tutorial-comparison-run" onClick={runComparisonAIAnalysis}>
                  {comparisonType === "players"
                    ? "Compare Players with AI"
                    : "Compare Games with AI"}
                </button>
              </div>

              {comparisonError && (
                <p style={{ color: "#b10000", textAlign: "center" }}>{comparisonError}</p>
              )}

              {comparisonLoading && (
                <p style={{ textAlign: "center", marginTop: "10px" }}>
                  Generating comparison...
                </p>
              )}

              {comparisonResult && (
                <div className="game-analysis-result-card">
                  <h3>AI Comparison Result</h3>
                  <div className="ai-analysis-text">
                    {formatAnalysisText(comparisonResult).map((line, i) => (
                      <p
                        key={i}
                        className={
                          line.isHeader
                            ? "ai-header"
                            : line.isNumbered
                            ? "ai-numbered"
                            : "ai-line"
                        }
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {notesModalUnit && (
        <div className="unit-notes-modal-overlay" onClick={() => setNotesModalUnit(null)}>
          <div className="unit-notes-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="unit-notes-modal-title">
              {notesModalUnit.toUpperCase()} Unit Notes
            </h3>

            <div className="unit-notes-modal-body">
              {getUnitNotesList(notesModalUnit).length === 0 ? (
                <p className="table-desc">No notes for this unit in the selected game.</p>
              ) : (
                getUnitNotesList(notesModalUnit).map((entry, idx) => (
                  <div key={`${notesModalUnit}-note-${idx}`} className="unit-note-entry">
                    <div className="unit-note-player">
                      #{entry.jersey} {entry.playerName}
                    </div>
                    <div className="unit-note-text">
                      - {entry.note}
                      {entry.quarter && (
                        <span style={{ marginLeft: "6px", fontSize: "12px", color: "#666" }}>
                          <strong>[{entry.quarter}]</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="unit-notes-modal-actions">
              <button className="top-btn back" onClick={() => setNotesModalUnit(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "saved-player" && (
        <div className="saved-container">
          <h2>Saved Player Analysis</h2>

          <div className="saved-player-layout">
            <div className="saved-list">
              <div className="tutorial-saved-player-filters" style={{ marginBottom: "10px" }}>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  style={{
                    width: "100%",
                    marginBottom: "8px",
                    padding: "6px",
                    borderRadius: "6px",
                  }}
                >
                  <option value="all">All Units</option>
                  <option value="offense">Offense</option>
                  <option value="defense">Defense</option>
                  <option value="special">Special Teams</option>
                </select>

                <input
                  type="text"
                  placeholder="Search player..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "220px",
                    padding: "6px",
                    borderRadius: "6px",
                    border: "1px solid black",
                  }}
                />
              </div>

              {savedList.length === 0 && (
                <p className="tutorial-saved-player-empty">No saved player analysis yet.</p>
              )}

              <div className="tutorial-saved-player-list">
              {savedList
                .filter((item) => {
                  const listUnit = getUnit(item.position);

                  if (filterUnit !== "all" && listUnit !== filterUnit) {
                    return false;
                  }

                  if (
                    searchTerm &&
                    !item.player_name.toLowerCase().includes(searchTerm.toLowerCase())
                  ) {
                    return false;
                  }

                  return true;
                })
                .map((item) => (
                  <div
                    key={item.id}
                    className={`saved-item ${selectedSaved?.id === item.id ? "active" : ""}`}
                    onClick={() => setSelectedSaved(item)}
                    style={{ position: "relative" }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnalysis(item.id);
                      }}
                      style={{
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        background: "#ff4d4d",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "22px",
                        height: "22px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      ×
                    </button>
                    #{item.jersey_number} {item.player_name}
                    <br />
                    {POSITION_NAMES[item.position] || item.position}
                    <br />
                    <small>{getUnit(item.position).toUpperCase()}</small>
                    <br />
                    <small>{new Date(item.created_at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="saved-detail">
              {selectedSaved ? (
                <>
                  <h3>
                    #{selectedSaved.jersey_number} {selectedSaved.player_name}
                  </h3>
                  <div className="ai-analysis-text">
                    {formatAnalysisText(selectedSaved.analysis_text).map((line, i) => (
                      <p
                        key={i}
                        className={
                          line.isHeader
                            ? "ai-header"
                            : line.isNumbered
                            ? "ai-numbered"
                            : "ai-line"
                        }
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <p>Select an analysis to view</p>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === "saved-game" && (
        <div className="saved-container">
          <h2>Saved Game Analysis</h2>

          <div className="saved-player-layout">
            <div className="saved-list tutorial-saved-game-list">
              {savedGameList.length === 0 && (
                <p className="tutorial-saved-game-empty">No saved game analysis yet.</p>
              )}
              {savedGameList.map((item) => (
                <div
                  key={item.id}
                  className={`saved-item ${selectedSavedGame?.id === item.id ? "active" : ""}`}
                  onClick={() => setSelectedSavedGame(item)}
                  style={{ position: "relative" }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedGameAnalysis(item.id);
                    }}
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "5px",
                      background: "#ff4d4d",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "22px",
                      height: "22px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </button>
                  {item.game_name || "Unnamed Game"}
                  <br />
                  <small>vs {item.opponent || "Unknown Opponent"}</small>
                  <br />
                  <small>{item.game_date || "—"}</small>
                  <br />
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                </div>
              ))}
            </div>

            <div className="saved-detail">
              {selectedSavedGame ? (
                <>
                  <h3>
                    {selectedSavedGame.game_name || "Unnamed Game"} vs {selectedSavedGame.opponent || "Unknown Opponent"}
                  </h3>
                  <p className="table-desc">Date: {selectedSavedGame.game_date || "—"}</p>
                  <div className="ai-analysis-text">
                    {formatAnalysisText(selectedSavedGame.analysis_text).map((line, i) => (
                      <p
                        key={i}
                        className={
                          line.isHeader
                            ? "ai-header"
                            : line.isNumbered
                            ? "ai-numbered"
                            : "ai-line"
                        }
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <p>Select a saved game analysis to view</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
