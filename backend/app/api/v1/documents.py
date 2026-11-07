import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.services.auth_service import get_current_employee
from app.repositories.document_repo import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentOwner

router = APIRouter(prefix="/documents", tags=["Secure Document Management"])

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists company documents accessible within employee clearance level."""
    repo = DocumentRepository(db)
    docs = repo.list_accessible_documents(current_employee)
    return [
        DocumentResponse(
            id=d.id,
            title=d.title,
            category=d.category,
            classification=d.classification,
            file_url=d.file_url,
            mime_type=d.mime_type,
            file_size_bytes=d.file_size_bytes,
            owner_id=d.owner_id,
            owner=DocumentOwner(
                id=d.owner.id,
                full_name=d.owner.full_name,
                employee_code=d.owner.employee_code,
                role=d.owner.role
            ) if d.owner else None,
            download_count=d.download_count or 0,
            created_at=d.created_at
        )
        for d in docs
    ]

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Registers a new document with classified security access tags."""
    if payload.classification == "RESTRICTED" and current_employee.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can classify documents as RESTRICTED."
        )

    repo = DocumentRepository(db)
    doc = repo.create_document(
        title=payload.title,
        category=payload.category.upper(),
        classification=payload.classification.upper(),
        file_url=payload.file_url,
        mime_type=payload.mime_type,
        file_size_bytes=payload.file_size_bytes,
        owner_id=current_employee.id
    )
    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        category=doc.category,
        classification=doc.classification,
        file_url=doc.file_url,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        owner_id=doc.owner_id,
        owner=DocumentOwner(
            id=current_employee.id,
            full_name=current_employee.full_name,
            employee_code=current_employee.employee_code,
            role=current_employee.role
        ),
        download_count=doc.download_count or 0,
        created_at=doc.created_at
    )

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: uuid.UUID,
    request: Request,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Retrieves document details and logs security viewing audit entry."""
    repo = DocumentRepository(db)
    doc = repo.get_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.classification == "RESTRICTED" and current_employee.role != "admin" and doc.owner_id != current_employee.id:
        raise HTTPException(status_code=403, detail="Clearance denied: RESTRICTED document.")

    client_ip = request.client.host if request.client else "unknown"
    repo.log_access(doc.id, current_employee.id, "VIEWED", ip_address=client_ip)

    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        category=doc.category,
        classification=doc.classification,
        file_url=doc.file_url,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        owner_id=doc.owner_id,
        owner=DocumentOwner(
            id=doc.owner.id,
            full_name=doc.owner.full_name,
            employee_code=doc.owner.employee_code,
            role=doc.owner.role
        ) if doc.owner else None,
        download_count=doc.download_count or 0,
        created_at=doc.created_at
    )

@router.post("/{document_id}/download")
def record_download(
    document_id: uuid.UUID,
    request: Request,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Records formal download audit trail for DLP compliance."""
    repo = DocumentRepository(db)
    doc = repo.get_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.classification == "RESTRICTED" and current_employee.role != "admin" and doc.owner_id != current_employee.id:
        raise HTTPException(status_code=403, detail="Download prohibited: RESTRICTED document.")

    client_ip = request.client.host if request.client else "unknown"
    repo.log_access(doc.id, current_employee.id, "DOWNLOADED", ip_address=client_ip)
    return {"status": "download_logged", "file_url": doc.file_url}

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Deletes document (accessible to document owner or System Administrator)."""
    repo = DocumentRepository(db)
    doc = repo.get_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if current_employee.role != "admin" and doc.owner_id != current_employee.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this document.")

    repo.delete_document(document_id)
    return None
