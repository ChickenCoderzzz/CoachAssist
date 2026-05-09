import { useEffect, useMemo, useRef, useState } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  TUTORIAL_REPLAY_EVENT,
  TUTORIAL_RESET_EVENT,
  TUTORIAL_UNAVAILABLE_EVENT,
  getDefaultTutorialForPath,
  getTutorialById,
} from "../tutorial/tutorialSteps";

const TARGET_CHECK_INTERVAL_MS = 300;
const UNAVAILABLE_TIMEOUT_MS = 3500;

export default function GuidedTour() {
  const { user } = useAuth();
  const location = useLocation();

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetCheckTick, setTargetCheckTick] = useState(0);
  const [forcedTutorialId, setForcedTutorialId] = useState(null);
  const [replayNonce, setReplayNonce] = useState(0);
  const [notice, setNotice] = useState("");
  const [visibleSteps, setVisibleSteps] = useState([]);
  const unavailableNoticeShownRef = useRef(false);

  const currentTutorial = useMemo(() => {
    if (forcedTutorialId) {
      const forcedTutorial = getTutorialById(forcedTutorialId);
      if (forcedTutorial?.routePattern.test(location.pathname)) {
        return forcedTutorial;
      }
    }

    return getDefaultTutorialForPath(location.pathname);
  }, [forcedTutorialId, location.pathname]);

  const activeSteps = currentTutorial?.steps ?? [];
  const tutorialKey = currentTutorial?.key ?? null;

  const targetExists = (target) => {
    if (!target) return false;
    if (target === "body") return true;
    const element = document.querySelector(target);
    if (!element) return false;

    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0
    );
  };

  const getVisibleSteps = () =>
    activeSteps.filter((step) => targetExists(step?.target));

  const stepsMatch = (firstSteps, secondSteps) =>
    firstSteps.length === secondSteps.length &&
    firstSteps.every((step, index) => step === secondSteps[index]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), UNAVAILABLE_TIMEOUT_MS);
  };

  const markCurrentTutorialSeen = () => {
    if (tutorialKey) {
      localStorage.setItem(tutorialKey, "true");
      window.dispatchEvent(new CustomEvent(TUTORIAL_RESET_EVENT));
    }
    setRun(false);
    setStepIndex(0);
    setVisibleSteps([]);
    setForcedTutorialId(null);
  };

  useEffect(() => {
    const handleReplay = (event) => {
      const tutorialId = event.detail?.tutorialId || null;
      const requestedTutorial = tutorialId ? getTutorialById(tutorialId) : null;
      const nextTutorial = requestedTutorial || getDefaultTutorialForPath(location.pathname);

      if (!nextTutorial || !nextTutorial.routePattern.test(location.pathname)) {
        showNotice("No guided tutorial is available on this page yet. Open the Tutorial hub to replay another page.");
        return;
      }

      localStorage.removeItem(nextTutorial.key);
      setForcedTutorialId(nextTutorial.id);
      setStepIndex(0);
      setVisibleSteps([]);
      unavailableNoticeShownRef.current = false;
      setRun(false);
      setReplayNonce((nonce) => nonce + 1);
      setTargetCheckTick((tick) => tick + 1);
    };

    const handleUnavailable = (event) => {
      showNotice(event.detail?.message || "No tutorial available for this page yet.");
    };

    window.addEventListener(TUTORIAL_REPLAY_EVENT, handleReplay);
    window.addEventListener(TUTORIAL_UNAVAILABLE_EVENT, handleUnavailable);

    return () => {
      window.removeEventListener(TUTORIAL_REPLAY_EVENT, handleReplay);
      window.removeEventListener(TUTORIAL_UNAVAILABLE_EVENT, handleUnavailable);
    };
  }, [location.pathname]);

  useEffect(() => {
    setRun(false);
    setStepIndex(0);
    setVisibleSteps([]);
    setForcedTutorialId(null);
    unavailableNoticeShownRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (!user || !currentTutorial || run) return;
    if (tutorialKey && localStorage.getItem(tutorialKey) === "true") return;

    const intervalId = window.setInterval(() => {
      setTargetCheckTick((tick) => tick + 1);
    }, TARGET_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [user, currentTutorial, tutorialKey, run, replayNonce]);

  useEffect(() => {
    if (!user || !currentTutorial) {
      setRun(false);
      setStepIndex(0);
      if (visibleSteps.length > 0) {
        setVisibleSteps([]);
      }
      return;
    }

    if (localStorage.getItem(tutorialKey) === "true") {
      setRun(false);
      setStepIndex(0);
      if (visibleSteps.length > 0) {
        setVisibleSteps([]);
      }
      return;
    }

    const nextVisibleSteps = getVisibleSteps();

    if (nextVisibleSteps.length === 0) {
      setRun(false);
      if (activeSteps.length > 0 && !unavailableNoticeShownRef.current) {
        showNotice("Some tutorial steps are unavailable because features are hidden for your role or no data exists yet.");
        unavailableNoticeShownRef.current = true;
      }
      return;
    }

    if (!stepsMatch(visibleSteps, nextVisibleSteps)) {
      setRun(false);
      setStepIndex(0);
      setVisibleSteps(nextVisibleSteps);
      unavailableNoticeShownRef.current = false;
      return;
    }

    setRun(true);
  }, [user, currentTutorial, tutorialKey, activeSteps, visibleSteps, targetCheckTick, replayNonce]);

  const handleCallback = (data) => {
    const { action, status, type, index } = data;
    const isCloseAction = action === ACTIONS.CLOSE || action === "close";
    const isSkipAction = action === ACTIONS.SKIP || action === "skip";
    const isNextAction = action === ACTIONS.NEXT || action === "next";
    const isPrevAction = action === ACTIONS.PREV || action === "prev";

    if (
      isCloseAction ||
      isSkipAction ||
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      markCurrentTutorialSeen();
      return;
    }

    if (isPrevAction) {
      setStepIndex(Math.max(0, index - 1));
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      const updatedVisibleSteps = visibleSteps
        .slice(0, index)
        .concat(
          visibleSteps
            .slice(index + 1)
            .filter((step) => targetExists(step?.target))
        );

      if (index >= updatedVisibleSteps.length) {
        markCurrentTutorialSeen();
        showNotice("Some tutorial steps were skipped because those features are not available right now.");
        return;
      }

      setVisibleSteps(updatedVisibleSteps);
      setStepIndex(index);
      return;
    }

    if (type === EVENTS.STEP_AFTER && isNextAction) {
      const nextIndex = index + 1;

      if (nextIndex >= visibleSteps.length) {
        markCurrentTutorialSeen();
        return;
      }

      setStepIndex(nextIndex);
    }
  };

  return (
    <>
      {notice && (
        <div
          style={{
            position: "fixed",
            top: "96px",
            right: "24px",
            zIndex: 13000,
            maxWidth: "360px",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "2px solid #222",
            background: "#fff8d6",
            color: "#222",
            boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      )}

      {user && currentTutorial && visibleSteps.length > 0 && (
        <Joyride
          steps={visibleSteps}
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
      )}
    </>
  );
}
