from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.employees import router as employees_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.admin import router as admin_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(employees_router)
api_v1_router.include_router(accounts_router)
api_v1_router.include_router(integrations_router)
api_v1_router.include_router(admin_router)
