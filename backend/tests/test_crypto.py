"""AES-256-GCM 加解密工具测试"""

from __future__ import annotations

import pytest

from app.core.crypto import decrypt, decrypt_or_plaintext, encrypt


def test_encrypt_decrypt_roundtrip():
    """加密后能解密还原"""
    plaintext = "sk-secret-key-value-123"
    blob = encrypt(plaintext)
    assert decrypt(blob) == plaintext


def test_encrypt_produces_ciphertext():
    """加密结果不含明文且长度足够"""
    plaintext = "sk-super-secret"
    blob = encrypt(plaintext)
    assert plaintext not in blob
    assert len(blob) > len(plaintext)


def test_encrypt_random_nonce():
    """相同明文两次加密结果不同（随机 nonce）"""
    a = encrypt("sk-same")
    b = encrypt("sk-same")
    assert a != b
    assert decrypt(a) == decrypt(b) == "sk-same"


def test_invalid_key_length():
    """密钥长度非 32 字节时报错"""
    with pytest.raises(ValueError):
        encrypt("sk-x", key=b"tooshort")


def test_decrypt_or_plaintext_encrypted():
    """解密加密串返回明文"""
    blob = encrypt("sk-value")
    assert decrypt_or_plaintext(blob) == "sk-value"


def test_decrypt_or_plaintext_legacy_plaintext():
    """历史明文数据原样返回，不抛错"""
    assert decrypt_or_plaintext("sk-legacy-plaintext") == "sk-legacy-plaintext"
