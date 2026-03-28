"""Compatibility app entrypoint.

This module exposes the same FastAPI app object as `main.py` so both
startup commands work consistently:

- uvicorn main:app
- uvicorn app.main:app
"""

from main import app

__all__ = ["app"]
