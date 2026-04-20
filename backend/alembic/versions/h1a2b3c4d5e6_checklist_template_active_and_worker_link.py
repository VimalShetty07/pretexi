"""checklist template is_active + document_checklist.template_item_id

Revision ID: h1a2b3c4d5e6
Revises: c3d4e5f6a8b0
Create Date: 2026-04-20 22:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h1a2b3c4d5e6"
down_revision: Union[str, None] = "c3d4e5f6a8b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organisation_checklist_template_items",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "document_checklist",
        sa.Column("template_item_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_document_checklist_template_item",
        "document_checklist",
        "organisation_checklist_template_items",
        ["template_item_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "uq_document_checklist_worker_template",
        "document_checklist",
        ["worker_id", "template_item_id"],
        unique=True,
        postgresql_where=sa.text("template_item_id IS NOT NULL"),
    )

    # Best-effort: pair existing checklist rows to template rows by (org, 1-based order).
    op.execute(
        sa.text(
            """
            UPDATE document_checklist AS dc
            SET template_item_id = sub.template_id
            FROM (
                SELECT dc2.id AS dc_id, ti.id AS template_id
                FROM document_checklist dc2
                JOIN workers w ON w.id = dc2.worker_id
                JOIN organisation_checklist_template_items ti
                  ON ti.organisation_id = w.organisation_id
                JOIN (
                    SELECT id, organisation_id,
                           ROW_NUMBER() OVER (
                             PARTITION BY organisation_id ORDER BY sort_order ASC, id ASC
                           ) AS ord
                    FROM organisation_checklist_template_items
                ) tord ON tord.id = ti.id AND tord.ord = dc2.item_number
                WHERE dc2.template_item_id IS NULL
            ) AS sub
            WHERE dc.id = sub.dc_id
            """
        )
    )


def downgrade() -> None:
    op.drop_index("uq_document_checklist_worker_template", table_name="document_checklist")
    op.drop_constraint("fk_document_checklist_template_item", "document_checklist", type_="foreignkey")
    op.drop_column("document_checklist", "template_item_id")
    op.drop_column("organisation_checklist_template_items", "is_active")
