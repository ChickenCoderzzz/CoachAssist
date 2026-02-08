from urllib.parse import urlparse, parse_qs

def extract_youtube_id(url: str) -> str:
    """
    Accepts URLs like:
    - https://www.youtube.com/watch?v=mpp6-a3ckaM
    - https://youtu.be/mpp6-a3ckaM
    Returns just the video ID: mpp6-a3ckaM
    """
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    # accept standard and mobile youtube hostnames
    if hostname.endswith("youtube.com"):
        return parse_qs(parsed.query).get("v", [None])[0]
    if hostname == "youtu.be":
        return parsed.path.lstrip("/")
    return url  # fallback: assume user entered the ID directly

def create_youtube_video(youtube_input: str):
    video_id = extract_youtube_id(youtube_input)
    return {
        "provider": "youtube",
        "provider_video_id": video_id,
        "playback_url": f"https://www.youtube.com/embed/{video_id}",
        ##"playback_url": f"https://m.youtube.com/watch?v={video_id}",
        #"playback_url": f"{video_id}",
    }