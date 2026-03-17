# app/models/user.py
from sqlalchemy import (
    Column, String, Boolean,
    DateTime, Text
)
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from datetime import datetime, timezone
import uuid


class User(Base):
    __tablename__ = "users"

    # UUID is unguessable unlike integer IDs (1,2,3...)
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )

    # index=True = fast lookups by email
    # Without index: DB scans every row
    # With index: DB jumps directly to row
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    name = Column(String(255), nullable=False)

    profile_picture = Column(Text, nullable=True)

    # Google OAuth ID
    google_id = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True
    )

    # 2FA fields
    totp_secret = Column(Text, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False, nullable=False)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Stored hashed refresh token
    refresh_token = Column(Text, nullable=True)

    # Timestamps — every production table n