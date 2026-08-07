from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator
from .enums import AnalysisType


class DateRange(BaseModel):
    start: str = Field(..., description="ISO date YYYY-MM-DD")
    end: str = Field(..., description="ISO date YYYY-MM-DD")


class MapViewport(BaseModel):
    center: tuple[float, float]
    zoom: float
    bbox: tuple[float, float, float, float]


class ConversationMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class AnalysisRequest(BaseModel):
    analysis_type: AnalysisType
    location: str
    bbox: tuple[float, float, float, float]
    current_period: DateRange
    comparison_period: Optional[DateRange] = None
    preferred_product: str

    @model_validator(mode="after")
    def validate_bbox_area(self) -> "AnalysisRequest":
        b = self.bbox
        area = abs((b[2] - b[0]) * (b[3] - b[1]))
        if area > 4.0:
            raise ValueError(f"Bounding box area {area:.2f}° exceeds 4 deg² limit")
        return self


class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1024)
    conversation_history: list[ConversationMessage] = Field(default_factory=list)
    map_viewport: MapViewport
