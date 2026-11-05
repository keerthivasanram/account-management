from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.models import Campaign

class CampaignRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, campaign_id: UUID) -> Optional[Campaign]:
        return self.db.query(Campaign).filter(Campaign.id == campaign_id).first()

    def list(self, client_id: Optional[UUID] = None, is_active: Optional[bool] = None) -> List[Campaign]:
        query = self.db.query(Campaign)
        if client_id:
            query = query.filter(Campaign.client_id == client_id)
        if is_active is not None:
            query = query.filter(Campaign.is_active == is_active)
        return query.order_by(Campaign.name.asc()).all()

    def create(self, campaign: Campaign) -> Campaign:
        self.db.add(campaign)
        self.db.commit()
        self.db.refresh(campaign)
        return campaign

    def update(self, campaign: Campaign) -> Campaign:
        self.db.commit()
        self.db.refresh(campaign)
        return campaign
