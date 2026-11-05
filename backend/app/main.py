import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.v1.router import api_v1_router
from app.models.models import Employee, Client, Campaign

@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.environ.get("TESTING") == "true":
        yield
        return

    # In tests or offline, safely attempt startup tasks
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            # 1. Seed default Admin if not exists
            admin_email = "admin@company.internal"
            admin = db.query(Employee).filter(Employee.email == admin_email).first()
            if not admin:
                admin = Employee(
                    id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                    auth_user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                    employee_code="EMP-0001",
                    full_name="System Administrator",
                    email=admin_email,
                    role="admin",
                    is_active=True
                )
                db.add(admin)

            # 2. Seed default Employee if not exists
            emp_email = "employee1@company.internal"
            emp = db.query(Employee).filter(Employee.email == emp_email).first()
            if not emp:
                emp = Employee(
                    id=uuid.UUID("00000000-0000-0000-0000-000000000011"),
                    auth_user_id=uuid.UUID("00000000-0000-0000-0000-000000000011"),
                    employee_code="EMP-0002",
                    full_name="Sarah Jenkins",
                    email=emp_email,
                    role="employee",
                    is_active=True
                )
                db.add(emp)

            # 3. Seed default Clients & Campaigns if none exist
            if db.query(Client).count() == 0:
                client_a = Client(
                    id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
                    name="Acme Fashion Brands",
                    description="Global apparel and luxury lifestyle client",
                    is_active=True
                )
                client_b = Client(
                    id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
                    name="Nova Tech Media",
                    description="Consumer electronics and gaming gear client",
                    is_active=True
                )
                db.add_all([client_a, client_b])
                db.flush()

                camp_1 = Campaign(
                    id=uuid.UUID("33333333-3333-3333-3333-333333333331"),
                    client_id=client_a.id,
                    name="Autumn 2026 Influencer Push",
                    description="Creator activation for fall collection launch",
                    is_active=True
                )
                camp_2 = Campaign(
                    id=uuid.UUID("33333333-3333-3333-3333-333333333332"),
                    client_id=client_b.id,
                    name="Nova Pro Headset Launch",
                    description="Community engagement and live stream giveaways",
                    is_active=True
                )
                db.add_all([camp_1, camp_2])

            db.commit()
        except Exception as e:
            db.rollback()
        finally:
            db.close()
    except Exception as e:
        print(f"Database connection or startup initialization skipped: {e}")

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Internal Instagram Account Registration and Management Platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/docs", include_in_schema=False)
def docs_redirect():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/docs")

# Mount versioned API routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
