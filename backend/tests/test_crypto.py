import pytest
from app.security.crypto import encrypt_token, decrypt_token

def test_token_encryption_and_decryption():
    secret_token = "EAABwzLixnjYBAKZA...very_secret_meta_access_token_12345"
    encrypted = encrypt_token(secret_token)

    assert encrypted != secret_token
    assert len(encrypted) > 20

    decrypted = decrypt_token(encrypted)
    assert decrypted == secret_token

def test_empty_token_encryption():
    assert encrypt_token("") == ""
    assert decrypt_token("") == ""
