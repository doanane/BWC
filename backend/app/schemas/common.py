from pydantic import BaseModel
from typing import Optional, List, Any, Generic, TypeVar

T = TypeVar("T")


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class MessageResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class HealthCheckResponse(BaseModel):
    status: str
    version: str
    database: str
    environment: str
