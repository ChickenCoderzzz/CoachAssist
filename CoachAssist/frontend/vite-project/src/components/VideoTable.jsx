import React from "react";

export default function VideoTable({ videoList, setVideoSrc, setVideoName, handleDeleteVideo, handleClipVideo }) {
    return (
        <div className="game-state-table-container player-table">
            <div className="table-title-header">Video Library</div>

            {/* Table header row */}
            <div className="player-table-header">
                <div>Filename</div>
                <div>Action</div>
            </div>

            {/* Video rows */}
            <div className="player-table-body">
                {videoList.length > 0 ? (
                    videoList.map((video) => (
                        <div className="player-table-row" key={video.id}>
                            <div>{video.filename}</div>
                            <div style={{ display: 'flex', gap: '10px' }}>
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
                                    style={{ backgroundColor: '#dc35ce' }}
                                    onClick={() => handleClipVideo(video.id)}
                                >
                                    Clip
                                </button>
                            </div>
                        </div>
                    ))
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
