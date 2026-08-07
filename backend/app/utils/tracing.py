"""
Tracing — request ID generation and context propagation.
"""
from __future__ import annotations

import uuid
import structlog
from contextvars import ContextVar

_request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def new_request_id() -> str:
    rid = f"req_{uuid.uuid4().hex[:12]}"
    _request_id_var.set(rid)
    structlog.contextvars.bind_contextvars(request_id=rid)
    return rid


def get_request_id() -> str:
    return _request_id_var.get()
