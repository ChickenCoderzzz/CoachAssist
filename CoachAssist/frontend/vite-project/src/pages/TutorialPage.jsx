import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FULL_WORKFLOW_TUTORIAL,
  TUTORIAL_RESET_EVENT,
  TUTORIALS,
  clearTutorialStatus,
  getTutorialStatus,
  requestTutorialReplay,
} from "../tutorial/tutorialSteps";

export default function TutorialPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const refreshStatuses = () => setRefreshKey((key) => key + 1);
    window.addEventListener(TUTORIAL_RESET_EVENT, refreshStatuses);
    window.addEventListener("storage", refreshStatuses);

    return () => {
      window.removeEventListener(TUTORIAL_RESET_EVENT, refreshStatuses);
      window.removeEventListener("storage", refreshStatuses);
    };
  }, []);

  const replayTutorial = (tutorial) => {
    clearTutorialStatus(tutorial.id);

    if (tutorial.routePattern.test(window.location.pathname)) {
      requestTutorialReplay(tutorial.id);
      return;
    }

    if (tutorial.pathHint) {
      navigate(tutorial.pathHint);
    }
  };

  const startFullTutorial = () => {
    clearTutorialStatus("dashboard");
    localStorage.removeItem(FULL_WORKFLOW_TUTORIAL.key);
    navigate(FULL_WORKFLOW_TUTORIAL.pathHint);
  };

  return (
    <div
      style={{
        paddingTop: "110px",
        paddingLeft: "40px",
        paddingRight: "40px",
        paddingBottom: "60px",
      }}
    >
      <h1 style={{ marginBottom: "10px" }}>Tutorial Hub</h1>
      <p style={{ maxWidth: "820px", lineHeight: 1.5 }}>
        Replay guided page tours, check what you have completed, or start the
        main CoachAssist workflow from the dashboard.
      </p>

      <div
        style={{
          border: "3px solid black",
          borderRadius: "12px",
          padding: "22px",
          maxWidth: "1050px",
          marginTop: "20px",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 6px" }}>Full Workflow</h2>
            <p style={{ margin: 0, color: "#555" }}>
              Dashboard to team setup, roster, games, analysis, saving, and exports.
            </p>
          </div>
          <button className="add-team-btn" onClick={startFullTutorial}>
            Start Full Tutorial
          </button>
        </div>

        <ol style={{ marginTop: 0 }}>
          {FULL_WORKFLOW_TUTORIAL.steps.map((item) => (
            <li key={item} style={{ marginBottom: "4px" }}>
              {item}
            </li>
          ))}
        </ol>
      </div>

      <div
        key={refreshKey}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          maxWidth: "1050px",
          marginTop: "22px",
        }}
      >
        {TUTORIALS.map((tutorial) => {
          const completed = getTutorialStatus(tutorial);
          const canNavigate = Boolean(tutorial.pathHint);

          return (
            <div
              key={tutorial.id}
              style={{
                border: "2px solid #222",
                borderRadius: "8px",
                padding: "16px",
                background: completed ? "#eef9ef" : "#fff",
              }}
            >
              <h3 style={{ margin: "0 0 8px" }}>{tutorial.label}</h3>
              <p style={{ margin: "0 0 12px", fontWeight: "bold" }}>
                {completed ? "Completed" : "Not completed"}
              </p>
              <button
                className="add-team-btn"
                onClick={() => replayTutorial(tutorial)}
                style={{ width: "100%" }}
              >
                {canNavigate || tutorial.routePattern.test(window.location.pathname)
                  ? "Replay Tutorial"
                  : "Reset Completion"}
              </button>
              {!canNavigate && !tutorial.routePattern.test(window.location.pathname) && (
                <p style={{ margin: "10px 0 0", color: "#555", fontSize: "13px" }}>
                  Open the matching team page to replay this guided tour.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
