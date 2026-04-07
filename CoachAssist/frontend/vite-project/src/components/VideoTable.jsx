import React, { useState } from "react";

export default function VideoTable({ videoList, setVideoSrc, setVideoName, handleDeleteVideo, handleClipVideo, handleRenameVideo, handleUpscaleVideo, upscalingIds = new Set(), handleUpscaleClick }) {
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (videoId) => {
        setExpandedId(prev => prev === videoId ? null : videoId);
    };

    return (
        <div className="game-state-table-container analysis-side-table video-table">
            <div className="table-title-header">Video Library</div>

            <div className="table-header-row analysis-video-header">
                <div className="cell col-video-name">Filename</div>
                <div className="cell col-video-action">Action</div>
            </div>

            <div className="table-scroll-area analysis-alt-table-scroll">
                {videoList.length > 0 ? (
                    videoList.map((video) => {
                        // Check if this video is currently being upscaled
                        const isUpscaling = upscalingIds.has(video.id);
                    
                        return(
                        <React.Fragment key={video.id}>
                            <div className="table-row analysis-video-row">
                                <div className="cell col-video-name">{video.filename}</div>
                                <div className="cell col-video-action">
                                    <button
                                        className="video-toggle-btn"
                                        onClick={() => toggleExpand(video.id)}
                                    >
                                        {expandedId === video.id ? "▼" : "▶"}
                                    </button>
                                </div>
                            </div>
                            {expandedId === video.id && (
                                <div className="table-row video-action-table-row">
                                    <div className="cell video-action-cell">
                                        <div className="video-action-grid">
                                            <button
                                                className="player-view-btn"
                                                onClick={() => {
                                                    setVideoSrc(video.playback_url);
                                                    setVideoName(video.filename);
                                                }}
                                            >
                                                Play
                                            </button>
                                            <button
                                                className="player-view-btn"
                                                style={{ backgroundColor: '#dc3545' }}
                                                onClick={() => handleDeleteVideo(video.id)}
                                            >
                                                Delete
                                            </button>
                                            <button
                                                className="player-view-btn"
                                                style={{ backgroundColor: '#1291c4' }}
                                                onClick={() => handleRenameVideo(video.id)}
                                            >
                                                Rename
                                            </button>
                                            <button
                                                className="player-view-btn"
                                                style={{ backgroundColor: '#dc35ce' }}
                                                onClick={() => handleClipVideo(video.id)}
                                            >
                                                Clip
                                            </button>
                                            <button
                                                className="player-view-btn"
                                                style={{ backgroundColor: '#ab57ad' }}
                                                onClick={() => handleUpscaleClick(video.id)}
                                                disabled={isUpscaling}
                                            >
                                                {isUpscaling ? "Upscaling..." : "Upscale"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                        );
                    })
                ) : (
                    <div className="table-row analysis-video-row">
                        <div className="cell col-empty">No videos uploaded yet</div>
                    </div>
                )}
            </div>
        </div>
    );
}
