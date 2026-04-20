"""worker rtw_verification_checklist JSON (admin RTW verification)

Revision ID: j1a2b3c4d5e8
Revises: i1a2b3c4d5e7
Create Date: 2026-04-21 14:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "j1a2b3c4d5e8"
down_revision: Union[str, None] = "i1a2b3c4d5e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workers",
        sa.Column("rtw_verification_checklist", postgresql.JSON(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("workers", "rtw_verification_checklist")
