import hmac
import hashlib
import time
import json
import base64
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
import httpx
from app.core.config import settings

class MetaIntegrationClient:
    def __init__(self):
        self.app_id = settings.META_APP_ID
        self.app_secret = settings.META_APP_SECRET
        self.redirect_uri = settings.META_REDIRECT_URI
        self.version = settings.META_API_VERSION
        self.graph_url = f"https://graph.facebook.com/{self.version}"

    def is_configured(self) -> bool:
        """Returns True if Meta App credentials are fully configured."""
        return bool(self.app_id and self.app_secret and not self.app_id.startswith("mock"))

    def generate_state(self, account_id: str, employee_id: str) -> str:
        """
        Generates a tamper-proof signed state token containing account_id, employee_id, and expiry.
        """
        payload = {
            "account_id": str(account_id),
            "employee_id": str(employee_id),
            "exp": int(time.time()) + 900  # 15 minutes validity
        }
        raw_json = json.dumps(payload, separators=(",", ":"))
        encoded_data = base64.urlsafe_b64encode(raw_json.encode("utf-8")).decode("utf-8")
        
        # Sign with app_secret or encryption key
        secret = (self.app_secret or settings.TOKEN_ENCRYPTION_KEY).encode("utf-8")
        sig = hmac.new(secret, encoded_data.encode("utf-8"), hashlib.sha256).hexdigest()
        
        return f"{encoded_data}.{sig}"

    def verify_state(self, state: str) -> Optional[Dict[str, Any]]:
        """
        Verifies the HMAC signature and expiration of the state parameter.
        Returns the decoded payload dict if valid, or None.
        """
        try:
            parts = state.split(".")
            if len(parts) != 2:
                return None
            encoded_data, sig = parts
            secret = (self.app_secret or settings.TOKEN_ENCRYPTION_KEY).encode("utf-8")
            expected_sig = hmac.new(secret, encoded_data.encode("utf-8"), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(sig, expected_sig):
                return None

            raw_json = base64.urlsafe_b64decode(encoded_data.encode("utf-8")).decode("utf-8")
            payload = json.loads(raw_json)
            if payload.get("exp", 0) < time.time():
                return None
            return payload
        except Exception:
            return None

    def get_authorization_url(self, account_id: str, employee_id: str) -> Tuple[str, str]:
        """
        Returns (authorization_url, state).
        If Meta is not configured, returns mock simulation authorization URL.
        """
        state = self.generate_state(account_id, employee_id)
        if not self.is_configured():
            # In simulation mode, point directly back to the redirect URI with mock code
            mock_url = f"{self.redirect_uri}?code=simulated_meta_code_{account_id}&state={state}"
            return mock_url, state

        scopes = [
            "instagram_basic",
            "pages_show_list",
            "pages_read_engagement",
            "business_management"
        ]
        scope_str = ",".join(scopes)
        auth_url = (
            f"https://www.facebook.com/{self.version}/dialog/oauth"
            f"?client_id={self.app_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&state={state}"
            f"&scope={scope_str}"
            f"&response_type=code"
        )
        return auth_url, state

    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchanges the authorization code for a long-lived access token and retrieves Instagram account details.
        """
        # If simulation mode or mock code
        if not self.is_configured() or code.startswith("simulated_"):
            return {
                "access_token": f"mock_meta_access_token_{hashlib.md5(code.encode()).hexdigest()}",
                "expires_in": 5184000, # 60 days
                "token_type": "bearer",
                "instagram_user_id": f"ig_uid_{hashlib.sha256(code.encode()).hexdigest()[:12]}",
                "instagram_username": "mock_connected_user",
                "permissions": ["instagram_basic", "pages_show_list", "pages_read_engagement"]
            }

        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Exchange short-lived token
            token_url = f"{self.graph_url}/oauth/access_token"
            resp = await client.get(token_url, params={
                "client_id": self.app_id,
                "client_secret": self.app_secret,
                "redirect_uri": self.redirect_uri,
                "code": code
            })
            if resp.status_code != 200:
                raise ValueError(f"Failed to exchange code: {resp.text}")
            token_data = resp.json()
            short_token = token_data.get("access_token")

            # 2. Exchange for long-lived user token (60 days)
            long_lived_resp = await client.get(token_url, params={
                "grant_type": "fb_exchange_token",
                "client_id": self.app_id,
                "client_secret": self.app_secret,
                "fb_exchange_token": short_token
            })
            if long_lived_resp.status_code == 200:
                long_data = long_lived_resp.json()
                access_token = long_data.get("access_token", short_token)
                expires_in = long_data.get("expires_in", 5184000)
            else:
                access_token = short_token
                expires_in = token_data.get("expires_in", 3600)

            # 3. Retrieve connected Instagram Business / Creator account
            accounts_resp = await client.get(
                f"{self.graph_url}/me/accounts",
                params={
                    "access_token": access_token,
                    "fields": "instagram_business_account{id,username,name}"
                }
            )
            ig_id = None
            ig_username = None
            if accounts_resp.status_code == 200:
                pages_data = accounts_resp.json().get("data", [])
                for page in pages_data:
                    ig_acc = page.get("instagram_business_account")
                    if ig_acc:
                        ig_id = ig_acc.get("id")
                        ig_username = ig_acc.get("username")
                        break

            # 4. Check permissions
            perm_resp = await client.get(
                f"{self.graph_url}/me/permissions",
                params={"access_token": access_token}
            )
            granted_perms = []
            if perm_resp.status_code == 200:
                perm_items = perm_resp.json().get("data", [])
                granted_perms = [p["permission"] for p in perm_items if p.get("status") == "granted"]

            return {
                "access_token": access_token,
                "expires_in": expires_in,
                "instagram_user_id": ig_id or "ig_unknown",
                "instagram_username": ig_username,
                "permissions": granted_perms
            }

    async def validate_token(self, decrypted_token: str) -> Tuple[bool, Optional[str]]:
        """
        Validates if the access token is still active and valid against Meta's debug_token endpoint.
        """
        if not self.is_configured() or decrypted_token.startswith("mock_"):
            return True, "Valid simulated token"

        async with httpx.AsyncClient(timeout=10.0) as client:
            debug_url = f"{self.graph_url}/debug_token"
            resp = await client.get(debug_url, params={
                "input_token": decrypted_token,
                "access_token": f"{self.app_id}|{self.app_secret}"
            })
            if resp.status_code != 200:
                return False, f"Token validation request failed: {resp.text}"
            data = resp.json().get("data", {})
            is_valid = data.get("is_valid", False)
            return is_valid, "Token is active" if is_valid else "Token has expired or was revoked"
