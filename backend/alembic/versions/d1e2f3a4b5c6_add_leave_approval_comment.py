"""add approval_comment to leave_requests

Revision ID: d1e2f3a4b5c6
Revises: a9b0c1d2e3f4
Create Date: 2026-04-07 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("leave_requests")}
    if "approval_comment" not in cols:
        op.add_column("leave_requests", sa.Column("approval_comment", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("leave_requests")}
    if "approval_comment" in cols:
        op.drop_column("leave_requests", "approval_comment")
