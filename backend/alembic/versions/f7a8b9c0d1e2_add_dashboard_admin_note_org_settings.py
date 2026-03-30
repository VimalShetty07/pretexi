"""add dashboard_admin_note to organisations

Revision ID: f7a8b9c0d1e2
Revises: e1f2a3b4c5d6
Create Date: 2026-03-27 18:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organisations", sa.Column("dashboard_admin_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("organisations", "dashboard_admin_note")

