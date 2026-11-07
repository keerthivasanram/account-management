import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.services.auth_service import get_current_employee
from app.repositories.chat_repo import ChatRepository
from app.repositories.employee_repo import EmployeeRepository
from app.schemas.chat import (
    ConversationResponse, ConversationCreate, ConversationMemberResponse,
    MessageResponse, MessageCreate, MessageSender
)

router = APIRouter(prefix="/chat", tags=["Company-Managed Internal Messaging"])

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists all conversations and channels the employee belongs to."""
    repo = ChatRepository(db)
    convs = repo.list_conversations_for_employee(current_employee.id)
    
    result = []
    for c in convs:
        members = [
            ConversationMemberResponse(
                employee_id=m.employee_id,
                full_name=m.employee.full_name if m.employee else "Unknown",
                employee_code=m.employee.employee_code if m.employee else "N/A",
                joined_at=m.joined_at
            )
            for m in c.members
        ]
        latest_msg = None
        if c.messages:
            last = c.messages[-1]
            latest_msg = MessageResponse(
                id=last.id,
                conversation_id=last.conversation_id,
                sender_id=last.sender_id,
                sender=MessageSender(
                    id=last.sender.id,
                    full_name=last.sender.full_name,
                    employee_code=last.sender.employee_code,
                    role=last.sender.role
                ),
                content=last.content,
                is_redacted=last.is_redacted,
                created_at=last.created_at
            )
        result.append(
            ConversationResponse(
                id=c.id,
                type=c.type,
                title=c.title or (members[0].full_name if members else "Conversation"),
                department_id=c.department_id,
                created_by=c.created_by,
                created_at=c.created_at,
                member_count=len(members),
                members=members,
                latest_message=latest_msg
            )
        )
    return result

@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Creates a new 1:1 direct chat or team channel."""
    repo = ChatRepository(db)
    emp_repo = EmployeeRepository(db)

    if payload.type == "DIRECT":
        if not payload.member_ids or len(payload.member_ids) < 1:
            raise HTTPException(status_code=400, detail="Target employee ID required for direct chat.")
        target_emp = emp_repo.get_by_id(payload.member_ids[0])
        if not target_emp:
            raise HTTPException(status_code=404, detail="Target employee not found.")
        conv = repo.create_direct_conversation(current_employee.id, target_emp.id, target_emp.full_name)
    else:
        title = payload.title or f"{payload.type.title()} Channel"
        conv = repo.create_channel(
            title=title,
            conv_type=payload.type,
            created_by=current_employee.id,
            department_id=payload.department_id,
            member_ids=payload.member_ids
        )

    # Return formatted conversation
    members = [
        ConversationMemberResponse(
            employee_id=m.employee_id,
            full_name=m.employee.full_name if m.employee else "Unknown",
            employee_code=m.employee.employee_code if m.employee else "N/A",
            joined_at=m.joined_at
        )
        for m in conv.members
    ]
    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        title=conv.title,
        department_id=conv.department_id,
        created_by=conv.created_by,
        created_at=conv.created_at,
        member_count=len(members),
        members=members,
        latest_message=None
    )

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Fetches message history for a conversation."""
    repo = ChatRepository(db)
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    # Membership authorization check
    is_member = any(m.employee_id == current_employee.id for m in conv.members)
    if not is_member and current_employee.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this conversation.")

    messages = repo.list_messages(conversation_id)
    res = []
    for m in messages:
        res.append(
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_id=m.sender_id,
                sender=MessageSender(
                    id=m.sender.id,
                    full_name=m.sender.full_name,
                    employee_code=m.sender.employee_code,
                    role=m.sender.role
                ),
                content=m.content,
                is_redacted=m.is_redacted,
                created_at=m.created_at
            )
        )
    return res

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Sends a message with real-time DLP data-leak prevention sanitization."""
    repo = ChatRepository(db)
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    is_member = any(m.employee_id == current_employee.id for m in conv.members)
    if not is_member and current_employee.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to post in this conversation.")

    msg = repo.post_message(conversation_id, current_employee.id, payload.content)
    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender=MessageSender(
            id=current_employee.id,
            full_name=current_employee.full_name,
            employee_code=current_employee.employee_code,
            role=current_employee.role
        ),
        content=msg.content,
        is_redacted=msg.is_redacted,
        created_at=msg.created_at
    )
