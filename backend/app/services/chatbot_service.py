import logging

from app.services import ai_service

logger = logging.getLogger(__name__)


class ChatbotService:
    @staticmethod
    def ask(message: str, history=None, language: str = "English") -> tuple:
        return ai_service.chat(message, history=history, language=language)
