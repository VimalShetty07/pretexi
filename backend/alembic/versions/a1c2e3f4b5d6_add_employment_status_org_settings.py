"""add employment_status and org employment_status_options

Revision ID: a1c2e3f4b5d6
Revises: e0b8d3e3a6f4
Create Date: 2026-03-27 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1c2e3f4b5d6"
down_revision: Union[str, None] = "e0b8d3e3a6f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organisations", sa.Column("employment_status_options", sa.JSON(), nullable=True))
    op.add_column(
        "workers",
        sa.Column(
            "employment_status",
            sa.String(length=100),
            nullable=False,
            server_default="Active",
        ),
    )


def downgrade() -> None:
    op.drop_column("workers", "employment_status")
    op.drop_column("organisations", "employment_status_options")
