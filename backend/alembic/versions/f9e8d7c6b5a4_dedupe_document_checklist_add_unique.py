"""dedupe document_checklist rows and add unique (worker_id, item_number)

Revision ID: f9e8d7c6b5a4
Revises: e8f9a0b1c2d3
Create Date: 2026-04-17 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9e8d7c6b5a4"
down_revision: Union[str, None] = "e8f9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    dup_groups = conn.execute(
        sa.text(
            """
            SELECT worker_id, item_number
            FROM document_checklist
            GROUP BY worker_id, item_number
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    for worker_id, item_number in dup_groups:
        rows = conn.execute(
            sa.text(
                """
                SELECT id FROM document_checklist
                WHERE worker_id = :w AND item_number = :i
                ORDER BY id ASC
                """
            ),
            {"w": worker_id, "i": item_number},
        ).fetchall()
        ids = [r[0] for r in rows]

        keeper = ids[0]
        best_doc_count = -1
        for iid in ids:
            cnt = conn.execute(
                sa.text(
                    "SELECT COUNT(*) FROM documents WHERE checklist_item_id = :cid"
                ),
                {"cid": iid},
            ).scalar()
            if cnt is not None and cnt > best_doc_count:
                best_doc_count = cnt
                keeper = iid

        for iid in ids:
            if iid == keeper:
                continue
            conn.execute(
                sa.text(
                    "UPDATE documents SET checklist_item_id = :k WHERE checklist_item_id = :o"
                ),
                {"k": keeper, "o": iid},
            )
            conn.execute(
                sa.text("DELETE FROM document_checklist WHERE id = :o"),
                {"o": iid},
            )

    op.create_unique_constraint(
        "uq_document_checklist_worker_item",
        "document_checklist",
        ["worker_id", "item_number"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_document_checklist_worker_item",
        "document_checklist",
        type_="unique",
    )
