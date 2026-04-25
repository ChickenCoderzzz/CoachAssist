import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DrawboardWorkspace from "../components/Drawboard/DrawboardWorkspace";
import "../styles/drawboard.css";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const jsonHeaders = () => ({
  "Content-Type": "application/json",
  ...authHeaders(),
});

export default function GameBoardPage() {
  const { teamId, matchId, boardId } = useParams();
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState(null);

  const canEdit = userRole === "owner" || userRole === "editor";

  useEffect(() => {
    fetch(`/teams/${teamId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setUserRole(data.team?.user_role || "owner"));
  }, [teamId]);

  const reloadList = () => {
    setLoading(true);
    fetch(`/teams/${teamId}/drawboards?scope=game&match_id=${matchId}`, {
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => setBoards(data.drawboards || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!boardId) reloadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, matchId, boardId]);

  const handleCreate = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`/teams/${teamId}/drawboards`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          scope: "game",
          title: newTitle.trim(),
          match_id: Number(matchId),
          snapshot: { bg: "field", elements: [] },
          summary: "Initial board",
        }),
      });
      if (!res.ok) {
        window.alert("Create failed");
        return;
      }
      const data = await res.json();
      setNewTitle("");
      setShowCreate(false);
      navigate(`/team/${teamId}/match/${matchId}/board/${data.drawboard.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!boardToDelete) return;
    const res = await fetch(`/drawboards/${boardToDelete.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      setBoards((bs) => bs.filter((b) => b.id !== boardToDelete.id));
      setBoardToDelete(null);
    }
  };

  if (boardId) {
    return (
      <div style={{ paddingTop: "110px", paddingBottom: "60px", paddingLeft: "40px", paddingRight: "40px" }}>
        <button
          className="add-team-btn"
          onClick={() => navigate(`/team/${teamId}/match/${matchId}/board`)}
          style={{ marginBottom: "15px" }}
        >
          ← Back to Boards
        </button>
        <DrawboardWorkspace boardId={boardId} canEdit={canEdit} />
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "110px", paddingBottom: "60px" }}>
      <div style={{ marginLeft: "40px", marginBottom: "25px" }}>
        <button
          className="add-team-btn"
          onClick={() => navigate(`/team/${teamId}/match/${matchId}`)}
          style={{ marginBottom: "15px" }}
        >
          ← Back to Game
        </button>
        <h1>Game Boards</h1>
      </div>

      <div className="dashboard-container">
        <h2>Boards for this game</h2>
        <div className="dashboard-controls">
          {canEdit && (
            <button className="add-team-btn" onClick={() => setShowCreate(true)}>
              New board
            </button>
          )}
        </div>

        {loading && <p>Loading…</p>}
        {!loading && boards.length === 0 && (
          <p className="muted">No boards yet for this game.</p>
        )}

        <div className="team-grid">
          {boards.map((b) => (
            <div
              key={b.id}
              className="game-card"
              onClick={() => navigate(`/team/${teamId}/match/${matchId}/board/${b.id}`)}
            >
              {canEdit && (
                <button
                  className="game-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBoardToDelete(b);
                  }}
                >
                  X
                </button>
              )}
              <div className="game-title">{b.title}</div>
              <div className="game-opponent">by {b.created_by_username}</div>
              <div className="game-hover">
                <div className="game-description">
                  Updated {new Date(b.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>New game board</h2>
            <input
              placeholder="Board title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <div className="modal-actions">
              <button className="modal-primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </button>
              <button className="modal-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {boardToDelete && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <p>
              Delete <strong>{boardToDelete.title}</strong>?
              <br />
              <strong>This cannot be undone.</strong>
            </p>
            <button className="confirm-yes" onClick={handleDelete}>
              Yes, Delete
            </button>
            <button className="confirm-cancel" onClick={() => setBoardToDelete(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
