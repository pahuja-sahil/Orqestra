"""Add repo fields to integration

Revision ID: f2bfcc698dfa
Revises: 38fcae2f1e11
Create Date: 2026-05-07 22:21:01.966498

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2bfcc698dfa'
down_revision: Union[str, None] = '38fcae2f1e11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('integrations', sa.Column('repo_url', sa.String(length=500), nullable=True))
    op.add_column('integrations', sa.Column('repo_path', sa.String(length=500), nullable=True))
    op.add_column('integrations', sa.Column('file_path', sa.String(length=500), nullable=True))
    op.add_column('integrations', sa.Column('default_branch', sa.String(length=100), nullable=True))

def downgrade() -> None:
    op.drop_column('integrations', 'default_branch')
    op.drop_column('integrations', 'file_path')
    op.drop_column('integrations', 'repo_path')
    op.drop_column('integrations', 'repo_url')
