import base64
from cryptography.fernet import Fernet
from app.core.config import settings

def _get_fernet() -> Fernet:
    key = settings.TOKEN_ENCRYPTION_KEY
    # Ensure key is valid bytes
    if isinstance(key, str):
        key = key.encode("utf-8")
    return Fernet(key)

def encrypt_token(plain_token: str) -> str:
    """Encrypts a plaintext string (e.g. Meta access token) using Fernet."""
    if not plain_token:
        return ""
    f = _get_fernet()
    encrypted = f.encrypt(plain_token.encode("utf-8"))
    return encrypted.decode("utf-8")

def decrypt_token(cipher_text: str) -> str:
    """Decrypts a Fernet encrypted string back to plaintext."""
    if not cipher_text:
        return ""
    f = _get_fernet()
    decrypted = f.decrypt(cipher_text.encode("utf-8"))
    return decrypted.decode("utf-8")
