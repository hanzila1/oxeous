"""Integration test — FastAPI health + chat endpoint with mocked Granite."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.granite_client import GraniteClient


@pytest.fixture()
def mock_granite():
    """Mock GraniteClient to return a known tool call."""
    async def fake_extract(prompt, conversation_history, tool_definitions, viewport_hint=None):
        return {
            "tool_name": "fetch_true_color_imagery",
            "parameters": {
                "location": "Lahore, Pakistan",
                "bbox": [73.8, 31.1, 74.9, 31.9],
                "current_period": {"start": "2025-06-01", "end": "2025-06-25"},
                "preferred_product": "GIBS_VIIRS_NOAA20",
            },
        }

    async def fake_explain(tool_result):
        return "Satellite imagery retrieved for Lahore. Coverage quality: good."

    client = AsyncMock(spec=GraniteClient)
    client.extract_intent = fake_extract
    client.generate_explanation = fake_explain
    return client


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_chat_returns_analysis_response(mock_granite):
    app.state.granite = mock_granite
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/chat",
            json={
                "prompt": "Show me true color imagery of Lahore",
                "conversation_history": [],
                "map_viewport": {
                    "center": [74.35, 31.52],
                    "zoom": 10,
                    "bbox": [73.8, 31.1, 74.9, 31.9],
                },
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "request_id" in data
    assert "analysis_type" in data
    assert "explanation" in data
