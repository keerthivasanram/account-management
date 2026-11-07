import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.v1.router import api_v1_router
from app.models.models import (
    Employee, Client, Campaign, Department, Project, Task, TaskActivityEvent,
    Conversation, ConversationMember, Message
)

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

            # 4. Seed default Departments & Projects if none exist
            if db.query(Department).count() == 0:
                dept_mkt = Department(
                    id=uuid.UUID("44444444-4444-4444-4444-444444444441"),
                    name="Marketing & Social Growth",
                    code="MKT",
                    description="Manages creator activations, campaigns, and Meta channels"
                )
                dept_eng = Department(
                    id=uuid.UUID("44444444-4444-4444-4444-444444444442"),
                    name="Engineering & Infrastructure",
                    code="ENG",
                    description="Core platform infrastructure, integrations, and tools"
                )
                dept_hr = Department(
                    id=uuid.UUID("44444444-4444-4444-4444-444444444443"),
                    name="People Operations & HR",
                    code="HR",
                    description="Workforce management, compliance, and staff allocation"
                )
                db.add_all([dept_mkt, dept_eng, dept_hr])
                db.flush()

                # Link seeded Sarah Jenkins to Marketing
                if emp:
                    emp.department_id = dept_mkt.id

                # Seed sample Project
                sample_proj = Project(
                    id=uuid.UUID("55555555-5555-5555-5555-555555555551"),
                    name="Autumn 2026 Social Expansion",
                    description="Q4 Creator activations and brand account onboarding",
                    owner_id=admin.id,
                    department_id=dept_mkt.id,
                    status="ACTIVE",
                    priority="HIGH"
                )
                db.add(sample_proj)
                db.flush()

                # Seed initial task
                sample_task = Task(
                    id=uuid.UUID("66666666-6666-6666-6666-666666666661"),
                    project_id=sample_proj.id,
                    title="Connect 10 Creator Instagram Accounts via OAuth",
                    description="Verify Business status and complete Meta OAuth authorization for fashion accounts.",
                    assigned_to=emp.id if emp else admin.id,
                    created_by=admin.id,
                    priority="HIGH",
                    status="TODO"
                )
                db.add(sample_task)
                db.flush()

                # Seed task activity log
                task_event = TaskActivityEvent(
                    id=uuid.uuid4(),
                    task_id=sample_task.id,
                    actor_id=admin.id,
                    action="CREATED",
                    previous_status=None,
                    new_status="TODO",
                    remarks="Initial task created during system provisioning."
                )
                db.add(task_event)

            # 5. Seed default company communications channels
            if db.query(Conversation).count() == 0 and admin:
                announcement_channel = Conversation(
                    id=uuid.UUID("77777777-7777-7777-7777-777777777771"),
                    type="ANNOUNCEMENT",
                    title="Company Announcements & Updates",
                    created_by=admin.id
                )
                db.add(announcement_channel)
                db.flush()

                # Add members to general announcement channel
                db.add(ConversationMember(conversation_id=announcement_channel.id, employee_id=admin.id))
                if emp:
                    db.add(ConversationMember(conversation_id=announcement_channel.id, employee_id=emp.id))

                # Post welcome broadcast
                welcome_msg = Message(
                    id=uuid.uuid4(),
                    conversation_id=announcement_channel.id,
                    sender_id=admin.id,
                    content="Welcome to SocialHub Enterprise OS. All internal operations, tasks, attendance, and social accounts are securely managed in this hub.",
                    is_redacted=False
                )
                db.add(welcome_msg)

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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {str(exc) or 'An unexpected error occurred'}"}
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
