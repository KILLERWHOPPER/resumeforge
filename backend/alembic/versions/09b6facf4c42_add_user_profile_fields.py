"""add user profile fields

Revision ID: 09b6facf4c42
Revises: 6e076e91ec57
Create Date: 2026-08-16 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "09b6facf4c42"
down_revision: Union[str, None] = "6e076e91ec57"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name_zh", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("name_en", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("contact_email", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("address", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("linkedin_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "linkedin_url")
    op.drop_column("users", "address")
    op.drop_column("users", "phone")
    op.drop_column("users", "contact_email")
    op.drop_column("users", "name_en")
    op.drop_column("users", "name_zh")
