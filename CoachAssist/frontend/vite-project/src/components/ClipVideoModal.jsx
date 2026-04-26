import React, { useState, useEffect, useRef, useCallback } from "react";
import "../styles/clip_modal.css";

export default function ClipVideoModal({
    video,
    onSave,
    onDiscard
}) {
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);

    const [isSaving, setIsSaving] = useState(false);

    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState("");
    const [status, setStatus] = useState(null);

    const [dragging, setDragging] = useState(null);

    const previewRef = useRef(null);
    const trackRef = useRef(null);

    /* ───────────────────────── metadata ───────────────────────── */
    useEffect(() => {
        if (!previewRef.current) return;

        const v = previewRef.current;

        const onMeta = () => {
            const dur = v.duration || 0;
            setDuration(dur);
            setEndTime(dur);
        };

        v.addEventListener("loadedmetadata", onMeta);
        if (v.readyState >= 1) onMeta();

        return () => v.removeEventListener("loadedmetadata", onMeta);
    }, [video]);

    /* ───────────────────────── helpers ───────────────────────── */
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    const pct = (val) =>
        duration > 0 ? (val / duration) * 100 : 0;

    const formatSec = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m.toString().padStart(2, "0")}:${sec
            .toString()
            .padStart(2, "0")}`;
    };

    const formatStep = (s) => {
        const map = {
            queued: "Queued",
            downloading: "Downloading",
            clipping: "Clipping",
            uploading: "Uploading",
            saving: "Finalizing",
            completed: "Done",
            processing: "Processing"
        };
        return map[s] || s;
    };

    /* ───────────────────────── drag logic ───────────────────────── */
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

    /* ───────────────────────── video scrub preview ───────────────────────── */
    useEffect(() => {
        if (previewRef.current && duration > 0) {
            previewRef.current.currentTime = startTime;
        }
    }, [startTime, duration]);

    /* ───────────────────────── polling ───────────────────────── */
    useEffect(() => {
        if (!jobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/upload-status/${jobId}`);
                if (!res.ok) return;

                const data = await res.json();

                setProgress(data.progress);
                setStep(data.step);
                setStatus(data.status);

                if (data.status === "done") {
                    clearInterval(interval);
                    setIsSaving(false);
                    return;
                }

                if (data.status === "failed") {
                    clearInterval(interval);
                    setIsSaving(false);
                }
            } catch (err) {
                console.error(err);
                clearInterval(interval);
                setIsSaving(false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [jobId]);

    /* ───────────────────────── inputs (unchanged UX) ───────────────────────── */
    const handleStartInput = (raw) => {
        const val = parseFloat(raw);
        if (isNaN(val)) return setStartTime(0);
        setStartTime(clamp(val, 0, endTime - 0.5));
    };

    const handleEndInput = (raw) => {
        const val = parseFloat(raw);
        if (isNaN(val)) return setEndTime(duration);
        setEndTime(clamp(val, startTime + 0.5, duration));
    };

    /* ───────────────────────── save ───────────────────────── */
    const handleSave = async () => {
        if (startTime >= endTime) return;

        setIsSaving(true);

        try {
            const res = await onSave(startTime, endTime);

            if (!res?.job_id) {
                throw new Error("Missing job_id");
            }

            setJobId(res.job_id);
            setStatus("queued");

        } catch (err) {
            console.error(err);
            setIsSaving(false);
        }
    };

    /* ───────────────────────── render ───────────────────────── */
    return (
        <div className="clip-modal-overlay">
            <div className="clip-modal">

                {/* Header */}
                <div className="clip-modal-header">
                    <h2>Clip Video</h2>
                    <span className="clip-modal-filename">
                        {video.filename}
                    </span>
                </div>

                {/* Preview */}
                <div className="clip-preview-wrapper">
                    <video
                        ref={previewRef}
                        src={video.playback_url}
                        controls
                        className="clip-preview-video"
                    />
                </div>

                {/* Slider */}
                <div className="clip-slider-section">
                    <div className="clip-time-labels">
                        <span>{formatSec(startTime)}</span>
                        <span>
                            Selection: {formatSec(endTime - startTime)}
                        </span>
                        <span>{formatSec(endTime)}</span>
                    </div>

                    <div className="clip-track" ref={trackRef}>
                        <div
                            className="clip-range-fill"
                            style={{
                                left: `${pct(startTime)}%`,
                                width: `${pct(endTime) - pct(startTime)}%`
                            }}
                        />

                        <div
                            className="clip-thumb clip-thumb-start"
                            style={{ left: `${pct(startTime)}%` }}
                            onPointerDown={onPointerDown("start")}
                        />

                        <div
                            className="clip-thumb clip-thumb-end"
                            style={{ left: `${pct(endTime)}%` }}
                            onPointerDown={onPointerDown("end")}
                        />
                    </div>
                </div>

                {/* Inputs (unchanged visually) */}
                <div className="clip-inputs-row">
                    <div className="clip-input-group">
                        <label>Start (seconds)</label>
                        <input
                            type="number"
                            value={startTime}
                            onChange={(e) =>
                                handleStartInput(e.target.value)
                            }
                        />
                    </div>

                    <div className="clip-input-group">
                        <label>End (seconds)</label>
                        <input
                            type="number"
                            value={endTime}
                            onChange={(e) =>
                                handleEndInput(e.target.value)
                            }
                        />
                    </div>
                </div>

                {/* Progress (only visible while active job exists) */}
                {jobId && (
                    <div className="clip-progress-bar">
                        <div
                            className="clip-progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Footer (UNCHANGED BUTTONS) */}
                <div className="clip-modal-footer">
                    <button
                        className="clip-btn clip-btn-save"
                        onClick={handleSave}
                        disabled={isSaving || startTime >= endTime}
                    >
                        {isSaving
                            ? `${formatStep(step)} (${progress}%)`
                            : "Save Clip"}
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