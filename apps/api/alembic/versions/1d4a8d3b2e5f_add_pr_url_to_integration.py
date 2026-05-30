"""add_pr_url_to_integration

Revision ID: 1d4a8d3b2e5f
Revises: 318e319eff36
Create Date: 2026-05-28 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1d4a8d3b2e5f'
down_revision: Union[str, None] = '318e319eff36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('integrations', sa.Column('pr_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('integrations', 'pr_url')
