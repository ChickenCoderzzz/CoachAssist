import { useState, useRef, useEffect } from "react";

export default function useVideos(teamId, matchId) {
    const [videoList, setVideoList] = useState([]);
    const [videoSrc, setVideoSrc] = useState(null);
    const [videoName, setVideoName] = useState("");
    const [loadingVideos, setLoadingVideos] = useState(true);
    const videoRef = useRef(null);

    const token = localStorage.getItem("token");

    // Fetch videos from backend
    const fetchVideos = async () => {
        if (!token || !teamId || !matchId) return;

        try {
            const res = await fetch(
                `/teams/${teamId}/matches/${matchId}/videos`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!res.ok) {
                console.error("Failed to fetch videos", await res.text());
                return;
            }

            const videos = await res.json();
            setVideoList(videos);

            // Load the first video if exists
            if (videos.length > 0) {
                setVideoSrc(videos[0].playback_url);
                setVideoName(videos[0].filename);
            } else {
                setVideoSrc(null);
                setVideoName("");
            }
        } catch (err) {
            console.error("Error fetching videos:", err);
        } finally {
            setLoadingVideos(false);
        }
    };

    useEffect(() => {
        if (teamId && matchId) {
            fetchVideos();
        }
    }, [teamId, matchId]);

    const handleVideoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) {
            alert("No file selected.");
            return;
        }
        if (!token) {
            alert("You must be logged in. (No token)");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(
                `/teams/${teamId}/matches/${matchId}/videos`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                }
            );

            if (!res.ok) {
                const text = await res.text();
                alert("Upload failed: " + text);
                return;
            }

            const newVideo = await res.json();
            setVideoList(prev => [newVideo, ...prev]);
            setVideoSrc(newVideo.playback_url);
            setVideoName(newVideo.filename);

        } catch (err) {
            alert("Upload error: " + err);
        }
    };

    const handleDeleteVideo = async (videoId) => {
        try {
            const res = await fetch(
                `/teams/${teamId}/matches/${matchId}/videos/${videoId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!res.ok) {
                alert("Failed to delete video");
                return;
            }

            setVideoList(prev => prev.filter(video => video.id !== videoId));
            setVideoSrc(null);
            setVideoName("");
        } catch (err) {
            alert("Delete error: " + err);
        }
    };

    return {
        videoList,
        videoSrc,
        videoName,
        videoRef,
        loadingVideos,
        setVideoSrc,
        setVideoName,
        fetchVideos,
        handleVideoUpload,
        handleDeleteVideo
    };
}
