import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/calendar.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function TeamCalendarPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);

  const buildEventDates = (m) => {
    const base = (m.game_date || "").slice(0, 10);
    if (!base) return null;
    const start = new Date(`${base}T18:00:00`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    return { start, end, startStr: fmt(start), endStr: fmt(end) };
  };

  const googleCalUrl = (m) => {
    const dates = buildEventDates(m);
    if (!dates) return "#";
    const title = `${m.name || "Game"} vs ${m.opponent}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${dates.startStr}/${dates.endStr}`,
      details: `${title}${
        m.team_score != null ? ` — Final: ${m.team_score}-${m.opponent_score}` : ""
      }`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const downloadIcs = (m) => {
    const dates = buildEventDates(m);
    if (!dates) return;
    const title = `${m.name || "Game"} vs ${m.opponent}`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CoachAssist//EN",
      "BEGIN:VEVENT",
      `UID:${m.id}@coachassist`,
      `DTSTAMP:${dates.startStr}`,
      `DTSTART:${dates.startStr}`,
      `DTEND:${dates.endStr}`,
      `SUMMARY:${title}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  // Fetch matches
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

  // Build a map of date string → array of matches
  const matchesByDate = {};
  matches.forEach((m) => {
    if (!m.game_date) return;
    // Normalize to YYYY-MM-DD
    const key = m.game_date.slice(0, 10);
    if (!matchesByDate[key]) matchesByDate[key] = [];
    matchesByDate[key].push(m);
  });

  // Calendar grid cells for the current month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const d = new Date(year, month - 1, day);
    cells.push({ day, date: d, outside: true });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, month, d), outside: false });
  }

  // Next month padding (fill to complete last row)
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, date: new Date(year, month + 1, d), outside: true });
    }
  }

  const goBack = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goForward = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const getResult = (teamScore, opponentScore) => {
    if (teamScore == null || opponentScore == null) return "neutral";
    if (teamScore > opponentScore) return "win";
    if (teamScore < opponentScore) return "loss";
    return "neutral";
  };

  const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const isToday = (date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (loading) {
    return <p style={{ paddingTop: "110px", paddingLeft: "40px" }}>Loading…</p>;
  }

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
        <h1>Team Calendar</h1>
        <button className="add-team-btn" onClick={() => navigate(`/team/${teamId}`)}>
          ← Back to Team
        </button>
      </div>

      {/* Calendar */}
      <div className="calendar-container">
        {/* Month navigation */}
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={goBack}>←</button>
          <h2>{MONTHS[month]} {year}</h2>
          <button className="calendar-nav-btn" onClick={goForward}>→</button>
        </div>

        {/* Grid */}
        <div className="calendar-grid">
          {/* Day headers */}
          {DAYS.map((d) => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}

          {/* Day cells */}
          {cells.map((cell, idx) => {
            const key = formatDateKey(cell.date);
            const dayMatches = matchesByDate[key] || [];
            const col = idx % 7;
            const alignRight = col >= 4;
            const cellClass = [
              "calendar-cell",
              cell.outside ? "outside-month" : "",
              !cell.outside && isToday(cell.date) ? "today" : "",
            ].join(" ").trim();

            return (
              <div key={idx} className={cellClass}>
                <div className="calendar-day-number">{cell.day}</div>
                {!cell.outside && dayMatches.map((m) => {
                  const result = getResult(m.team_score, m.opponent_score);
                  return (
                    <div
                      key={m.id}
                      className="calendar-game-wrap"
                      onMouseEnter={() => setHoveredId(m.id)}
                      onMouseLeave={() => setHoveredId((id) => (id === m.id ? null : id))}
                    >
                      <button
                        className={`calendar-game ${result}`}
                        onClick={() => navigate(`/team/${teamId}/match/${m.id}`)}
                      >
                        vs {m.opponent}
                        {m.team_score != null && (
                          <span className="game-score-label">
                            {" "}{m.team_score}–{m.opponent_score}
                          </span>
                        )}
                      </button>
                      {hoveredId === m.id && (
                        <div
                          className={`calendar-popover ${alignRight ? "align-right" : ""}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="popover-title">
                            {m.name || "Game"} vs {m.opponent}
                          </div>
                          <div className="popover-row">
                            <strong>Date:</strong> {key}
                          </div>
                          {m.team_score != null && (
                            <div className="popover-row">
                              <strong>Result:</strong>{" "}
                              {result === "win" ? "W" : result === "loss" ? "L" : "—"}{" "}
                              {m.team_score}–{m.opponent_score}
                            </div>
                          )}
                          <div className="popover-actions">
                            <a
                              href={googleCalUrl(m)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="popover-btn"
                            >
                              Google Calendar
                            </a>
                            <button
                              type="button"
                              className="popover-btn"
                              onClick={() => downloadIcs(m)}
                            >
                              Download .ics
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
