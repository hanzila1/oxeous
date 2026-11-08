import os
import tempfile

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Cross-platform default tile cache directory
_DEFAULT_TILE_CACHE_DIR = os.path.join(tempfile.gettempdir(), "oxeous_tiles")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM deployment: "azure" (Microsoft Foundry / Azure OpenAI) | "gemini" | "ollama" | "watsonx"
    granite_deployment: str = "gemini"
    granite_model: str = "gemini-3.6-flash"
    granite_ollama_url: str = "http://localhost:11434"
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"

    # Microsoft Foundry / Azure OpenAI (auto-preferred when azure_openai_api_key & endpoint are set)
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = "gpt-5.4-mini"
    azure_openai_api_version: str = "2025-04-01-preview"
    azure_openai_embedding_deployment: str = ""

    # Azure AI Search (Step 3 - Live EUDR Statutory & Customs HS Code RAG)
    azure_search_endpoint: str = ""
    azure_search_api_key: str = ""
    azure_search_index: str = "eudr-statutory-corpus"

    # Google Earth Engine
    gee_project: str = "ee-hanzilabinyounasai"

    # Google Gemini (primary LLM - get free key at aistudio.google.com)
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
    cors_origins: str = "http://localhost:3000,https://happy-mushroom-060bb441e.6.azurestaticapps.net"

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
