from pydantic import BaseModel


class AccessibilityPreferences(BaseModel):
    fontSize: int = 0
    contrast: str = "default"
    colorBlind: str = "none"
    grayscale: bool = False
    underlineLinks: bool = False
    dyslexiaFont: bool = False
    highlightFocus: bool = False
    readingGuide: bool = False
    lineHeight: int = 0
    letterSpacing: int = 0
    wordSpacing: int = 0
    stopAnimations: bool = False
    largeCursor: bool = False
    keyboardNav: bool = False
    ttsSpeed: float = 1.0
    ttsVoice: str = ""
    dimmer: int = 0
    textAlign: str = "default"
    saturation: int = 0
    zoom: int = 0
    hideImages: bool = False
    boldText: bool = False
    highlightLinks: bool = False
