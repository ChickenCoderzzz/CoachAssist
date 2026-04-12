import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/teams.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifError, setNotifError] = useState("");
  const dropdownRef = useRef(null);

  const fetchInvites = () => {
    fetch("/team-members/my-invites", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setInvites(data.invites || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
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
      // Reload dashboard so the newly joined team appears
      if (window.location.pathname === "/dashboard") {
        window.location.reload();
      } else {
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

  const clearCurrentPageTutorialKey = () => {
    const path = window.location.pathname;

    if (path === "/dashboard") {
      localStorage.removeItem("coachassist_tutorial_dashboard_seen");
      return true;
    }

    if (/^\/team\/[^/]+$/.test(path)) {
      localStorage.removeItem("coachassist_tutorial_team_seen");
      return true;
    }

    if (/^\/team\/[^/]+\/match\/[^/]+$/.test(path)) {
      localStorage.removeItem("coachassist_tutorial_analyze_seen");
      return true;
    }

    return false;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "85px",
        background: "#222",
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
        boxSizing: "border-box",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      {/* Logo → goes to dashboard */}
      <img
        src={logo}
        alt="CoachAssist Logo"
        style={{ height: "65px", cursor: "pointer" }}
        onClick={() => navigate("/dashboard")}
      />

      {/* Spacer pushes links to right */}
      <div style={{ flexGrow: 1 }}></div>

      {/* Profile */}
      <span
        style={{
          color: "white",
          marginRight: "25px",
          fontSize: "1.2rem",
          cursor: "pointer",
        }}
        onClick={() => navigate("/profile")}
      >
        Profile
      </span>

      {/* Tutorial */}
      <span
        style={{
          color: "white",
          marginRight: "25px",
          fontSize: "1.2rem",
          cursor: "pointer",
        }}
        onClick={() => {
          const cleared = clearCurrentPageTutorialKey();
          if (cleared) {
            window.location.reload();
          }
        }}
      >
        Tutorial
      </span>

      {/* Notifications */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <span
          style={{
            color: "white",
            fontSize: "1.2rem",
            cursor: "pointer",
            position: "relative",
          }}
          onClick={() => {
            setShowDropdown((prev) => {
              const next = !prev;
              if (next) fetchInvites();
              return next;
            });
          }}
        >
          Notifications
          {invites.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-8px",
                right: "-14px",
                background: "#d32f2f",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {invites.length}
            </span>
          )}
        </span>

        {/* Dropdown */}
        {showDropdown && (
          <div
            style={{
              position: "absolute",
              top: "40px",
              right: 0,
              width: "340px",
              background: "#3a3a3a",
              border: "2px solid #000",
              borderRadius: "12px",
              padding: "16px",
              color: "#fff",
              zIndex: 1001,
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", fontSize: "15px" }}>
              Notifications
            </h4>

            {notifError && (
              <p style={{ color: "#ff9b9b", fontSize: "12px", margin: "0 0 8px 0" }}>
                {notifError}
              </p>
            )}

            {invites.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>
                No new notifications
              </p>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #555",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px" }}>
                      <strong>{inv.team_name}</strong>
                    </div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>
                      Invited as{" "}
                      <span
                        className={`role-badge ${inv.role}`}
                        style={{ marginLeft: 0 }}
                      >
                        {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="confirm-yes"
                      style={{
                        padding: "3px 10px",
                        fontSize: "12px",
                        margin: 0,
                      }}
                      onClick={() => handleAccept(inv.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="confirm-cancel"
                      style={{
                        padding: "3px 10px",
                        fontSize: "12px",
                        margin: 0,
                      }}
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
