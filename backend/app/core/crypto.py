"""AES-256-GCM 加解密工具"""
# ruff: noqa: TRY003

from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_KEY_SIZE = 32


def _validate_key(key: bytes) -> bytes:
    if len(key) != _KEY_SIZE:
        raise ValueError("invalid encryption key length")
    return key


def encrypt(plaintext: str, key: bytes | None = None) -> str:
    """AES-256-GCM 加密，返回 base64(nonce + ciphertext + tag)"""
    key = _validate_key(key or bytes.fromhex(settings.ENCRYPTION_KEY))
    nonce = os.urandom(12)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt(blob: str, key: bytes | None = None) -> str:
    """解密 encrypt() 的输出"""
    key = _validate_key(key or bytes.fromhex(settings.ENCRYPTION_KEY))
    raw = base64.b64decode(blob)
    nonce, ciphertext = raw[:12], raw[12:]
    return AESGCM(key).decrypt(nonce, ciphertext, None).decode("utf-8")


def decrypt_or_plaintext(blob: str) -> str:
    """解密；若为历史明文存储的数据则原样返回"""
    try:
        return decrypt(blob)
    except Exception:
        return blob
