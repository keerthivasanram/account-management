import uuid
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.models import Document, DocumentAccessLog, Employee

class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_accessible_documents(self, current_employee: Employee) -> List[Document]:
        query = self.db.query(Document).options(joinedload(Document.owner))
        if current_employee.role != "admin":
            # Non-admins can access PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED owned by them
            query = query.filter(
                (Document.classification.in_(["PUBLIC", "INTERNAL", "CONFIDENTIAL"])) |
                (Document.owner_id == current_employee.id)
            )
        return query.order_by(Document.created_at.desc()).all()

    def get_by_id(self, document_id: uuid.UUID) -> Optional[Document]:
        return (
            self.db.query(Document)
            .filter(Document.id == document_id)
            .options(joinedload(Document.owner))
            .first()
        )

    def create_document(
        self,
        title: str,
        category: str,
        classification: str,
        file_url: str,
        mime_type: str,
        file_size_bytes: int,
        owner_id: uuid.UUID
    ) -> Document:
        doc = Document(
            id=uuid.uuid4(),
            title=title,
            category=category,
            classification=classification,
            file_url=file_url,
            mime_type=mime_type,
            file_size_bytes=file_size_bytes,
            owner_id=owner_id,
            download_count=0
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def log_access(self, document_id: uuid.UUID, actor_id: uuid.UUID, action: str, ip_address: Optional[str] = None):
        log = DocumentAccessLog(
            id=uuid.uuid4(),
            document_id=document_id,
            actor_id=actor_id,
            action=action,
            ip_address=ip_address
        )
        self.db.add(log)
        if action == "DOWNLOADED":
            doc = self.db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.download_count = (doc.download_count or 0) + 1
        self.db.commit()

    def delete_document(self, document_id: uuid.UUID) -> bool:
        doc = self.get_by_id(document_id)
        if not doc:
            return False
        self.db.delete(doc)
        self.db.commit()
        return True
