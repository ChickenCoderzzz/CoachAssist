import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/game_history.css";

export default function GameHistoryPage() {
    const { teamId } = useParams();
    const navigate = useNavigate();

    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch matches for this team
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

    // Format date from "2025-09-05" → "9/5"
    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr + "T00:00:00"); // avoid timezone shift
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    // Determine W/L
    const getResult = (teamScore, opponentScore) => {
        if (teamScore == null || opponentScore == null) return "—";
        if (teamScore > opponentScore) return "W";
        if (teamScore < opponentScore) return "L";
        return "T";
    };

    // Sort matches by game_date ascending
    const sortedMatches = [...matches].sort(
        (a, b) => new Date(a.game_date) - new Date(b.game_date)
    );

    if (loading) {
        return (
            <p style={{ paddingTop: "110px", paddingLeft: "40px" }}>Loading…</p>
        );
    }

    return (
        <div className="game-history-page">
            {/* Header */}
            <div className="game-history-header">
                <h1>Game History</h1>
                <button className="go-back-btn" onClick={() => navigate(`/team/${teamId}`)}>
                    Go Back
                </button>
            </div>

            {/* Table */}
            <div className="game-history-table-wrapper">
                {sortedMatches.length === 0 ? (
                    <p className="no-games-msg">No games recorded yet.</p>
                ) : (
                    <table className="game-history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Opponent</th>
                                <th>Home</th>
                                <th>Away</th>
                                <th>W/L</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMatches.map((match) => {
                                const result = getResult(match.team_score, match.opponent_score);
                                return (
                                    <tr key={match.id}>
                                        <td>{formatDate(match.game_date)}</td>
                                        <td>{match.opponent}</td>
                                        <td>{match.team_score ?? "—"}</td>
                                        <td>{match.opponent_score ?? "—"}</td>
                                        <td>
                                            <span
                                                className={
                                                    result === "W"
                                                        ? "wl-win"
                                                        : result === "L"
                                                            ? "wl-loss"
                                                            : ""
                                                }
                                            >
                                                {result}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="view-game-btn"
                                                title="View game details"
                                                onClick={() =>
                                                    navigate(`/team/${teamId}/match/${match.id}`)
                                                }
                                            >
                                                🔍
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
