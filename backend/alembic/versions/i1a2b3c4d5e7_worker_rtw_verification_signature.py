"""worker RTW verification signature (British/Irish HR sign-off)

Revision ID: i1a2b3c4d5e7
Revises: h1a2b3c4d5e6
Create Date: 2026-04-21 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i1a2b3c4d5e7"
down_revision: Union[str, None] = "h1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workers",
        sa.Column("rtw_check_signed_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "workers",
        sa.Column("rtw_check_signed_by_user_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_workers_rtw_check_signed_by_user",
        "workers",
        "users",
        ["rtw_check_signed_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_workers_rtw_check_signed_by_user", "workers", type_="foreignkey")
    op.drop_column("workers", "rtw_check_signed_by_user_id")
    op.drop_column("workers", "rtw_check_signed_at")
