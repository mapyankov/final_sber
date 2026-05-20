import time

from fastapi import APIRouter, HTTPException

from app.models.schemas import GenerateRequest, GenerateResponse
from app.services.question_generator import QuestionGenerator
from app.utils.logger import logger
from app.utils.sanitize import sanitize_text

router = APIRouter(tags=["generate"])
_generator = QuestionGenerator()


@router.post("/generate", response_model=GenerateResponse)
async def generate_test(request: GenerateRequest) -> GenerateResponse:
    start = time.perf_counter()
    text = sanitize_text(request.text)

    if len(text) < 10:
        raise HTTPException(status_code=400, detail="Text must be at least 10 characters")

    try:
        questions = _generator.generate(
            text=text,
            count=request.questionsCount,
            difficulty=request.difficulty,
            language=request.language,
            types=request.types,
            shuffle_options=request.shuffleOptions,
        )
    except ValueError as e:
        logger.warning("Generation validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("NLP generation error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate questions. Please try a different text.",
        ) from e

    elapsed = time.perf_counter() - start
    logger.info(
        "POST /generate | questions=%d | lang=%s | time=%.2fs",
        len(questions),
        request.language.value,
        elapsed,
    )

    if not questions:
        raise HTTPException(
            status_code=400,
            detail="Could not generate questions from the provided text",
        )

    return GenerateResponse(questions=questions)
