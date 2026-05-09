import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { findTutorial } from "./tutorials";
import "../styles/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifError, setNotifError] = useState("");
  const dropdownRef = useRef(null);

  const fetchInvites = useCallback(() => {
    fetch("/team-members/my-invites", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setInvites(data.invites || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchInvites();
    const handleFocus = () => fetchInvites();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchInvites]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAccept = async (inviteId) => {
    setNotifError("");
    try {
      const res = await fetch(`/team-members/invites/${inviteId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setNotifError(data.detail || "Failed to accept invite.");
        return;
      }
      fetchInvites();
      // Tell Dashboard (and any other listeners) to refetch their team list
      window.dispatchEvent(new CustomEvent("teams:refresh"));
      if (window.location.pathname !== "/dashboard") {
        navigate("/dashboard");
      }
    } catch {
      setNotifError("Failed to accept invite. Check your connection.");
    }
  };

  const handleDecline = async (inviteId) => {
    setNotifError("");
    try {
      const res = await fetch(`/team-members/invites/${inviteId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setNotifError(data.detail || "Failed to decline invite.");
        return;
      }
      fetchInvites();
    } catch {
      setNotifError("Failed to decline invite. Check your connection.");
    }
  };

  const handleTutorialClick = () => {
    if (findTutorial(window.location.pathname)) {
      // Tell GuidedTour to restart in place — no reload
      window.dispatchEvent(new CustomEvent("tutorial:restart"));
    } else {
      navigate("/tutorial");
    }
  };

  const toggleDropdown = () => {
    setShowDropdown((prev) => {
      const next = !prev;
      if (next) fetchInvites();
      return next;
    });
  };

  return (
    <div className="navbar">
      <button
        type="button"
        className="navbar-logo-button"
        onClick={() => navigate("/dashboard")}
        aria-label="Go to dashboard"
      >
        <img src={logo} alt="CoachAssist" className="navbar-logo" />
      </button>

      <div className="navbar-spacer" />

      <button
        type="button"
        className="navbar-link"
        onClick={() => navigate("/profile")}
      >
        Profile
      </button>

      <button
        type="button"
        className="navbar-link"
        onClick={handleTutorialClick}
      >
        Tutorial
      </button>

      <div ref={dropdownRef} className="navbar-notifications">
        <button
          type="button"
          className="navbar-link navbar-notifications-trigger"
          onClick={toggleDropdown}
          aria-haspopup="menu"
          aria-expanded={showDropdown}
        >
          Notifications
          {invites.length > 0 && (
            <span className="navbar-notification-badge" aria-label={`${invites.length} pending invites`}>
              {invites.length}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="navbar-dropdown" role="menu">
            <h4>Notifications</h4>

            {notifError && (
              <p className="navbar-dropdown-error">{notifError}</p>
            )}

            {invites.length === 0 ? (
              <p className="navbar-dropdown-empty">No new notifications</p>
            ) : (
              invites.map((inv) => (
                <div key={inv.id} className="navbar-invite">
                  <div className="navbar-invite-info">
                    <div className="navbar-invite-team">
                      <strong>{inv.team_name}</strong>
                    </div>
                    <div className="navbar-invite-role">
                      Invited as{" "}
                      <span className={`role-badge ${inv.role}`}>
                        {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="navbar-invite-actions">
                    <button
                      type="button"
                      className="confirm-yes"
                      onClick={() => handleAccept(inv.id)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="confirm-cancel"
                      onClick={() => handleDecline(inv.id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
