import { useState, useRef, useEffect } from "react";

export default function useVideos(teamId, matchId) {
    const [videoList, setVideoList] = useState([]);
    const [videoSrc, setVideoSrc] = useState(null);
    const [videoName, setVideoName] = useState("");
    const [loadingVideos, setLoadingVideos] = useState(true); //videos being fetched
    const videoRef = useRef(null);
    const [uploading, setUploading] = useState(false); // video uploading 
    const [upscalingIds, setUpscalingIds] = useState(new Set()); // ids of videos being upscaled
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

    const pollUntilUpscaledVideoAppears = async (baselineIds, maxWaitMs = 5 * 60 * 1000, intervalMs = 5000) => {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            const videos = await fetchVideos();
            const hasNew = videos.some(v => !baselineIds.has(v.id));
            if (hasNew) {
                return true;
            }
        }

        return false;
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

        try {
            const res = await fetch(
                `/teams/${teamId}/matches/${matchId}/videos/${videoId}/upscale`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (res.status === 202) {
                alert("Upscaling started. This may take a few minutes.");
                return "queued";
            }

            if (!res.ok) {
                const text = await res.text();
                alert("Upscale failed: " + text);
                return;
            }

            const newVideo = await res.json();

            // Add upscaled video to list
            setVideoList(prev => [newVideo, ...prev]);

            // Optionally switch to the new video
            setVideoSrc(newVideo.playback_url);
            setVideoName(newVideo.filename);

            // Refresh list to stay in sync
            await fetchVideos();

            return "done";
        } catch (err) {
            alert("Upscale error: " + err);
            return;
        }
    };

    const handleUpscaleClick = async (videoId) => {
        // Add videoId to the Set (start loading)
        setUpscalingIds(prev => {
            const newSet = new Set(prev);
            newSet.add(videoId);
            return newSet;
        });

        const baselineIds = new Set(videoList.map(v => v.id));

        try {
            const result = await handleUpscaleVideo(videoId);

            if (result === "queued") {
                const completed = await pollUntilUpscaledVideoAppears(baselineIds);

                if (completed) {
                    alert("Upscaled video is now available.");
                } else {
                    alert("Upscale still processing. Please refresh the page in a few moments.");
                }
            }

        } catch (err) {
            console.error(err);
        } finally {
            // Remove videoId from the Set (stop loading)
            setUpscalingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(videoId);
                return newSet;
            });
        }
    };

    return {
        videoList,
        videoSrc,
        videoName,
        videoRef,
        loadingVideos,
        uploading,
        upscalingIds,
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
