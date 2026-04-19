import { useState, useRef, useEffect } from "react";

export default function useVideos(teamId, matchId) {
    const [videoList, setVideoList] = useState([]);
    const [videoSrc, setVideoSrc] = useState(null);
    const [videoName, setVideoName] = useState("");
    const [loadingVideos, setLoadingVideos] = useState(true); // videos being fetched
    const videoRef = useRef(null);
    const [activeUploadJobId, setActiveUploadJobId] = useState(null); // track which upload job is currently active for polling
    const [uploadJobs, setUploadJobs] = useState({}); // videos being uploaded
    const [upscaleJobs, setUpscaleJobs] = useState({}); // videos being upscaled
    const isUploading = activeUploadJobId && uploadJobs?.[activeUploadJobId]?.status !== "done";
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

        try {
            

            const formData = new FormData();
            formData.append("file", file);

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

            const data = await res.json();

            if (!res.ok) {
                alert("Upload failed: " + JSON.stringify(data));
                return;
            }

            const newVideo = data.video;
            const jobId = data.job_id;

            // ----------------------------
            // SAFETY GUARD (critical fix)
            // ----------------------------
            if (!newVideo?.id || !jobId) {
                console.error("Invalid upload response:", data);
                alert("Upload failed: invalid server response");
                return;
            }

            // ----------------------------
            // Add placeholder video only
            // ----------------------------
            setVideoList(prev => [
                {
                    ...newVideo,
                    playback_url: null // explicitly indicate "not ready yet"
                },
                ...prev
            ]);

            // DO NOT set playback yet (video is not ready)
            //setVideoSrc(null);
            setVideoName(newVideo.filename);
            
            // ----------------------------
            // Start polling using jobId ONLY
            // (job is source of truth)
            // ----------------------------
            setActiveUploadJobId(jobId);
            startUploadPolling(jobId);

            // optional refresh (safe but not required immediately)
            //await fetchVideos();

        } catch (err) {
            alert("Upload error: " + err);
        } finally {
            
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

    const startUploadPolling = (jobId) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(
                    `/teams/${teamId}/matches/${matchId}/videos/upload-status/${jobId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                // IMPORTANT: stop polling on failure
                if (!res.ok) {
                    clearInterval(interval);
                    console.error("Upload job not found:", jobId);
                    return;
                }

                const job = await res.json();

                setUploadJobs(prev => ({
                    ...prev,
                    [jobId]: job
                }));

                // stop conditions
                if (job.status === "done" || job.status === "failed") {
                    clearInterval(interval);

                    if (job.status === "done") {
                        // refresh final video list once backend commit is complete
                        fetchVideos();
                    }
                }

            } catch (err) {
                console.error("Upload polling error:", err);
                clearInterval(interval);
            }
        }, 1000);
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
       
        uploadJobs,
        upscaleJobs,
        activeUploadJobId,
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
