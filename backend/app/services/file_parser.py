import io
from typing import BinaryIO

from docx import Document
from pypdf import PdfReader

from app.utils.logger import logger
from app.utils.sanitize import sanitize_text


MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {".txt", ".docx", ".pdf"}


class FileParser:
    """Parse uploaded text files."""

    def parse(self, filename: str, content: bytes) -> str:
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)} MB")

        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

        if ext == ".txt":
            text = self._parse_txt(content)
        elif ext == ".docx":
            text = self._parse_docx(content)
        elif ext == ".pdf":
            text = self._parse_pdf(content)
        else:
            raise ValueError("Unsupported format")

        return sanitize_text(text)

    def _parse_txt(self, content: bytes) -> str:
        for encoding in ("utf-8", "cp1251", "latin-1"):
            try:
                return content.decode(encoding)
            except UnicodeDecodeError:
                continue
        raise ValueError("Could not decode text file")

    def _parse_docx(self, content: bytes) -> str:
        doc = Document(io.BytesIO(content))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)

    def _parse_pdf(self, content: bytes) -> str:
        reader = PdfReader(io.BytesIO(content))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        if not pages:
            logger.warning("PDF contained no extractable text")
            raise ValueError("PDF contains no readable text")
        return "\n".join(pages)
