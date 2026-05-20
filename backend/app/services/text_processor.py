import re
from dataclasses import dataclass, field
from typing import List, Optional

import nltk
from nltk.tokenize import sent_tokenize, word_tokenize

from app.utils.logger import logger

_nltk_ready = False


def _ensure_nltk() -> None:
    global _nltk_ready
    if _nltk_ready:
        return
    for resource in ("punkt", "punkt_tab", "stopwords"):
        try:
            nltk.data.find(f"tokenizers/{resource}" if resource.startswith("punkt") else f"corpora/{resource}")
        except LookupError:
            try:
                nltk.download(resource, quiet=True)
            except Exception as e:
                logger.warning("NLTK download %s failed: %s", resource, e)
    _nltk_ready = True


@dataclass
class ProcessedText:
    original: str
    cleaned: str
    sentences: List[str] = field(default_factory=list)
    tokens: List[str] = field(default_factory=list)
    language: str = "ru"


class TextProcessor:
    """Preprocess text: clean, split sentences, tokenize."""

    def process(self, text: str, language: str = "ru") -> ProcessedText:
        _ensure_nltk()
        cleaned = self._clean(text)
        sentences = self._split_sentences(cleaned, language)
        tokens = self._tokenize(cleaned, language)
        return ProcessedText(
            original=text,
            cleaned=cleaned,
            sentences=sentences,
            tokens=tokens,
            language=language,
        )

    def _clean(self, text: str) -> str:
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _split_sentences(self, text: str, language: str) -> List[str]:
        lang = "russian" if language == "ru" else "english"
        try:
            sents = sent_tokenize(text, language=lang)
        except Exception:
            sents = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sents if len(s.strip()) > 15]

    def _tokenize(self, text: str, language: str) -> List[str]:
        lang = "russian" if language == "ru" else "english"
        try:
            return word_tokenize(text, language=lang)
        except Exception:
            return text.split()
