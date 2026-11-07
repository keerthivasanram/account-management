import uuid
import re
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from app.models.models import Conversation, ConversationMember, Message, Employee, Department

DLP_PATTERNS = [
    (re.compile(r"EAA[a-zA-Z0-9]{20,}", re.IGNORECASE), "[REDACTED META TOKEN - DLP SHIELD]"),
    (re.compile(r"sk_[a-zA-Z0-9_\-]{20,}", re.IGNORECASE), "[REDACTED API KEY - DLP SHIELD]"),
    (re.compile(r"(?i)(password|secret|pwd)\s*[:=]\s*([^\s,;]+)"), r"\1: [REDACTED SECRET - DLP SHIELD]"),
    (re.compile(r"Bearer\s+[a-zA-Z0-9_\-\.]{25,}", re.IGNORECASE), "Bearer [REDACTED TOKEN - DLP SHIELD]"),
]

def sanitize_chat_content(content: str) -> Tuple[str, bool]:
    """Inspects message content against Enterprise Data Leak Prevention regexes."""
    sanitized = content
    redacted = False
    for pattern, replacement in DLP_PATTERNS:
        if pattern.search(sanitized):
            sanitized = pattern.sub(replacement, sanitized)
            redacted = True
    return sanitized, redacted

class ChatRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_conversations_for_employee(self, employee_id: uuid.UUID) -> List[Conversation]:
        """Finds conversations the employee is a member of or general announcements."""
        return (
            self.db.query(Conversation)
            .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
            .filter(ConversationMember.employee_id == employee_id)
            .options(
                joinedload(Conversation.members).joinedload(ConversationMember.employee),
                joinedload(Conversation.department),
                joinedload(Conversation.messages)
            )
            .order_by(Conversation.created_at.desc())
            .all()
        )

    def get_conversation(self, conversation_id: uuid.UUID) -> Optional[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .options(
                joinedload(Conversation.members).joinedload(ConversationMember.employee),
                joinedload(Conversation.department)
            )
            .first()
        )

    def create_direct_conversation(self, emp1_id: uuid.UUID, emp2_id: uuid.UUID, emp2_name: str) -> Conversation:
        """Finds existing 1:1 conversation between emp1 and emp2 or creates a new one."""
        existing = (
            self.db.query(Conversation)
            .filter(Conversation.type == "DIRECT")
            .join(ConversationMember)
            .filter(ConversationMember.employee_id.in_([emp1_id, emp2_id]))
            .group_by(Conversation.id)
            .having(self.db.func.count(ConversationMember.id) == 2)
            .first()
        )
        if existing:
            return existing

        conv = Conversation(
            id=uuid.uuid4(),
            type="DIRECT",
            title=f"Direct: {emp2_name}",
            created_by=emp1_id
        )
        self.db.add(conv)
        self.db.flush()

        self.db.add(ConversationMember(conversation_id=conv.id, employee_id=emp1_id))
        self.db.add(ConversationMember(conversation_id=conv.id, employee_id=emp2_id))
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def create_channel(self, title: str, conv_type: str, created_by: uuid.UUID, department_id: Optional[uuid.UUID] = None, member_ids: List[uuid.UUID] = None) -> Conversation:
        conv = Conversation(
            id=uuid.uuid4(),
            type=conv_type,
            title=title,
            department_id=department_id,
            created_by=created_by
        )
        self.db.add(conv)
        self.db.flush()

        # Add creator
        self.db.add(ConversationMember(conversation_id=conv.id, employee_id=created_by))

        if member_ids:
            for m_id in member_ids:
                if m_id != created_by:
                    self.db.add(ConversationMember(conversation_id=conv.id, employee_id=m_id))

        self.db.commit()
        self.db.refresh(conv)
        return conv

    def list_messages(self, conversation_id: uuid.UUID, limit: int = 50) -> List[Message]:
        return (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .options(joinedload(Message.sender))
            .order_by(Message.created_at.asc())
            .limit(limit)
            .all()
        )

    def post_message(self, conversation_id: uuid.UUID, sender_id: uuid.UUID, content: str) -> Message:
        sanitized_content, was_redacted = sanitize_chat_content(content)
        msg = Message(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=sanitized_content,
            is_redacted=was_redacted
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg
