from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Client

class ClientRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, client_id: UUID) -> Optional[Client]:
        return self.db.query(Client).filter(Client.id == client_id).first()

    def get_by_name(self, name: str) -> Optional[Client]:
        return self.db.query(Client).filter(func.lower(Client.name) == name.strip().lower()).first()

    def list(self, is_active: Optional[bool] = None) -> List[Client]:
        query = self.db.query(Client)
        if is_active is not None:
            query = query.filter(Client.is_active == is_active)
        return query.order_by(Client.name.asc()).all()

    def create(self, client: Client) -> Client:
        self.db.add(client)
        self.db.commit()
        self.db.refresh(client)
        return client

    def update(self, client: Client) -> Client:
        self.db.commit()
        self.db.refresh(client)
        return client
