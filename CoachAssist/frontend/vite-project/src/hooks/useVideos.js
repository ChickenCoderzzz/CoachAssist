import { useState, useRef, useEffect } from "react";

export default function useVideos(teamId, matchId) {
    const [videoList, setVideoList] = useState([]);
    const [videoSrc, setVideoSrc] = useState(null);
    const [videoName, setVideoName] = useState("");
    const [loadingVideos, setLoadingVideos] = useState(true); //videos being fetched
    const videoRef = useRef(null);
    const [uploading, setUploading] = useState(false); // video uploading 
    const [upscaleJobs, setUpscaleJobs] = useState({}); // videos being upscaled
    // Clip modal state – holds the video object being clipped, or null
    const [clipTarget, setClipTarget] = useState(null);

    const token = localStorage.getItem("token");

    const openClipModal = (videoId) => {
        const video = videoList.find(v => v.id === videoId);
        if (video) setClipTarget(video);
    };

    const closeClipModal = () => setClipTarget(null);

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
                return [];
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

            return videos;
        } catch (err) {
            console.error("Error fetching videos:", err);
            return [];
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
        if (!file) return alert("No file selected.");
        if (!token) return alert("You must be logged in.");

        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploading(true);

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

            // add the new video at the top
            setVideoList(prev => [newVideo, ...prev]);
            setVideoSrc(newVideo.playback_url);
            setVideoName(newVideo.filename);

            //fetch the whole list again to ensure backend sync
            await fetchVideos();
            
        } catch (err) {
            alert("Upload error: " + err);
        } finally {
            setUploading(false);
        }
    };

    const startPolling = (videoId, jobId) => {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(
                `/teams/${teamId}/matches/${matchId}/videos/${jobId}/upscale-status`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!res.ok) return;

            const job = await res.json();

            // Update job state
            setUpscaleJobs(prev => ({
                ...prev,
                [videoId]: job
            }));

            // Stop polling when done
            if (job.status === "done" || job.status === "failed") {
                clearInterval(interval);

                // Refresh videos when done
                if (job.status === "done") {
                    fetchVideos();
                }
            }

        } catch (err) {
            console.error("Polling error:", err);
            clearInterval(interval);
        }
    }, 2000);
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

    const handleClipVideo = async (start, end) => {
        if (!token) {
            alert("You must be logged in.");
            return;
        }

        if (!clipTarget) {
            alert("No video selected for clipping.");
            return;
        }

        const videoId = clipTarget.id;

        if (isNaN(start) || isNaN(end) || start < 0 || end <= start) {
            alert("Invalid time range.");
            return;
        }

        try {
            const res = await fetch(
                `/teams/${teamId}/matches/${matchId}/videos/${videoId}/clip`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ start, end })
                }
            );

            if (!res.ok) {
                const text = await res.text();
                alert("Clip failed: " + text);
                return;
            }

            const newClip = await res.json();

            // add new clip to list
            setVideoList(prev => [newClip, ...prev]);

            // set as active
            setVideoSrc(newClip.playback_url);
            setVideoName(newClip.filename);

            // close modal
            setClipTarget(null);

        } catch (err) {
            alert("Clip error: " + err);
        }
    };

    const handleRenameVideo = async (videoId, newName = "") => {
        if (!token) {
            alert("You must be logged in.");
            return;
        }

        let finalName = newName || prompt("Enter new video name:");
        if (!finalName) return;

        if (finalName.trim() === "") {
            alert("Video name cannot be empty.");
            return;
        }

        try {
            const res = await fetch(
                `/teams/${teamId}/matches/${matchId}/videos/${videoId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ filename: finalName })
                }
            );

            if (!res.ok) {
                alert("Failed to rename video");
                return;
            }

            const updatedVideo = await res.json();
            setVideoList(prev => 
                prev.map(video => video.id === videoId ? updatedVideo : video)
            );

            if (videoSrc && videoList.find(v => v.id === videoId)?.playback_url === videoSrc) {
                setVideoName(finalName);
            }

        } catch (err) {
            alert("Rename error: " + err);
        }
    };

    const handleUpscaleVideo = async (videoId) => {
    if (!token) {
        alert("You must be logged in.");
        return;
    }

    const res = await fetch(
        `/teams/${teamId}/matches/${matchId}/videos/${videoId}/upscale`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await res.json();

    if (!res.ok) {
        alert("Upscale failed: " + JSON.stringify(data));
        return;
    }

    return data; // contains job_id + status
    };

    const handleUpscaleClick = async (videoId) => {
    try {
        const data = await handleUpscaleVideo(videoId);

        if (!data || !data.job_id) return;

        const jobId = data.job_id;

        // Start polling this job
        startPolling(videoId, jobId);

    } catch (err) {
        console.error(err);
    }
    };

    return {
        videoList,
        videoSrc,
        videoName,
        videoRef,
        loadingVideos,
        uploading,
        upscaleJobs,
        clipTarget,
        setVideoSrc,
        setVideoName,
        fetchVideos,
        handleVideoUpload,
        handleDeleteVideo,
        handleRenameVideo,
        openClipModal,
        closeClipModal,
        handleClipVideo,
        handleUpscaleVideo,
        handleUpscaleClick
    };
}
