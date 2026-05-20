import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SAMPLE_TEXT = """
Париж является столицей Франции. Франция расположена в Западной Европе.
Эйфелева башня — одна из самых известных достопримечательностей Парижа.
Лувр — крупнейший художественный музей мира, расположенный в Париже.
"""


@pytest.fixture
def sample_text():
    return SAMPLE_TEXT.strip()


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_generate_single(sample_text):
    r = client.post(
        "/api/generate",
        json={
            "text": sample_text,
            "questionsCount": 3,
            "difficulty": "medium",
            "language": "ru",
            "types": ["single"],
            "shuffleOptions": True,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "questions" in data
    assert len(data["questions"]) >= 1
    q = data["questions"][0]
    assert q["type"] == "single"
    assert q["question"]
    assert len(q["options"]) >= 2
    assert len(q["correctAnswers"]) >= 1


def test_generate_too_short():
    r = client.post(
        "/api/generate",
        json={
            "text": "short",
            "questionsCount": 1,
            "difficulty": "easy",
            "language": "ru",
            "types": ["single"],
        },
    )
    assert r.status_code == 422


def test_upload_txt():
    content = b"Hello world test content for upload."
    r = client.post(
        "/api/upload",
        files={"file": ("test.txt", content, "text/plain")},
    )
    assert r.status_code == 200
    assert "text" in r.json()
