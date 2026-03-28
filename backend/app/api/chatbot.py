from fastapi import APIRouter

from app.schemas.chatbot import ChatbotRequest, ChatbotResponse
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("/ask", response_model=ChatbotResponse)
def ask_chatbot(data: ChatbotRequest):
    answer, restricted = ChatbotService.ask(
        data.message,
        history=[item.model_dump() for item in data.history],
        language=data.language,
    )
    return ChatbotResponse(answer=answer, restricted=restricted)
