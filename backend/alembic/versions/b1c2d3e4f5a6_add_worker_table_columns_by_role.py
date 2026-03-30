"""add worker table columns by role on organisations

Revision ID: b1c2d3e4f5a6
Revises: a9b0c1d2e3f4
Create Date: 2026-03-30 11:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a9b0c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organisations", sa.Column("worker_table_columns_by_role", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("organisations", "worker_table_columns_by_role")

