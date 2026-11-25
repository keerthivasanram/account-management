"""Private media storage on Supabase Storage.

Files go into a private bucket through the backend (service-role key never reaches the
browser). Posts store a reference "storage:<bucket>/<path>"; anyone allowed to see the post
gets a short-lived signed URL. Nothing in the bucket is publicly listable or readable.
"""
import uuid
from typing import Optional

import httpx
from fastapi import HTTPException

from app.core.config import settings

BUCKET = "post-media"
REF_PREFIX = f"storage:{BUCKET}/"
MAX_BYTES = 50 * 1024 * 1024  # Supabase's default per-file limit
ALLOWED = {
    "image/jpeg": ("jpg", "IMAGE"),
    "image/png": ("png", "IMAGE"),
    "video/mp4": ("mp4", "VIDEO"),
    "video/quicktime": ("mov", "VIDEO"),
}
SIGNED_TTL_SECONDS = 60 * 60


class StorageService:
    def __init__(self, client: Optional[httpx.Client] = None):
        self.base = (settings.SUPABASE_URL or "").rstrip("/") + "/storage/v1"
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY or ""
        self._client = client

    @property
    def configured(self) -> bool:
        return bool(settings.SUPABASE_URL and self.key)

    def _http(self) -> httpx.Client:
        return self._client or httpx.Client(timeout=60)

    def _headers(self, extra=None):
        # New-format secret keys (sb_secret_...) go in `apikey` only; the API gateway maps them to
        # the service role. Legacy service_role keys are JWTs and are also sent as a Bearer token.
        h = {"apikey": self.key}
        if self.key.startswith("eyJ"):
            h["Authorization"] = f"Bearer {self.key}"
        h.update(extra or {})
        return h

    def _ensure_bucket(self, http: httpx.Client) -> None:
        r = http.get(f"{self.base}/bucket/{BUCKET}", headers=self._headers())
        if r.status_code == 200:
            return
        created = http.post(f"{self.base}/bucket", headers=self._headers(), json={
            "id": BUCKET, "name": BUCKET, "public": False,
            "file_size_limit": MAX_BYTES, "allowed_mime_types": list(ALLOWED),
        })
        if created.status_code not in (200, 201) and "already exists" not in created.text.lower():
            raise HTTPException(status_code=502, detail="Media storage is not available right now.")

    def upload(self, data: bytes, content_type: str, owner_id: uuid.UUID) -> dict:
        if not self.configured:
            raise HTTPException(status_code=503, detail="Media upload isn't configured on this server.")
        if content_type not in ALLOWED:
            raise HTTPException(status_code=415, detail="Upload a JPG or PNG image, or an MP4 or MOV video.")
        if not data:
            raise HTTPException(status_code=400, detail="The file is empty.")
        if len(data) > MAX_BYTES:
            raise HTTPException(status_code=413, detail="Files must be 50 MB or smaller.")
        ext, kind = ALLOWED[content_type]
        path = f"{owner_id}/{uuid.uuid4().hex}.{ext}"
        http = self._http()
        try:
            self._ensure_bucket(http)
            r = http.post(f"{self.base}/object/{BUCKET}/{path}", content=data,
                          headers=self._headers({"Content-Type": content_type, "x-upsert": "false"}))
            if r.status_code not in (200, 201):
                raise HTTPException(status_code=502, detail="The upload didn't go through. Try again.")
        finally:
            if self._client is None:
                http.close()
        ref = REF_PREFIX + path
        return {"media_ref": ref, "kind": kind, "preview_url": self.signed_url(ref)}

    def signed_url(self, media_ref: str) -> Optional[str]:
        """Short-lived URL for a storage reference; external URLs are returned unchanged."""
        if not media_ref:
            return None
        if not media_ref.startswith(REF_PREFIX):
            return media_ref
        if not self.configured:
            return None
        path = media_ref[len(REF_PREFIX):]
        http = self._http()
        try:
            r = http.post(f"{self.base}/object/sign/{BUCKET}/{path}", headers=self._headers(),
                          json={"expiresIn": SIGNED_TTL_SECONDS})
            if r.status_code != 200:
                return None
            signed = r.json().get("signedURL") or r.json().get("signedUrl")
            return f"{self.base}{signed}" if signed and signed.startswith("/") else signed
        except httpx.HTTPError:
            return None
        finally:
            if self._client is None:
                http.close()

    def signed_urls(self, media_refs) -> dict:
        """Batch version of signed_url: {ref: url-or-None} with one Storage request."""
        refs = [r for r in dict.fromkeys(media_refs) if r]
        out = {r: (r if not r.startswith(REF_PREFIX) else None) for r in refs}
        paths = [r[len(REF_PREFIX):] for r in refs if r.startswith(REF_PREFIX)]
        if not paths or not self.configured:
            return out
        http = self._http()
        try:
            r = http.post(f"{self.base}/object/sign/{BUCKET}", headers=self._headers(),
                          json={"expiresIn": SIGNED_TTL_SECONDS, "paths": paths})
            if r.status_code == 200:
                for item in r.json():
                    signed = item.get("signedURL") or item.get("signedUrl")
                    if item.get("path") and signed:
                        out[REF_PREFIX + item["path"]] = f"{self.base}{signed}" if signed.startswith("/") else signed
        except httpx.HTTPError:
            pass  # previews are optional; the post still lists
        finally:
            if self._client is None:
                http.close()
        return out

    @staticmethod
    def owns_ref(media_ref: str, owner_id: uuid.UUID) -> bool:
        """A storage reference may only be attached by the person who uploaded it."""
        return not media_ref.startswith("storage:") or media_ref.startswith(f"{REF_PREFIX}{owner_id}/")
