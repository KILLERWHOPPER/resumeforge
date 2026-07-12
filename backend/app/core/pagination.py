"""分页工具"""

from __future__ import annotations

from math import ceil
from typing import Generic, Sequence, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """分页响应模型"""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        from_attributes = True


class PaginationParams:
    """分页参数，默认 page=1, page_size=20"""

    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = max(page, 1)
        self.page_size = min(max(page_size, 1), 100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def paginate(items: Sequence[T], total: int, params: PaginationParams) -> Page[T]:
    """构建分页响应"""
    return Page(
        items=list(items),
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=max(ceil(total / params.page_size), 1),
    )
