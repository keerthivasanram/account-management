import os
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Set test environment
os.environ["TESTING"] = "true"
os.environ["ENVIRONMENT"] = "development"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEV_AUTH_BYPASS"] = "true"
os.environ["TOKEN_ENCRYPTION_KEY"] = "v7yv-Xz6V_wZJ39gQ5t0Q8_1Jz9r-3m3e91uGz_lZpY="

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Use SQLite in-memory with StaticPool for tests
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import app.core.database
app.core.database.engine = engine
app.core.database.SessionLocal = TestingSessionLocal

from app.core.database import Base, get_db
from app.main import app
from app.models.models import Employee, Client, Campaign

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def seed_data(db_session):
    # Admin Employee
    admin = Employee(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        auth_user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        employee_code="EMP-0001",
        full_name="Admin Boss",
        email="admin@company.internal",
        role="admin",
        is_active=True
    )
    # Regular Employee
    emp = Employee(
        id=uuid.UUID("00000000-0000-0000-0000-000000000011"),
        auth_user_id=uuid.UUID("00000000-0000-0000-0000-000000000011"),
        employee_code="EMP-0002",
        full_name="Sarah Jenkins",
        email="employee1@company.internal",
        role="employee",
        is_active=True
    )
    # Client
    client = Client(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        name="Nike Global",
        description="Athletic wear and equipment",
        is_active=True
    )
    db_session.add_all([admin, emp, client])
    db_session.flush()

    # Campaign
    campaign = Campaign(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        client_id=client.id,
        name="Summer 2026 Runners",
        is_active=True
    )
    db_session.add(campaign)
    db_session.commit()

    return {
        "admin": admin,
        "employee": emp,
        "client": client,
        "campaign": campaign
    }
