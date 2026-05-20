import random
from typing import List, Set

from app.services.entity_extractor import Fact


# Category-based fallback distractors
CATEGORY_POOLS = {
    "ru": {
        "city": ["Москва", "Берлин", "Рим", "Мадрид", "Лондон", "Вена", "Прага", "Варшава"],
        "country": ["Франция", "Германия", "Италия", "Испания", "Польша", "Китай", "Япония"],
        "person": ["Иванов", "Петров", "Сидоров", "Смит", "Джонсон", "Браун"],
        "default": ["Вариант А", "Вариант Б", "Вариант В", "Другой ответ", "Ни один из перечисленных"],
    },
    "en": {
        "city": ["London", "Berlin", "Rome", "Madrid", "Paris", "Vienna", "Prague", "Warsaw"],
        "country": ["France", "Germany", "Italy", "Spain", "Poland", "China", "Japan"],
        "person": ["Smith", "Johnson", "Brown", "Williams", "Jones"],
        "default": ["Option A", "Option B", "Option C", "Another answer", "None of the above"],
    },
}


class DistractorGenerator:
    """Generate plausible wrong answer options."""

    def generate(
        self,
        correct: str,
        fact: Fact,
        count: int,
        language: str,
        all_entities: Set[str],
    ) -> List[str]:
        distractors: List[str] = []
        used = {correct.lower().strip()}

        # From other entities in text
        for ent in all_entities:
            if len(distractors) >= count:
                break
            key = ent.lower().strip()
            if key not in used and ent != correct and len(ent) > 2:
                distractors.append(ent)
                used.add(key)

        # From fact keywords
        for kw in fact.keywords + fact.entities:
            if len(distractors) >= count:
                break
            key = kw.lower().strip()
            if key not in used and kw != correct:
                distractors.append(kw)
                used.add(key)

        # Category pool
        category = self._guess_category(correct, language)
        pool = CATEGORY_POOLS.get(language, CATEGORY_POOLS["en"]).get(
            category, CATEGORY_POOLS[language]["default"]
        )
        random.shuffle(pool)
        for item in pool:
            if len(distractors) >= count:
                break
            key = item.lower().strip()
            if key not in used:
                distractors.append(item)
                used.add(key)

        # Pad with generic
        generic = CATEGORY_POOLS[language]["default"]
        idx = 0
        while len(distractors) < count and idx < len(generic):
            item = generic[idx]
            if item.lower() not in used:
                distractors.append(item)
                used.add(item.lower())
            idx += 1

        return distractors[:count]

    def _guess_category(self, text: str, language: str) -> str:
        cities_ru = {"москва", "париж", "берлин", "рим"}
        cities_en = {"moscow", "paris", "berlin", "rome", "london"}
        lower = text.lower()
        if any(c in lower for c in cities_ru | cities_en):
            return "city"
        if text[0:1].isupper() and " " not in text and len(text) < 20:
            return "person"
        return "default"
