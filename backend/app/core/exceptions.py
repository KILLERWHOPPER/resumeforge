"""自定义异常类"""


class AppException(Exception):
    """应用基础异常"""

    def __init__(self, detail: str = "An error occurred", status_code: int = 500):
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.detail)


class NotFound(AppException):
    """资源未找到"""

    def __init__(self, detail: str = "资源不存在"):
        super().__init__(detail=detail, status_code=404)


class Unauthorized(AppException):
    """未认证"""

    def __init__(self, detail: str = "未提供有效的认证凭据"):
        super().__init__(detail=detail, status_code=401)


class Forbidden(AppException):
    """无权限"""

    def __init__(self, detail: str = "无权执行此操作"):
        super().__init__(detail=detail, status_code=403)


class BadRequest(AppException):
    """请求参数错误"""

    def __init__(self, detail: str = "请求参数错误"):
        super().__init__(detail=detail, status_code=400)


class Conflict(AppException):
    """资源冲突"""

    def __init__(self, detail: str = "资源已存在"):
        super().__init__(detail=detail, status_code=409)
