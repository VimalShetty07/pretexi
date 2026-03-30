"""add dashboard admin messages table

Revision ID: a9b0c1d2e3f4
Revises: f7a8b9c0d1e2
Create Date: 2026-03-30 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("dashboard_admin_messages"):
        op.create_table(
            "dashboard_admin_messages",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("organisation_id", sa.String(length=36), nullable=False),
            sa.Column("created_by_user_id", sa.String(length=36), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["organisation_id"], ["organisations.id"]),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    index_names = {idx["name"] for idx in inspector.get_indexes("dashboard_admin_messages")}
    if "ix_dashboard_admin_messages_organisation_id" not in index_names:
        op.create_index("ix_dashboard_admin_messages_organisation_id", "dashboard_admin_messages", ["organisation_id"])
    if "ix_dashboard_admin_messages_created_by_user_id" not in index_names:
        op.create_index("ix_dashboard_admin_messages_created_by_user_id", "dashboard_admin_messages", ["created_by_user_id"])
    if "ix_dashboard_admin_messages_created_at" not in index_names:
        op.create_index("ix_dashboard_admin_messages_created_at", "dashboard_admin_messages", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_dashboard_admin_messages_created_at", table_name="dashboard_admin_messages")
    op.drop_index("ix_dashboard_admin_messages_created_by_user_id", table_name="dashboard_admin_messages")
    op.drop_index("ix_dashboard_admin_messages_organisation_id", table_name="dashboard_admin_messages")
    op.drop_table("dashboard_admin_messages")

