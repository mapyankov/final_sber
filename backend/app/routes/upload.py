from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import UploadResponse
from app.services.file_parser import FileParser
from app.utils.logger import logger
from app.utils.sanitize import sanitize_filename, sanitize_text

router = APIRouter(tags=["upload"])
_parser = FileParser()


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    safe_name = sanitize_filename(file.filename)
    content = await file.read()

    try:
        text = _parser.parse(safe_name, content)
    except ValueError as e:
        logger.warning("Upload error for %s: %s", safe_name, e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("File parse error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to parse file") from e

    text = sanitize_text(text)
    if len(text) < 1:
        raise HTTPException(status_code=400, detail="File contains no text")

    logger.info("POST /upload | file=%s | chars=%d", safe_name, len(text))
    return UploadResponse(text=text, filename=safe_name, charCount=len(text))
