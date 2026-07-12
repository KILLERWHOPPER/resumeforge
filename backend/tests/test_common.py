"""公共模块测试"""

from __future__ import annotations

import pytest

from app.core.exceptions import AppException, NotFound, Unauthorized, Forbidden, BadRequest, Conflict
from app.core.pagination import PaginationParams, paginate


class TestExceptions:
    """测试自定义异常"""

    def test_app_exception(self):
        exc = AppException("test error", 400)
        assert exc.detail == "test error"
        assert exc.status_code == 400

    def test_not_found(self):
        exc = NotFound("找不到")
        assert exc.detail == "找不到"
        assert exc.status_code == 404

    def test_unauthorized(self):
        exc = Unauthorized()
        assert exc.status_code == 401

    def test_forbidden(self):
        exc = Forbidden()
        assert exc.status_code == 403

    def test_bad_request(self):
        exc = BadRequest("参数错误")
        assert exc.status_code == 400

    def test_conflict(self):
        exc = Conflict()
        assert exc.status_code == 409


class TestPagination:
    """测试分页工具"""

    def test_pagination_params_default(self):
        params = PaginationParams()
        assert params.page == 1
        assert params.page_size == 20
        assert params.offset == 0

    def test_pagination_params_negative(self):
        params = PaginationParams(page=-1, page_size=-5)
        assert params.page == 1  # max 1
        assert params.page_size == 1  # min 1

    def test_pagination_params_overflow(self):
        params = PaginationParams(page_size=200)
        assert params.page_size == 100  # max 100

    def test_paginate(self):
        items = [1, 2, 3]
        page = paginate(items, len(items), PaginationParams(page=1, page_size=10))
        assert page.total == 3
        assert page.total_pages == 1
        assert page.items == [1, 2, 3]

    def test_paginate_multi_page(self):
        items = list(range(5))
        page = paginate(items, 50, PaginationParams(page=2, page_size=5))
        assert page.page == 2
        assert page.total_pages == 10
        assert page.total == 50
