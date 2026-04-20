"""org checklist template table, revisions, document_checklist.category

Revision ID: b2c3d4e5f6a7
Revises: f9e8d7c6b5a4
Create Date: 2026-04-17 14:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "f9e8d7c6b5a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organisation_checklist_template_items",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organisation_id", sa.String(length=36), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=200), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_org_checklist_template_org_sort",
        "organisation_checklist_template_items",
        ["organisation_id", "sort_order"],
    )
    op.add_column(
        "organisations",
        sa.Column(
            "checklist_template_revision",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "workers",
        sa.Column(
            "checklist_sync_revision",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "document_checklist",
        sa.Column("category", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_checklist", "category")
    op.drop_column("workers", "checklist_sync_revision")
    op.drop_column("organisations", "checklist_template_revision")
    op.drop_index("ix_org_checklist_template_org_sort", table_name="organisation_checklist_template_items")
    op.drop_table("organisation_checklist_template_items")
