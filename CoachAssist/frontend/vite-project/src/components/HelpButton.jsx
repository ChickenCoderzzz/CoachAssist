import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { findTutorial } from "./tutorials";
import "../styles/help_button.css";

export default function HelpButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const currentTutorial = findTutorial(location.pathname);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close popover when route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleStartTour = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("tutorial:restart"));
  };

  const handleOpenTutorialPage = () => {
    setOpen(false);
    navigate("/tutorial");
  };

  return (
    <div ref={wrapRef} className="help-button-wrap">
      {open && (
        <div className="help-popover" role="menu">
          <div className="help-popover-title">Help & Tutorials</div>

          {currentTutorial ? (
            <button
              type="button"
              className="help-popover-action"
              onClick={handleStartTour}
            >
              Start {currentTutorial.label}
            </button>
          ) : (
            <p className="help-popover-empty">
              No guided tour for this page.
            </p>
          )}

          <button
            type="button"
            className="help-popover-action help-popover-secondary"
            onClick={handleOpenTutorialPage}
          >
            Open Tutorial page
          </button>
        </div>
      )}

      <button
        type="button"
        className="help-button"
        aria-label="Help and tutorials"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        ?
      </button>
    </div>
  );
}
