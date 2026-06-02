import uuid
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    api_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    generated_code = Column(Text, nullable=True)
    language = Column(String(50), default="python")

    status = Column(String(50), default="healthy")
    failure_count = Column(Integer, default=0)
    repair_attempts = Column(Integer, default=0)
    last_checked = Column(DateTime(timezone=True), nullable=True)
    last_repaired = Column(DateTime(timezone=True), nullable=True)

    circuit_state = Column(String(20), default="closed")

    repo_url = Column(String(500), nullable=True)
    repo_path = Column(String(500), nullable=True)
    file_path = Column(String(500), nullable=True)
    default_branch = Column(String(100), nullable=True)
    pr_url = Column(String(500), nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    health_check_url = Column(String(500), nullable=True)
    health_check = Column(Text, nullable=True)
    docs_hash = Column(String(64), nullable=True)
    cached_docs_context = Column(Text, nullable=True)

    docs_url = Column(String(500), nullable=True)
    expected_health_status = Column(Integer, nullable=True)
    docs_last_fetched = Column(DateTime(timezone=True), nullable=True)
    deprecation_warnings = Column(Text, nullable=True)