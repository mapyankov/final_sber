import random
import re
from typing import List, Optional, Set

from app.models.schemas import Difficulty, Language, Question, QuestionType
from app.services.distractor_generator import DistractorGenerator
from app.services.entity_extractor import EntityExtractor, Fact
from app.services.text_processor import TextProcessor
from app.utils.logger import logger


class QuestionGenerator:
    """Build questions from extracted facts."""

    def __init__(self) -> None:
        self.text_processor = TextProcessor()
        self.entity_extractor = EntityExtractor()
        self.distractor_gen = DistractorGenerator()

    def generate(
        self,
        text: str,
        count: int,
        difficulty: Difficulty,
        language: Language,
        types: List[QuestionType],
        shuffle_options: bool,
    ) -> List[Question]:
        lang = language.value
        processed = self.text_processor.process(text, lang)
        if not processed.sentences:
            raise ValueError("Text too short or could not be parsed into sentences")

        facts = self.entity_extractor.extract(processed, max_facts=count * 3)
        if not facts:
            facts = self._fallback_facts(processed.sentences)

        all_entities: Set[str] = set()
        for f in facts:
            all_entities.update(f.entities)
            if f.subject:
                all_entities.add(f.subject)
            if f.object_:
                all_entities.add(f.object_)

        questions: List[Question] = []
        type_cycle = list(types)
        random.shuffle(facts)

        for i in range(count):
            if i >= len(facts):
                break
            fact = facts[i % len(facts)]
            q_type = type_cycle[i % len(type_cycle)]
            q = self._build_question(
                q_id=i + 1,
                fact=fact,
                q_type=q_type,
                language=lang,
                difficulty=difficulty,
                all_entities=all_entities,
                shuffle=shuffle_options,
            )
            if q:
                questions.append(q)

        # Fill remaining with sentence-based questions if needed
        idx = len(questions)
        sent_idx = 0
        while len(questions) < count and sent_idx < len(processed.sentences):
            sent = processed.sentences[sent_idx]
            sent_idx += 1
            if any(sent in q.question for q in questions):
                continue
            fact = Fact(
                sentence=sent,
                subject="",
                predicate="",
                object_="",
                entities=[],
                keywords=[],
            )
            q_type = type_cycle[len(questions) % len(type_cycle)]
            q = self._build_question(
                q_id=idx + 1,
                fact=fact,
                q_type=q_type,
                language=lang,
                difficulty=difficulty,
                all_entities=all_entities,
                shuffle=shuffle_options,
            )
            if q:
                questions.append(q)
                idx += 1

        logger.info("Generated %d questions from %d facts", len(questions), len(facts))
        return questions

    def _build_question(
        self,
        q_id: int,
        fact: Fact,
        q_type: QuestionType,
        language: str,
        difficulty: Difficulty,
        all_entities: Set[str],
        shuffle: bool,
    ) -> Optional[Question]:
        builders = {
            QuestionType.SINGLE: self._single_choice,
            QuestionType.MULTIPLE: self._multiple_choice,
            QuestionType.TRUE_FALSE: self._true_false,
            QuestionType.OPEN: self._open_question,
        }
        builder = builders.get(q_type, self._single_choice)
        return builder(q_id, fact, language, difficulty, all_entities, shuffle)

    def _single_choice(
        self, q_id, fact, language, difficulty, all_entities, shuffle
    ) -> Optional[Question]:
        question_text, correct = self._fact_to_qa(fact, language)
        if not correct:
            return None

        num_distractors = {"easy": 2, "medium": 3, "hard": 3}[difficulty.value]
        distractors = self.distractor_gen.generate(
            correct, fact, num_distractors, language, all_entities
        )
        options = [correct] + distractors
        if shuffle:
            random.shuffle(options)
        correct_idx = options.index(correct)

        return Question(
            id=q_id,
            type=QuestionType.SINGLE,
            question=question_text,
            options=options,
            correctAnswers=[correct_idx],
        )

    def _multiple_choice(
        self, q_id, fact, language, difficulty, all_entities, shuffle
    ) -> Optional[Question]:
        q = self._single_choice(q_id, fact, language, difficulty, all_entities, shuffle)
        if not q or not q.options:
            return None

        # Mark 2 correct answers when possible
        correct_indices = [q.correctAnswers[0]]
        for i, opt in enumerate(q.options):
            if i not in correct_indices and opt in fact.entities and len(correct_indices) < 2:
                correct_indices.append(i)

        if len(correct_indices) < 2 and len(q.options) > 2:
            for i in range(len(q.options)):
                if i not in correct_indices:
                    correct_indices.append(i)
                    break

        q.type = QuestionType.MULTIPLE
        q.correctAnswers = sorted(correct_indices)
        if language == "ru":
            q.question = q.question.replace("?", " (выберите несколько)?")
        else:
            q.question = q.question.replace("?", " (select all that apply)?")
        return q

    def _true_false(
        self, q_id, fact, language, difficulty, all_entities, shuffle
    ) -> Question:
        if language == "ru":
            options = ["Правда", "Ложь"]
            statement = fact.sentence.rstrip(".")
            question = f"Верно ли утверждение: «{statement[:200]}»?"
        else:
            options = ["True", "False"]
            statement = fact.sentence.rstrip(".")
            question = f"Is the following statement true: \"{statement[:200]}\"?"

        # Mostly true; occasionally flip for harder difficulty
        is_true = difficulty != Difficulty.HARD or random.random() > 0.3
        if not is_true and difficulty == Difficulty.HARD:
            question = self._negate_statement(question, fact, language)

        return Question(
            id=q_id,
            type=QuestionType.TRUE_FALSE,
            question=question,
            options=options,
            correctAnswers=[0 if is_true else 1],
        )

    def _open_question(
        self, q_id, fact, language, difficulty, all_entities, shuffle
    ) -> Question:
        if language == "ru":
            question = f"Кратко опишите: {fact.sentence[:150]}?"
            hint = fact.object_ or fact.subject or fact.sentence[:50]
        else:
            question = f"Briefly explain: {fact.sentence[:150]}?"
            hint = fact.object_ or fact.subject or fact.sentence[:50]

        return Question(
            id=q_id,
            type=QuestionType.OPEN,
            question=question,
            options=None,
            correctAnswers=[0],
        )

    def _fact_to_qa(self, fact: Fact, language: str) -> tuple:
        sent = fact.sentence
        if fact.subject and fact.object_ and fact.predicate:
            if language == "ru":
                if "является" in fact.predicate or fact.predicate == "—":
                    return (
                        f"Что является {fact.object_[:60]}?",
                        fact.subject,
                    )
                return (
                    f"Как связаны «{fact.subject[:40]}» и «{fact.object_[:40]}»?",
                    fact.object_,
                )
            return (
                f"What is the relationship between {fact.subject[:40]} and {fact.object_[:40]}?",
                fact.object_,
            )

        # Fill-in-blank from sentence
        words = sent.split()
        if len(words) < 5:
            return ("", "")

        # Pick a significant word as answer
        candidates = [
            w.strip(".,;:!?\"'()")
            for w in words
            if len(w) > 4 and w[0].isupper() or (len(w) > 5)
        ]
        if not candidates:
            mid = len(words) // 2
            answer = words[mid].strip(".,;:!?\"'()")
        else:
            answer = random.choice(candidates)

        pattern = re.compile(re.escape(answer), re.IGNORECASE)
        blanked = pattern.sub("______", sent, count=1)
        if language == "ru":
            question = f"Заполните пропуск: {blanked}"
        else:
            question = f"Fill in the blank: {blanked}"
        return (question, answer)

    def _fallback_facts(self, sentences: List[str]) -> List[Fact]:
        return [
            Fact(sentence=s, subject="", predicate="", object_="", entities=[], keywords=[])
            for s in sentences[:20]
        ]

    def _negate_statement(self, question: str, fact: Fact, language: str) -> str:
        if language == "ru":
            return f"Верно ли утверждение: «Неверно, что {fact.sentence[:150]}»?"
        return f"Is the following statement true: \"It is false that {fact.sentence[:150]}\"?"
