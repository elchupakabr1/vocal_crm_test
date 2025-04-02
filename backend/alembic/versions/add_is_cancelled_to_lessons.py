"""add is_cancelled to lessons

Revision ID: add_is_cancelled_to_lessons
Revises: 
Create Date: 2024-04-02 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_is_cancelled_to_lessons'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('lessons', sa.Column('is_cancelled', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('lessons', 'is_cancelled') 