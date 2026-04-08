"""add timestamp columns to users
Revision ID: ddde1c1b6c44
Revises: 6ad4d8bb27a8
Create Date: 2026-04-09 01:29:30.543094
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'ddde1c1b6c44'
down_revision: Union[str, None] = '6ad4d8bb27a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        nullable=True
    ))
    op.add_column('users', sa.Column(
        'updated_at',
        sa.DateTime(timezone=True),
        nullable=True
    ))
    op.add_column('users', sa.Column(
        'last_login_at',
        sa.DateTime(timezone=True),
        nullable=True
    ))


def downgrade() -> None:
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'created_at')