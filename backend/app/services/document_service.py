from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_file
from app.models.application import Application
from app.models.document import Document, DocumentStatus, DocumentType
from app.utils.cloudinary_storage import delete_from_cloudinary, upload_bytes_to_cloudinary


class DocumentService:
    @staticmethod
    async def upload_document(
        db: Session,
        application_id: int,
        user_id: int,
        document_type: DocumentType,
        file: UploadFile,
    ) -> Document:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

        content = await file.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE} bytes",
            )

        extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if extension and extension not in settings.get_allowed_extensions():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File type is not allowed")

        upload = upload_bytes_to_cloudinary(
            content,
            folder=f"documents/{application_id}",
            filename=file.filename,
            resource_type="auto",
        )

        document = Document(
            application_id=application_id,
            uploaded_by_id=user_id,
            document_type=document_type,
            status=DocumentStatus.PENDING,
            original_filename=file.filename,
            stored_filename=upload["public_id"] or file.filename,
            file_path=upload["url"],
            file_size=len(content),
            mime_type=file.content_type or "application/octet-stream",
            file_hash=hash_file(content),
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        return document

    @staticmethod
    def get_application_documents(db: Session, application_id: int):
        return (
            db.query(Document)
            .filter(Document.application_id == application_id)
            .order_by(Document.created_at.desc())
            .all()
        )

    @staticmethod
    def delete_document(db: Session, document_id: int, user_id: int):
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        if document.uploaded_by_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot delete this document")

        public_id = document.stored_filename
        if public_id:
            delete_from_cloudinary(public_id, resource_type="auto")

        db.delete(document)
        db.commit()

    @staticmethod
    def verify_document(
        db: Session,
        document_id: int,
        verifier_user_id: int,
        reject: bool = False,
        reason: str | None = None,
    ) -> Document:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        document.verified_by_id = verifier_user_id
        document.verified_at = datetime.now(timezone.utc)

        if reject:
            if not reason:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason is required")
            document.status = DocumentStatus.REJECTED
            document.rejection_reason = reason
        else:
            document.status = DocumentStatus.VERIFIED
            document.rejection_reason = None

        db.commit()
        db.refresh(document)
        return document
