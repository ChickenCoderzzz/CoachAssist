import { useEffect, useState } from "react";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { findTutorial } from "./tutorials";

export default function GuidedTour() {
  const { user } = useAuth();
  const location = useLocation();

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [pendingStart, setPendingStart] = useState(false);
  const [targetCheckTick, setTargetCheckTick] = useState(0);
  const [restartCount, setRestartCount] = useState(0);

  const currentTutorial = findTutorial(location.pathname);
  const activeSteps = currentTutorial?.steps ?? [];
  const tutorialKey = currentTutorial?.key ?? null;

  const targetExists = (target) => !!target && !!document.querySelector(target);

  const findNextValidStepIndex = (startIdx) => {
    for (let i = startIdx; i < activeSteps.length; i += 1) {
      if (targetExists(activeSteps[i]?.target)) return i;
    }
    return -1;
  };

  const endTour = () => {
    setRun(false);
    setStepIndex(0);
    setPendingStart(false);
  };

  // Reset state on route change — a tour from a previous page should not carry over
  useEffect(() => {
    setRun(false);
    setStepIndex(0);
    setPendingStart(false);
  }, [tutorialKey]);

  // Listen for user-initiated restart (Navbar "Tutorial" / Help button)
  useEffect(() => {
    const handleRestart = () => {
      if (!currentTutorial) return;
      setStepIndex(0);
      setRun(false);
      setPendingStart(true);
      setRestartCount((c) => c + 1);
    };
    window.addEventListener("tutorial:restart", handleRestart);
    return () => window.removeEventListener("tutorial:restart", handleRestart);
  }, [currentTutorial]);

  // While waiting for targets to render, poll the DOM
  useEffect(() => {
    if (!pendingStart || run) return;
    const id = window.setInterval(() => {
      setTargetCheckTick((t) => t + 1);
    }, 300);
    return () => window.clearInterval(id);
  }, [pendingStart, run]);

  // When a start is pending and the target exists, kick off the tour
  useEffect(() => {
    if (!pendingStart || !user || !currentTutorial) return;

    const nextValidIndex = findNextValidStepIndex(stepIndex);
    if (nextValidIndex === -1) return;
    if (nextValidIndex !== stepIndex) {
      setStepIndex(nextValidIndex);
      return;
    }

    setRun(true);
    setPendingStart(false);
  }, [pendingStart, user, currentTutorial, stepIndex, activeSteps, targetCheckTick]);

  const handleEvent = (data) => {
    const { action, status, type, index } = data;

    if (action === ACTIONS.PREV) {
      setStepIndex(Math.max(0, index - 1));
      return;
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.SKIP) {
      endTour();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + 1;

      if (nextIndex >= activeSteps.length) {
        endTour();
        return;
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        const validIndex = findNextValidStepIndex(nextIndex);
        if (validIndex === -1) {
          endTour();
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
      key={`${tutorialKey}-${restartCount}`}
      steps={activeSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        showProgress: true,
        skipBeacon: true,
        buttons: ["back", "skip", "primary"],
        closeButtonAction: "skip",
        zIndex: 12000,
      }}
      locale={{
        back: "Back",
        close: "Finish",
        last: "Finish",
        next: "Next",
        skip: "Skip",
      }}
    />
  );
}
