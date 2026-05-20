import re
from html import escape


def sanitize_text(text: str, max_length: int = 50000) -> str:
    """Remove control chars and limit length."""
    if not text:
        return ""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned


def sanitize_filename(filename: str) -> str:
    """Prevent path traversal in uploaded filenames."""
    if not filename:
        return "upload.txt"
    name = filename.replace("\\", "/").split("/")[-1]
    name = re.sub(r"[^a-zA-Z0-9._\-\u0400-\u04FF]", "_", name)
    return name[:255] or "upload.txt"
