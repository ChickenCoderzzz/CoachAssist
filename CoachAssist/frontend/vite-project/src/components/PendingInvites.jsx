import React, { useEffect, useState } from "react";

export default function PendingInvites() {
  const [invites, setInvites] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
  }, []);

  const handleAccept = async (inviteId) => {
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/team-members/invites/${inviteId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Failed to accept invite.");
        return;
      }

      setSuccess(data.message || "Invite accepted!");
      fetchInvites();
    } catch {
      setError("Failed to accept invite.");
    }
  };

  const handleDecline = async (inviteId) => {
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/team-members/invites/${inviteId}/decline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        fetchInvites();
      }
    } catch {
      setError("Failed to decline invite.");
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className="invite-banner">
      <h3>Pending Invitations</h3>

      {error && <p style={{ color: "#ff9b9b", fontSize: "13px" }}>{error}</p>}
      {success && <p style={{ color: "#8fd18e", fontSize: "13px" }}>{success}</p>}

      {invites.map((inv) => (
        <div key={inv.id} className="invite-row">
          <div style={{ flex: 1 }}>
            <strong>{inv.team_name}</strong>
            <span className={`role-badge ${inv.role}`}>
              {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="confirm-yes"
              style={{ padding: "4px 12px", fontSize: "13px", margin: 0 }}
              onClick={() => handleAccept(inv.id)}
            >
              Accept
            </button>
            <button
              className="confirm-cancel"
              style={{ padding: "4px 12px", fontSize: "13px", margin: 0 }}
              onClick={() => handleDecline(inv.id)}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
