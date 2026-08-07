"""
DiskCache wrapper with TTL helpers.
Falls back to a simple in-memory dict if diskcache is not available.
"""
from __future__ import annotations

import json
import logging
import os
import hashlib
from typing import Any, Optional

logger = logging.getLogger(__name__)

try:
    import diskcache  # type: ignore

    _DISKCACHE_AVAILABLE = True
except ImportError:
    _DISKCACHE_AVAILABLE = False
    logger.warning("diskcache not installed — using in-memory cache (not persistent)")

from ..config import get_settings


class CacheStore:
    def __init__(self) -> None:
        settings = get_settings()
        self.ttl = settings.cache_ttl_seconds
        os.makedirs(settings.tile_cache_dir, exist_ok=True)

        if _DISKCACHE_AVAILABLE:
            self._cache = diskcache.Cache(
                os.path.join(settings.tile_cache_dir, "analysis_cache")
            )
        else:
            self._mem: dict[str, Any] = {}
            self._cache = None  # type: ignore

    def get(self, key: str) -> Optional[Any]:
        try:
            if self._cache is not None:
                return self._cache.get(key)
            return self._mem.get(key)
        except Exception as e:
            logger.warning("Cache get error: %s", e)
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        try:
            t = ttl if ttl is not None else self.ttl
            if self._cache is not None:
                self._cache.set(key, value, expire=t)
            else:
                self._mem[key] = value
        except Exception as e:
            logger.warning("Cache set error: %s", e)

    def delete(self, key: str) -> None:
        try:
            if self._cache is not None:
                self._cache.delete(key)
            else:
                self._mem.pop(key, None)
        except Exception as e:
            logger.warning("Cache delete error: %s", e)

    def is_writable(self) -> bool:
        try:
            self.set("__health_check__", "ok", ttl=5)
            return True
        except Exception:
            return False

    @staticmethod
    def make_key(tool: str, bbox: tuple[float, float, float, float], dates: str, product: str) -> str:
        """Snap bbox to 0.01° grid and build a stable cache key."""
        snapped = (
            round(bbox[0] / 0.01) * 0.01,
            round(bbox[1] / 0.01) * 0.01,
            round(bbox[2] / 0.01) * 0.01,
            round(bbox[3] / 0.01) * 0.01,
        )
        raw = f"{tool}:{snapped}:{dates}:{product}"
        return f"{tool}:{hashlib.md5(raw.encode()).hexdigest()[:16]}"


# Module-level singleton
_store: Optional[CacheStore] = None


def get_cache() -> CacheStore:
    global _store
    if _store is None:
        _store = CacheStore()
    return _store
