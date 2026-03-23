import React, { useState } from "react";

export default function VideoTable({ videoList, setVideoSrc, setVideoName, handleDeleteVideo, handleClipVideo, handleRenameVideo, handleUpscaleVideo, upscalingIds = new Set(), handleUpscaleClick }) {
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (videoId) => {
        setExpandedId(prev => prev === videoId ? null : videoId);
    };

    return (
        <div className="game-state-table-container player-table video-table">
            <div className="table-title-header">Video Library</div>

            {/* Table header row */}
            <div className="player-table-header">
                <div>Filename</div>
                <div>Action</div>
            </div>

            {/* Video rows */}
            <div className="player-table-body">
                {videoList.length > 0 ? (
                    videoList.map((video) => {
                        // Check if this video is currently being upscaled
                        const isUpscaling = upscalingIds.has(video.id);
                    
                        return(
                        <React.Fragment key={video.id}>
                            <div className="player-table-row">
                                <div>{video.filename}</div>
                                <div>
                                    <button
                                        className="video-toggle-btn"
                                        onClick={() => toggleExpand(video.id)}
                                    >
                                        {expandedId === video.id ? "▼" : "▶"}
                                    </button>
                                </div>
                            </div>
                            {expandedId === video.id && (
                                <div className="video-action-row">
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
                            )}
                        </React.Fragment>
                        );
                    })
                ) : (
                    <div className="player-table-row">
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                            No videos uploaded yet
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
