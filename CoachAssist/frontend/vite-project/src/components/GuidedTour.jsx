import { useEffect, useMemo, useState } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DASHBOARD_KEY = "coachassist_tutorial_dashboard_seen";
const ANALYZE_KEY = "coachassist_tutorial_analyze_seen";
const TEAM_KEY = "coachassist_tutorial_team_seen";

export default function GuidedTour() {
  const { user } = useAuth();
  const location = useLocation();

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetCheckTick, setTargetCheckTick] = useState(0);

  const isDashboardRoute = location.pathname === "/dashboard";
  const isAnalyzeRoute = /^\/team\/[^/]+\/match\/[^/]+$/.test(location.pathname);
  const isTeamRoute = /^\/team\/[^/]+$/.test(location.pathname);

  const dashboardSteps = useMemo(
    () => [
      {
        target: ".tutorial-dashboard-title",
        title: "Dashboard",
        content: "This is your main hub for managing teams.",
        disableBeacon: true,
      },
      {
        target: ".tutorial-add-team-btn",
        title: "Create Team",
        content: "Start by creating a team here.",
      },
    ],
    []
  );

  const analyzeSteps = useMemo(
    () => [
      {
        target: ".tutorial-analyze-title",
        title: "Analyze Game",
        content: "This page is where you review game state and player tables.",
        disableBeacon: true,
      },
      {
        target: ".tutorial-export-btn",
        title: "Export PDF",
        content: "Use this button to export the current player unit table as a PDF.",
      },
    ],
    []
  );

  const teamSteps = useMemo(
    () => [
      {
        target: ".tutorial-team-title",
        title: "Team Workspace",
        content: "This page is your team hub for games, roster, and history.",
        disableBeacon: true,
      },
      {
        target: ".tutorial-add-game-btn",
        title: "Add Game",
        content: "Create a new game entry here before analyzing film and stats.",
      },
      {
        target: ".tutorial-edit-roster-btn",
        title: "Manage Roster",
        content: "Open roster management to add/edit players and review player history.",
      },
    ],
    []
  );

  const currentTutorial = useMemo(() => {
    if (isDashboardRoute) {
      return { key: DASHBOARD_KEY, steps: dashboardSteps };
    }
    if (isTeamRoute) {
      return { key: TEAM_KEY, steps: teamSteps };
    }
    if (isAnalyzeRoute) {
      return { key: ANALYZE_KEY, steps: analyzeSteps };
    }
    return null;
  }, [
    isDashboardRoute,
    isTeamRoute,
    isAnalyzeRoute,
    dashboardSteps,
    teamSteps,
    analyzeSteps,
  ]);

  const activeSteps = currentTutorial?.steps ?? [];
  const tutorialKey = currentTutorial?.key ?? null;

  const targetExists = (target) => !!target && !!document.querySelector(target);

  const findNextValidStepIndex = (startIdx) => {
    for (let i = startIdx; i < activeSteps.length; i += 1) {
      if (targetExists(activeSteps[i]?.target)) return i;
    }
    return -1;
  };

  const markCurrentTutorialSeen = () => {
    if (tutorialKey) {
      localStorage.setItem(tutorialKey, "true");
    }
    setRun(false);
    setStepIndex(0);
  };

  useEffect(() => {
    if (!user || !currentTutorial || run) return;
    if (tutorialKey && localStorage.getItem(tutorialKey) === "true") return;

    const intervalId = window.setInterval(() => {
      setTargetCheckTick((tick) => tick + 1);
    }, 300);

    return () => window.clearInterval(intervalId);
  }, [user, currentTutorial, tutorialKey, run]);

  useEffect(() => {
    if (!user || !currentTutorial) {
      setRun(false);
      setStepIndex(0);
      return;
    }

    if (localStorage.getItem(tutorialKey) === "true") {
      setRun(false);
      setStepIndex(0);
      return;
    }

    const nextValidIndex = findNextValidStepIndex(stepIndex);
    if (nextValidIndex === -1) {
      setRun(false);
      return;
    }

    if (nextValidIndex !== stepIndex) {
      setStepIndex(nextValidIndex);
      return;
    }

    setRun(true);
  }, [user, currentTutorial, tutorialKey, stepIndex, activeSteps, targetCheckTick]);

  const handleCallback = (data) => {
    const { action, status, type, index } = data;

    if (action === ACTIONS.PREV || action === "prev") {
      setStepIndex(Math.max(0, index - 1));
      return;
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      markCurrentTutorialSeen();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + 1;

      if (nextIndex >= activeSteps.length) {
        markCurrentTutorialSeen();
        return;
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        const validIndex = findNextValidStepIndex(nextIndex);
        if (validIndex === -1) {
          markCurrentTutorialSeen();
          return;
        }
        setStepIndex(validIndex);
        return;
      }

      setStepIndex(nextIndex);
    }
  };

  if (!user || !currentTutorial) return null;

  return (
    <Joyride
      steps={activeSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling
      callback={handleCallback}
      locale={{
        back: "Back",
        close: "Finish",
        last: "Finish",
        next: "Next",
        skip: "Skip",
      }}
      styles={{ options: { zIndex: 12000 } }}
    />
  );
}
