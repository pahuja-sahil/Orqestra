"""add_monitoring_columns_to_integration

Revision ID: a2b3c4d5e6f7
Revises: 1d4a8d3b2e5f
Create Date: 2026-05-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '1d4a8d3b2e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('integrations', sa.Column('docs_url', sa.String(length=500), nullable=True))
    op.add_column('integrations', sa.Column('expected_health_status', sa.Integer(), nullable=True))
    op.add_column('integrations', sa.Column('docs_last_fetched', sa.DateTime(timezone=True), nullable=True))
    op.add_column('integrations', sa.Column('deprecation_warnings', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('integrations', 'deprecation_warnings')
    op.drop_column('integrations', 'docs_last_fetched')
    op.drop_column('integrations', 'expected_health_status')
    op.drop_column('integrations', 'docs_url')
