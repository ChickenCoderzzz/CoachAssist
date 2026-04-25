import { useEffect, useState } from "react";
import DrawboardEditor from "./DrawboardEditor";
import VersionHistoryPanel from "./VersionHistoryPanel";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const jsonHeaders = () => ({
  "Content-Type": "application/json",
  ...authHeaders(),
});

/**
 * Workspace shell shared by playbook + game-board pages: loads a drawboard,
 * renders the editor, shows the version history panel.
 */
export default function DrawboardWorkspace({ boardId, canEdit }) {
  const [board, setBoard] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showHistory, setShowHistory] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!boardId) return;
    setError("");
    fetch(`/drawboards/${boardId}`, { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setBoard(data.drawboard);
        setSnapshot(data.latest_version?.snapshot || { bg: "field", elements: [] });
        setPreviewVersion(null);
      })
      .catch((err) => setError(err.message));
  }, [boardId, reloadKey]);

  const handleSave = async (newSnapshot, summary) => {
    const res = await fetch(`/drawboards/${boardId}/versions`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ snapshot: newSnapshot, summary: summary || null }),
    });
    if (!res.ok) {
      const t = await res.text();
      window.alert(`Save failed: ${t}`);
      return;
    }
    setReloadKey((k) => k + 1);
  };

  if (error) return <p style={{ color: "#ff9b9b" }}>Error: {error}</p>;
  if (!board || snapshot === null) return <p>Loading board…</p>;

  const isPreviewing = previewVersion !== null;

  return (
    <div className="drawboard-workspace">
      <div className="drawboard-workspace-header">
        <div>
          <h2 style={{ marginBottom: 4 }}>{board.title}</h2>
          {isPreviewing && (
            <div className="muted">
              Previewing version by {previewVersion.author_username} —{" "}
              {new Date(previewVersion.created_at).toLocaleString()}{" "}
              <button
                className="db-tool"
                type="button"
                onClick={() => {
                  setPreviewVersion(null);
                  setReloadKey((k) => k + 1);
                }}
              >
                Exit preview
              </button>
            </div>
          )}
        </div>
        <button
          className="db-tool"
          type="button"
          onClick={() => setShowHistory((s) => !s)}
        >
          {showHistory ? "Hide history" : "Show history"}
        </button>
      </div>

      <div className={`drawboard-workspace-body ${showHistory ? "with-panel" : ""}`}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DrawboardEditor
            initialSnapshot={snapshot}
            readOnly={!canEdit || isPreviewing}
            onSave={canEdit && !isPreviewing ? handleSave : undefined}
          />
        </div>
        {showHistory && (
          <VersionHistoryPanel
            boardId={board.id}
            canEdit={canEdit}
            reloadKey={reloadKey}
            onPreview={(v) => {
              setSnapshot(v.snapshot);
              setPreviewVersion(v);
            }}
            onRestored={() => {
              setPreviewVersion(null);
              setReloadKey((k) => k + 1);
            }}
          />
        )}
      </div>
    </div>
  );
}
