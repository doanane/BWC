from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_staff
from app.services.document_service import DocumentService
from app.models.document import DocumentType, Document
from app.models.user import User
import os

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", status_code=201)
async def upload_document(
    application_id: int = Form(...),
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    document = await DocumentService.upload_document(
        db, application_id, current_user.id, document_type, file
    )
    return {
        "id": document.id,
        "document_type": document.document_type,
        "original_filename": document.original_filename,
        "status": document.status,
        "file_url": document.file_path,
        "file_size": document.file_size,
        "created_at": document.created_at
    }


@router.get("/application/{application_id}")
def get_application_documents(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DocumentService.get_application_documents(db, application_id)


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    DocumentService.delete_document(db, document_id, current_user.id)
    return {"message": "Document deleted successfully"}


@router.post("/{document_id}/verify")
def verify_document(
    document_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return DocumentService.verify_document(db, document_id, current_user.id)


@router.post("/{document_id}/reject")
def reject_document(
    document_id: int,
    reason: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return DocumentService.verify_document(db, document_id, current_user.id, reject=True, reason=reason)


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role.value == "citizen" and document.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if document.file_path.startswith("http://") or document.file_path.startswith("https://"):
        return RedirectResponse(url=document.file_path)

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=document.file_path,
        filename=document.original_filename,
        media_type=document.mime_type
    )
