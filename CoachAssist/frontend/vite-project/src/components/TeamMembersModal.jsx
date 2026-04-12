import React, { useEffect, useState } from "react";

export default function TeamMembersModal({ teamId, onClose }) {
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchMembers = () => {
    fetch(`/teams/${teamId}/members`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [teamId]);

  const handleInvite = async () => {
    setError("");
    setSuccess("");

    if (!inviteEmail.trim()) {
      setError("Please enter an email address.");
      return;
    }

    try {
      const res = await fetch(`/teams/${teamId}/members/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ identifier: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Failed to send invite.");
        return;
      }

      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchMembers();
    } catch {
      setError("Failed to send invite.");
    }
  };

  const handleRemove = async (memberId) => {
    try {
      await fetch(`/teams/${teamId}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      fetchMembers();
    } catch {
      setError("Failed to remove member.");
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const res = await fetch(`/teams/${teamId}/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchMembers();
      }
    } catch {
      setError("Failed to update role.");
    }
  };

  const roleColor = (role) => {
    if (role === "owner") return "#8fd18e";
    if (role === "editor") return "#b9c9f0";
    return "#aaa";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ width: "500px", maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Team Members</h2>

        {/* Member List */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ marginBottom: "20px" }}>
            {members.map((m) => (
              <div key={m.id} className="member-row">
                <div style={{ flex: 1 }}>
                  <strong>
                    {m.username || m.full_name || m.invited_email}
                  </strong>
                  {m.status === "pending" && (
                    <span className="status-badge pending">Pending</span>
                  )}
                  {!m.username && m.status === "accepted" && (
                    <span style={{ color: "#999", fontSize: "12px", marginLeft: "8px" }}>
                      {m.invited_email}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {m.role === "owner" ? (
                    <span
                      className="role-badge"
                      style={{ background: roleColor("owner") }}
                    >
                      Owner
                    </span>
                  ) : (
                    <>
                      <select
                        className="role-select"
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        className="member-remove-btn"
                        onClick={() => handleRemove(m.id)}
                        title="Remove member"
                      >
                        X
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {members.length === 0 && (
              <p style={{ color: "#999" }}>No members yet.</p>
            )}
          </div>
        )}

        {/* Invite Form */}
        <h3 style={{ marginBottom: "8px" }}>Invite Member</h3>

        {error && <p style={{ color: "#ff9b9b", fontSize: "13px" }}>{error}</p>}
        {success && <p style={{ color: "#8fd18e", fontSize: "13px" }}>{success}</p>}

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            type="text"
            placeholder="Email or username"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ flex: 1, margin: 0 }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="role-select"
            style={{ width: "100px" }}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="modal-primary" onClick={handleInvite}>
            Send Invite
          </button>
          <button className="modal-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
