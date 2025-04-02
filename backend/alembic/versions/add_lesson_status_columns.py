"""add lesson status columns

Revision ID: add_lesson_status_columns
Revises: 
Create Date: 2024-04-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_lesson_status_columns'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Добавляем колонку is_completed
    op.add_column('lessons', sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'))
    # Добавляем колонку is_cancelled
    op.add_column('lessons', sa.Column('is_cancelled', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    # Удаляем колонки в обратном порядке
    op.drop_column('lessons', 'is_cancelled')
    op.drop_column('lessons', 'is_completed') 