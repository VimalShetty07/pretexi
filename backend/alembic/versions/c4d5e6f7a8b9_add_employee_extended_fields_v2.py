"""add org dropdown lists and worker personal/employment extended fields

Revision ID: c4d5e6f7a8b9
Revises: b2d3e4f5a6c7
Create Date: 2026-03-27 16:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b2d3e4f5a6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organisations", sa.Column("department_options", sa.JSON(), nullable=True))
    op.add_column("organisations", sa.Column("work_location_options", sa.JSON(), nullable=True))
    op.add_column("organisations", sa.Column("onboarding_stage_options", sa.JSON(), nullable=True))

    op.add_column("workers", sa.Column("second_name", sa.String(length=128), nullable=True))
    op.add_column("workers", sa.Column("sex", sa.String(length=30), nullable=True))
    op.add_column("workers", sa.Column("address_line_1", sa.String(length=255), nullable=True))
    op.add_column("workers", sa.Column("address_line_2", sa.String(length=255), nullable=True))
    op.add_column("workers", sa.Column("address_line_3", sa.String(length=255), nullable=True))
    op.add_column("workers", sa.Column("uk_residence_country", sa.String(length=50), nullable=True))
    op.add_column(
        "workers",
        sa.Column("salary_pay_type", sa.String(length=20), nullable=False, server_default="annual"),
    )
    op.add_column("workers", sa.Column("hr_onboarding_stage", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("workers", "hr_onboarding_stage")
    op.drop_column("workers", "salary_pay_type")
    op.drop_column("workers", "uk_residence_country")
    op.drop_column("workers", "address_line_3")
    op.drop_column("workers", "address_line_2")
    op.drop_column("workers", "address_line_1")
    op.drop_column("workers", "sex")
    op.drop_column("workers", "second_name")
    op.drop_column("organisations", "onboarding_stage_options")
    op.drop_column("organisations", "work_location_options")
    op.drop_column("organisations", "department_options")
