"""document superseded retention columns (checklist template changes)

Revision ID: c3d4e5f6a8b0
Revises: b2c3d4e5f6a7
Create Date: 2026-04-17 16:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a8b0"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("legacy_org_template_revision", sa.Integer(), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("legacy_checklist_item_number", sa.Integer(), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("legacy_checklist_description", sa.Text(), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("legacy_checklist_category", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("superseded_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "superseded_at")
    op.drop_column("documents", "legacy_checklist_category")
    op.drop_column("documents", "legacy_checklist_description")
    op.drop_column("documents", "legacy_checklist_item_number")
    op.drop_column("documents", "legacy_org_template_revision")
