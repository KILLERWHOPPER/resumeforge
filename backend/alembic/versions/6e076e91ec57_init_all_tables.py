"""init: all tables

Revision ID: 6e076e91ec57
Revises: 
Create Date: 2026-07-11 20:16:46.086752
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e076e91ec57'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # experiences
    op.create_table('experiences',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('type', sa.String(length=20), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('school', sa.String(length=300), nullable=True),
    sa.Column('degree', sa.String(length=100), nullable=True),
    sa.Column('field_of_study', sa.String(length=200), nullable=True),
    sa.Column('gpa', sa.String(length=20), nullable=True),
    sa.Column('company', sa.String(length=300), nullable=True),
    sa.Column('position', sa.String(length=200), nullable=True),
    sa.Column('start_date', sa.String(length=10), nullable=True),
    sa.Column('end_date', sa.String(length=10), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('role', sa.String(length=200), nullable=True),
    sa.Column('tech_tags', sa.JSON(), nullable=True),
    sa.Column('url', sa.String(length=500), nullable=True),
    sa.Column('name', sa.String(length=200), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('proficiency', sa.String(length=20), nullable=True),
    sa.Column('issuer', sa.String(length=200), nullable=True),
    sa.Column('credential_url', sa.String(length=500), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_experiences_id'), 'experiences', ['id'], unique=False)

    # resumes（先不含 current_version_id 外键，避免循环依赖）
    op.create_table('resumes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('current_version_id', sa.Integer(), nullable=True),
    sa.Column('jd_text', sa.Text(), nullable=True),
    sa.Column('company_name', sa.String(length=300), nullable=True),
    sa.Column('target_language', sa.String(length=20), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resumes_id'), 'resumes', ['id'], unique=False)

    # resume_versions（引用 resumes）
    op.create_table('resume_versions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('resume_id', sa.Integer(), nullable=False),
    sa.Column('version_number', sa.Integer(), nullable=False),
    sa.Column('content', sa.JSON(), nullable=False),
    sa.Column('html_preview', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resume_versions_id'), 'resume_versions', ['id'], unique=False)

    # 回补 resumes.current_version_id 外键
    op.create_foreign_key('fk_resumes_current_version', 'resumes', 'resume_versions', ['current_version_id'], ['id'], ondelete='SET NULL')

    # jd_analyses
    op.create_table('jd_analyses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('resume_id', sa.Integer(), nullable=False),
    sa.Column('analysis', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jd_analyses_id'), 'jd_analyses', ['id'], unique=False)

    # llm_configs
    op.create_table('llm_configs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('base_url', sa.String(length=500), nullable=False),
    sa.Column('api_key_encrypted', sa.Text(), nullable=False),
    sa.Column('model_name', sa.String(length=200), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_llm_configs_id'), 'llm_configs', ['id'], unique=False)

    # password_resets
    op.create_table('password_resets',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(length=255), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_password_resets_token_hash'), 'password_resets', ['token_hash'], unique=True)

    # token_blacklist
    op.create_table('token_blacklist',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('jti', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('blacklisted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_token_blacklist_jti'), 'token_blacklist', ['jti'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_token_blacklist_jti'), table_name='token_blacklist')
    op.drop_table('token_blacklist')
    op.drop_index(op.f('ix_password_resets_token_hash'), table_name='password_resets')
    op.drop_table('password_resets')
    op.drop_index(op.f('ix_llm_configs_id'), table_name='llm_configs')
    op.drop_table('llm_configs')
    op.drop_index(op.f('ix_jd_analyses_id'), table_name='jd_analyses')
    op.drop_table('jd_analyses')
    op.drop_constraint('fk_resumes_current_version', 'resumes', type_='foreignkey')
    op.drop_index(op.f('ix_resume_versions_id'), table_name='resume_versions')
    op.drop_table('resume_versions')
    op.drop_index(op.f('ix_resumes_id'), table_name='resumes')
    op.drop_table('resumes')
    op.drop_index(op.f('ix_experiences_id'), table_name='experiences')
    op.drop_table('experiences')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
