from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import Field, AliasChoices


class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_URL_FALLBACK: str = ""
    DB_POOL_SIZE: int = 12
    DB_MAX_OVERFLOW: int = 24
    DB_POOL_TIMEOUT: int = 20
    DB_POOL_RECYCLE: int = 300
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REMEMBER_ME_EXPIRE_DAYS: int = 30

    APP_NAME: str = "Birth and Death Registry API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@birthdeathregistry.gov.gh"
    SENDGRID_FROM_NAME: str = "Births and Deaths Registry Ghana"
    SENDGRID_REPLY_TO: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = Field(default="", validation_alias=AliasChoices("SMTP_USER", "SMTP_USERNAME"))
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = Field(
        default="noreply@birthdeathregistry.gov.gh",
        validation_alias=AliasChoices("SMTP_FROM_EMAIL", "EMAIL_FROM"),
    )
    SMTP_FROM_NAME: str = Field(
        default="Births and Deaths Registry Ghana",
        validation_alias=AliasChoices("SMTP_FROM_NAME", "EMAIL_FROM_NAME"),
    )

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_API_KEY: str = ""
    TWILIO_API_SECRET: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""

    LOGO_URL: str = "https://res.cloudinary.com/dcrp2c9dj/image/upload/v1773138000/profiles/778dc0ba24274f56a768b395e6f80ff2_logo.jpg"
    LOGO_PATH: str = ""

    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_BASE_URL: str = "https://api.paystack.co"

    METAMAP_CLIENT_ID: str = ""
    METAMAP_CLIENT_SECRET: str = ""
    METAMAP_API_URL: str = "https://api.getmati.com"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    ANTHROPIC_API_KEY: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    REDIS_URL: str = "redis://localhost:6379/0"

    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10485760
    ALLOWED_EXTENSIONS: str = "pdf,jpg,jpeg,png"

    NORMAL_PROCESSING_DAYS: int = 30
    EXPRESS_PROCESSING_DAYS: int = 7
    NORMAL_PROCESSING_FEE: float = 50.00
    EXPRESS_PROCESSING_FEE: float = 150.00
    DELIVERY_BASE_FEE: float = 30.00
    PENALTY_DAILY_RATE: float = 5.00
    PENALTY_GRACE_PERIOD_DAYS: int = 7

    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:3001"

    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    def get_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    def get_allowed_extensions(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]


settings = Settings()
