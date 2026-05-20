import re
from dataclasses import dataclass
from typing import List, Optional, Set

from sklearn.feature_extraction.text import TfidfVectorizer

from app.services.text_processor import ProcessedText
from app.utils.logger import logger

_spacy_nlp = {}


def _get_spacy(language: str):
    if language in _spacy_nlp:
        return _spacy_nlp[language]

    try:
        import spacy

        model = "ru_core_news_sm" if language == "ru" else "en_core_web_sm"
        try:
            nlp = spacy.load(model)
        except OSError:
            logger.warning("spaCy model %s not found, using blank", model)
            nlp = spacy.blank("ru" if language == "ru" else "en")
        _spacy_nlp[language] = nlp
        return nlp
    except ImportError:
        logger.warning("spaCy not available")
        _spacy_nlp[language] = None
        return None


@dataclass
class Fact:
    sentence: str
    subject: str
    predicate: str
    object_: str
    entities: List[str]
    keywords: List[str]
    score: float = 1.0


class EntityExtractor:
    """Extract entities and key facts from processed text."""

    def extract(self, processed: ProcessedText, max_facts: int = 50) -> List[Fact]:
        facts: List[Fact] = []
        entities_by_sent = self._ner_per_sentence(processed)
        keywords = self._tfidf_keywords(processed, top_n=30)

        for i, sent in enumerate(processed.sentences):
            ents = entities_by_sent.get(i, [])
            subj, pred, obj = self._parse_simple(sent, ents)
            kw = [k for k in keywords if k.lower() in sent.lower()][:5]
            if subj or obj or ents:
                facts.append(
                    Fact(
                        sentence=sent,
                        subject=subj or (ents[0] if ents else ""),
                        predicate=pred,
                        object_=obj or (ents[-1] if len(ents) > 1 else ""),
                        entities=ents,
                        keywords=kw,
                        score=1.0 + len(ents) * 0.2 + len(kw) * 0.1,
                    )
                )

        facts.sort(key=lambda f: f.score, reverse=True)
        return facts[:max_facts]

    def _ner_per_sentence(self, processed: ProcessedText) -> dict:
        result: dict = {}
        nlp = _get_spacy(processed.language)
        if nlp is None:
            return self._regex_entities(processed.sentences)

        for i, sent in enumerate(processed.sentences):
            doc = nlp(sent[:1000])
            ents = list({ent.text.strip() for ent in doc.ents if len(ent.text.strip()) > 1})
            if not ents:
                ents = [t.text for t in doc if t.pos_ in ("PROPN", "NOUN") and len(t.text) > 2][:3]
            result[i] = ents
        return result

    def _regex_entities(self, sentences: List[str]) -> dict:
        result = {}
        cap_pattern = re.compile(r"\b([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z][а-яёa-z]+)*)\b")
        for i, sent in enumerate(sentences):
            result[i] = list(set(cap_pattern.findall(sent)))[:5]
        return result

    def _tfidf_keywords(self, processed: ProcessedText, top_n: int = 20) -> List[str]:
        if len(processed.sentences) < 2:
            words = [w for w in processed.tokens if len(w) > 3 and w.isalpha()]
            return list(dict.fromkeys(words))[:top_n]

        try:
            vectorizer = TfidfVectorizer(
                max_features=top_n,
                stop_words=None,
                token_pattern=r"(?u)\b\w{4,}\b",
            )
            matrix = vectorizer.fit_transform(processed.sentences)
            return list(vectorizer.get_feature_names_out())
        except Exception as e:
            logger.warning("TF-IDF failed: %s", e)
            return []

    def _parse_simple(self, sentence: str, entities: List[str]) -> tuple:
        """Simple subject-predicate-object extraction."""
        patterns_ru = [
            (r"(.+?)\s+является\s+(.+)", "является"),
            (r"(.+?)\s+—\s+(.+)", "—"),
            (r"(.+?)\s+это\s+(.+)", "это"),
            (r"(.+?)\s+был\s+(.+)", "был"),
            (r"(.+?)\s+находится\s+в\s+(.+)", "находится в"),
        ]
        patterns_en = [
            (r"(.+?)\s+is\s+(?:the\s+)?(.+)", "is"),
            (r"(.+?)\s+are\s+(.+)", "are"),
            (r"(.+?)\s+was\s+(.+)", "was"),
            (r"(.+?)\s+located\s+in\s+(.+)", "located in"),
        ]
        patterns = patterns_ru + patterns_en
        for pat, pred in patterns:
            m = re.search(pat, sentence, re.IGNORECASE)
            if m:
                return m.group(1).strip()[:80], pred, m.group(2).strip()[:80]

        if len(entities) >= 2:
            return entities[0], "related to", entities[1]
        if len(entities) == 1:
            return entities[0], "mentioned in", sentence[:60]
        return "", "", ""
