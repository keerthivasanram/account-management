from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.mfa import router as mfa_router
from app.api.v1.employees import router as employees_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.admin import router as admin_router
from app.api.v1.departments import router as departments_router
from app.api.v1.projects import router as projects_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.chat import router as chat_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.documents import router as documents_router
from app.api.v1.social_posts import router as social_posts_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.mail import router as mail_router
from app.api.v1.support import router as support_router
from app.api.v1.community import router as community_router
from app.api.v1.hr import router as hr_router
from app.api.v1.security import router as security_router
from app.api.v1.manager import router as manager_router
from app.api.v1.super_admin import router as super_admin_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(mfa_router)
api_v1_router.include_router(employees_router)
api_v1_router.include_router(departments_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(tasks_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(attendance_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(social_posts_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(mail_router)
api_v1_router.include_router(support_router)
api_v1_router.include_router(community_router)
api_v1_router.include_router(hr_router)
api_v1_router.include_router(security_router)
api_v1_router.include_router(accounts_router)
api_v1_router.include_router(integrations_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(manager_router)
api_v1_router.include_router(super_admin_router)
