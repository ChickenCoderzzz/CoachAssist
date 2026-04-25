import { useEffect, useState } from "react";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function VersionHistoryPanel({
  boardId,
  canEdit,
  reloadKey,
  onPreview,
  onRestored,
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    fetch(`/drawboards/${boardId}/versions`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setVersions(data.versions || []))
      .finally(() => setLoading(false));
  }, [boardId, reloadKey]);

  const handlePreview = async (versionId) => {
    setActiveId(versionId);
    const res = await fetch(`/drawboards/${boardId}/versions/${versionId}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    onPreview?.(data.version);
  };

  const handleRestore = async (versionId) => {
    if (!window.confirm("Restore this version? It will be added as a new version at the top.")) return;
    const res = await fetch(`/drawboards/${boardId}/versions/${versionId}/restore`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (res.ok) {
      setActiveId(null);
      onRestored?.();
    } else {
      window.alert("Restore failed");
    }
  };

  return (
    <aside className="drawboard-history">
      <h3>Version history</h3>
      {loading && <p>Loading…</p>}
      {!loading && versions.length === 0 && <p className="muted">No versions yet.</p>}
      <ul>
        {versions.map((v, i) => (
          <li key={v.id} className={activeId === v.id ? "active" : ""}>
            <div className="vh-meta">
              <strong>{v.author_username}</strong>
              <span className="muted">{formatTime(v.created_at)}</span>
            </div>
            {v.summary && <div className="vh-summary">{v.summary}</div>}
            <div className="vh-actions">
              <button onClick={() => handlePreview(v.id)} type="button">
                {i === 0 ? "View current" : "Preview"}
              </button>
              {canEdit && i !== 0 && (
                <button onClick={() => handleRestore(v.id)} type="button">
                  Restore
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
