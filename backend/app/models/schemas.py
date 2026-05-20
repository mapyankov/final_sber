from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class QuestionType(str, Enum):
    SINGLE = "single"
    MULTIPLE = "multiple"
    TRUE_FALSE = "true_false"
    OPEN = "open"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Language(str, Enum):
    RU = "ru"
    EN = "en"


class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50000)
    questionsCount: int = Field(10, ge=1, le=100, alias="questionsCount")
    difficulty: Difficulty = Difficulty.MEDIUM
    language: Language = Language.RU
    types: List[QuestionType] = Field(
        default_factory=lambda: [QuestionType.SINGLE]
    )
    shuffleOptions: bool = Field(True, alias="shuffleOptions")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("types")
    @classmethod
    def validate_types(cls, v: List[QuestionType]) -> List[QuestionType]:
        if not v:
            raise ValueError("At least one question type is required")
        return v


class Question(BaseModel):
    id: int
    type: QuestionType
    question: str
    options: Optional[List[str]] = None
    correctAnswers: List[int] = Field(default_factory=list, alias="correctAnswers")

    model_config = ConfigDict(populate_by_name=True)


class GenerateResponse(BaseModel):
    questions: List[Question]


class UploadResponse(BaseModel):
    text: str
    filename: str
    charCount: int = Field(alias="charCount")

    model_config = ConfigDict(populate_by_name=True)


class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
