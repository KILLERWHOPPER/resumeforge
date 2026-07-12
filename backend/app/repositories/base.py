"""通用 Repository 基类（CRUD）"""

from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base
from app.core.pagination import Page, PaginationParams, paginate

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """通用 Repository 基类，提供基础 CRUD 操作"""

    def __init__(self, model: type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def create(self, **kwargs: Any) -> ModelType:
        """创建一条记录"""
        instance = self.model(**kwargs)
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def get(self, id: int) -> ModelType | None:
        """根据主键获取单条记录"""
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_or_404(self, id: int) -> ModelType:
        """获取记录，不存在则抛出 NotFound"""
        from app.core.exceptions import NotFound

        instance = await self.get(id)
        if not instance:
            raise NotFound(f"{self.model.__name__} 不存在")
        return instance

    async def update(self, id: int, **kwargs: Any) -> ModelType:
        """更新记录，返回更新后的实例"""
        instance = await self.get_or_404(id)
        for key, value in kwargs.items():
            if value is not None:
                setattr(instance, key, value)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def delete(self, id: int) -> None:
        """删除记录"""
        instance = await self.get_or_404(id)
        await self.db.delete(instance)

    async def list_all(
        self,
        *filters: Any,
        order_by: Any = None,
    ) -> Sequence[ModelType]:
        """列出所有符合条件的记录"""
        query = select(self.model)
        for f in filters:
            query = query.where(f)
        if order_by is not None:
            query = query.order_by(order_by)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def paginate(
        self,
        *filters: Any,
        order_by: Any = None,
        params: PaginationParams | None = None,
    ) -> Page[ModelType]:
        """分页查询"""
        if params is None:
            params = PaginationParams()

        # 计数
        count_query = select(func.count()).select_from(self.model)
        for f in filters:
            count_query = count_query.where(f)
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # 查询
        query = select(self.model)
        for f in filters:
            query = query.where(f)
        if order_by is not None:
            query = query.order_by(order_by)
        query = query.offset(params.offset).limit(params.limit)
        result = await self.db.execute(query)
        items = result.scalars().all()

        return paginate(items, total, params)
