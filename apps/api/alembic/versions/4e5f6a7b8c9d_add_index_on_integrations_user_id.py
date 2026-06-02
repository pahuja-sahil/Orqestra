"""add index on integrations.user_id

Revision ID: 4e5f6a7b8c9d
Revises: a2b3c4d5e6f7
Create Date: 2026-06-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '4e5f6a7b8c9d'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f('ix_integrations_user_id'), 'integrations', ['user_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_integrations_user_id'), table_name='integrations')
