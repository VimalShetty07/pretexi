"""add worker profile photo columns

Revision ID: b2d3e4f5a6c7
Revises: a1c2e3f4b5d6
Create Date: 2026-03-27 14:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2d3e4f5a6c7"
down_revision: Union[str, None] = "a1c2e3f4b5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("workers", sa.Column("profile_photo_s3_key", sa.Text(), nullable=True))
    op.add_column("workers", sa.Column("profile_photo_mime", sa.String(length=100), nullable=True))
    op.add_column("workers", sa.Column("profile_photo_data", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column("workers", "profile_photo_data")
    op.drop_column("workers", "profile_photo_mime")
    op.drop_column("workers", "profile_photo_s3_key")
