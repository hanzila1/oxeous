import os
import tempfile

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Cross-platform default tile cache directory
_DEFAULT_TILE_CACHE_DIR = os.path.join(tempfile.gettempdir(), "oxeous_tiles")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM deployment: "gemini" (primary) | "ollama" | "watsonx"
    granite_deployment: str = "gemini"
    granite_model: str = "gemini-3.6-flash"
    granite_ollama_url: str = "http://localhost:11434"
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"

    # Google Earth Engine
    gee_project: str = "ee-hanzilabinyounasai"

    # Google Gemini (primary LLM — get free key at aistudio.google.com)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"

    # NASA
    nasa_earthdata_username: str = ""
    nasa_earthdata_password: str = ""
    nasa_earthdata_token: str = ""

    # App
    max_aoi_deg2: float = 4.0
    cache_ttl_seconds: int = 3600
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"

    # WDPA / Protected Planet
    wdpa_api_key: str = ""

    # GFW
    gfw_api_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Tile cache
    tile_cache_dir: str = _DEFAULT_TILE_CACHE_DIR

    # Internal
    version: str = "0.1.0"
    debug: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
