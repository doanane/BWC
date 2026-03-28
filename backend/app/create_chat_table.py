from app.core.database import engine, Base
from app.models import chat  # noqa: F401
from app.models.application import Application  # noqa: F401

Base.metadata.create_all(bind=engine)
print("Tables created")
