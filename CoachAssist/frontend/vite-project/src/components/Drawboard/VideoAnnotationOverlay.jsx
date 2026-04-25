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
 * Telestrator-style annotation modal: a fullscreen popup with the video on
 * the left and a transparent SVG annotation canvas layered directly over it.
 *
 * One drawboard row per video (created lazily on first save).
 */
export default function VideoAnnotationOverlay({
  teamId,
  matchId,
  videoId,
  videoSrc,
  videoTitle,
  canEdit,
  onClose,
}) {
  const [board, setBoard] = useState(null);
  const [snapshot, setSnapshot] = useState({ bg: "blank", elements: [] });
  const [mode, setMode] = useState("view"); // 'view' | 'edit'
  const [reloadKey, setReloadKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lock background scroll while modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc closes the modal.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Find or initialize the per-video board.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/teams/${teamId}/drawboards?scope=video&match_id=${matchId}&video_id=${videoId}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (cancelled) return;
        const existing = (data.drawboards || [])[0];
        if (existing) {
          const detail = await fetch(`/drawboards/${existing.id}`, { headers: authHeaders() });
          const dj = await detail.json();
          if (cancelled) return;
          setBoard(dj.drawboard);
          setSnapshot(dj.latest_version?.snapshot || { bg: "blank", elements: [] });
        } else {
          setBoard(null);
          setSnapshot({ bg: "blank", elements: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, matchId, videoId, reloadKey]);

  const handleSave = async (newSnapshot, summary) => {
    let target = board;
    if (!target) {
      const res = await fetch(`/teams/${teamId}/drawboards`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          scope: "video",
          title: videoTitle ? `Annotations: ${videoTitle}` : "Video annotations",
          match_id: Number(matchId),
          video_id: Number(videoId),
          snapshot: newSnapshot,
          summary: summary || null,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        window.alert(`Failed to create board: ${t}`);
        return;
      }
      const data = await res.json();
      target = data.drawboard;
      setBoard(target);
    } else {
      const res = await fetch(`/drawboards/${target.id}/versions`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ snapshot: newSnapshot, summary: summary || null }),
      });
      if (!res.ok) {
        window.alert("Save failed");
        return;
      }
    }
    setSnapshot(newSnapshot);
    setReloadKey((k) => k + 1);
    setMode("view");
  };

  return (
    <div
      className="vao-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="vao-modal">
        <div className="vao-modal-header">
          <h2>{videoTitle ? `Annotate: ${videoTitle}` : "Video annotations"}</h2>
          <div className="vao-controls">
            {canEdit && (
              <button
                className={`db-tool ${mode === "edit" ? "active" : ""}`}
                onClick={() => setMode(mode === "edit" ? "view" : "edit")}
                type="button"
              >
                {mode === "edit" ? "Stop annotating" : "Annotate"}
              </button>
            )}
            <button
              className="db-tool"
              onClick={() => setShowHistory((s) => !s)}
              type="button"
              disabled={!board}
            >
              {showHistory ? "Hide history" : "History"}
            </button>
            <button className="db-tool" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        <div className={`vao-modal-body ${showHistory && board ? "with-panel" : ""}`}>
          <div className="vao-stage">
            {videoSrc ? (
              <video
                src={videoSrc}
                controls
                className="vao-video"
              />
            ) : (
              <div className="vao-loading">No video loaded</div>
            )}

            {/* Annotation layer absolutely positioned over the video */}
            {!loading && (
              <div className={`vao-draw-layer ${mode === "edit" ? "edit" : "view"}`}>
                <DrawboardEditor
                  initialSnapshot={snapshot}
                  readOnly={mode !== "edit"}
                  transparentBg
                  onSave={handleSave}
                  height="100%"
                />
              </div>
            )}
          </div>

          {showHistory && board && (
            <VersionHistoryPanel
              boardId={board.id}
              canEdit={canEdit}
              reloadKey={reloadKey}
              onPreview={(v) => setSnapshot(v.snapshot)}
              onRestored={() => setReloadKey((k) => k + 1)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
