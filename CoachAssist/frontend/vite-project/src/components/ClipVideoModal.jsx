import React, { useState, useEffect, useRef, useCallback } from "react";
import "../styles/clip_modal.css";


export default function ClipVideoModal({ video, onSave, onDiscard }) {
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const [dragging, setDragging] = useState(null);

    const previewRef = useRef(null);
    const trackRef = useRef(null);

    useEffect(() => {
        if (previewRef.current) {
            const v = previewRef.current;
            const onMeta = () => {
                const dur = v.duration || 0;
                setDuration(dur);
                setEndTime(dur);
            };
            v.addEventListener("loadedmetadata", onMeta);
            if (v.readyState >= 1) onMeta();
            return () => v.removeEventListener("loadedmetadata", onMeta);
        }
    }, [video]);

    /* ── helpers ────────────────────────────────────────────── */
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    const pct = (val) => (duration > 0 ? (val / duration) * 100 : 0);

    const formatSec = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    /* ── drag handlers (pointer events) ────────────────────── */
    const positionFromEvent = useCallback(
        (e) => {
            if (!trackRef.current || duration === 0) return null;
            const rect = trackRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = clamp(x / rect.width, 0, 1);
            return +(ratio * duration).toFixed(2);
        },
        [duration]
    );

    const onPointerDown = (thumb) => (e) => {
        e.preventDefault();
        setDragging(thumb);
    };

    useEffect(() => {
        if (!dragging) return;

        const onMove = (e) => {
            const val = positionFromEvent(e);
            if (val === null) return;

            if (dragging === "start") {
                setStartTime(clamp(val, 0, endTime - 0.5));
            } else {
                setEndTime(clamp(val, startTime + 0.5, duration));
            }
        };

        const onUp = () => setDragging(null);

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    }, [dragging, startTime, endTime, duration, positionFromEvent]);

    /* Seek preview video when startTime changes */
    useEffect(() => {
        if (previewRef.current && duration > 0) {
            previewRef.current.currentTime = startTime;
        }
    }, [startTime, duration]);

    /* ── number-input handlers ─────────────────────────────── */
    const handleStartInput = (raw) => {
        const val = parseFloat(raw);
        if (isNaN(val)) { setStartTime(0); return; }
        setStartTime(clamp(val, 0, endTime - 0.5));
    };

    const handleEndInput = (raw) => {
        const val = parseFloat(raw);
        if (isNaN(val)) { setEndTime(duration); return; }
        setEndTime(clamp(val, startTime + 0.5, duration));
    };

    /* ── save ──────────────────────────────────────────────── */
    const handleSave = async () => {
        if (startTime >= endTime) return;
        setIsSaving(true);
        try {
            await onSave(startTime, endTime);
        } finally {
            setIsSaving(false);
        }
    };

    /* ── render ─────────────────────────────────────────────── */
    return (
        <div className="clip-modal-overlay">
            <div className="clip-modal">
                {/* Header */}
                <div className="clip-modal-header">
                    <h2>Clip Video</h2>
                    <span className="clip-modal-filename">{video.filename}</span>
                </div>

                {/* Preview player */}
                <div className="clip-preview-wrapper">
                    <video
                        ref={previewRef}
                        src={video.playback_url}
                        controls
                        className="clip-preview-video"
                    />
                </div>

                {/* Dual-handle range slider */}
                <div className="clip-slider-section">
                    <div className="clip-time-labels">
                        <span>{formatSec(startTime)}</span>
                        <span className="clip-duration-label">
                            Selection: {formatSec(endTime - startTime)}
                        </span>
                        <span>{formatSec(endTime)}</span>
                    </div>

                    <div className="clip-track" ref={trackRef}>
                        {/* Selected range highlight */}
                        <div
                            className="clip-range-fill"
                            style={{
                                left: `${pct(startTime)}%`,
                                width: `${pct(endTime) - pct(startTime)}%`,
                            }}
                        />

                        {/* Start thumb */}
                        <div
                            className={`clip-thumb clip-thumb-start ${dragging === "start" ? "active" : ""}`}
                            style={{ left: `${pct(startTime)}%` }}
                            onPointerDown={onPointerDown("start")}
                        >
                            <div className="clip-thumb-label">{formatSec(startTime)}</div>
                        </div>

                        {/* End thumb */}
                        <div
                            className={`clip-thumb clip-thumb-end ${dragging === "end" ? "active" : ""}`}
                            style={{ left: `${pct(endTime)}%` }}
                            onPointerDown={onPointerDown("end")}
                        >
                            <div className="clip-thumb-label">{formatSec(endTime)}</div>
                        </div>
                    </div>
                </div>

                {/* Numeric inputs */}
                <div className="clip-inputs-row">
                    <div className="clip-input-group">
                        <label htmlFor="clip-start-input">Start (seconds)</label>
                        <input
                            id="clip-start-input"
                            type="number"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={startTime}
                            onChange={(e) => handleStartInput(e.target.value)}
                        />
                    </div>
                    <div className="clip-input-group">
                        <label htmlFor="clip-end-input">End (seconds)</label>
                        <input
                            id="clip-end-input"
                            type="number"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={endTime}
                            onChange={(e) => handleEndInput(e.target.value)}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="clip-modal-footer">
                    <button
                        className="clip-btn clip-btn-save"
                        onClick={handleSave}
                        disabled={isSaving || startTime >= endTime}
                    >
                        {isSaving ? (
                            <>
                                <span className="spinner" />
                                Saving…
                            </>
                        ) : (
                            "Save Clip"
                        )}
                    </button>
                    <button
                        className="clip-btn clip-btn-discard"
                        onClick={onDiscard}
                        disabled={isSaving}
                    >
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
}
