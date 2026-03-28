from typing import List

from pydantic import BaseModel, Field


class MessageItem(BaseModel):
    role: str
    text: str


class ChatbotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[MessageItem] = []
    language: str = "English"


class ChatbotResponse(BaseModel):
    answer: str
    restricted: bool = False
