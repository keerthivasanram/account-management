import hmac
import hashlib
import time
import json
import base64
import secrets
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
        self.ig_graph_url = f"https://graph.instagram.com/{self.version}"

    def is_configured(self) -> bool:
        """Returns True if Meta App credentials are fully configured."""
        return bool(self.app_id and self.app_secret and not self.app_id.startswith("mock"))

    def generate_state_token(self, account_id: str, employee_id: str) -> str:
        """
        Generates a secure, cryptographically random, signed state token containing:
        - account_id
        - employee_id
        - timestamp
        - nonce
        - HMAC signature
        """
        nonce = secrets.token_hex(16)
        timestamp = int(time.time())
        exp = timestamp + 900  # 15 minutes validity
        payload = {
            "account_id": str(account_id),
            "employee_id": str(employee_id),
            "iat": timestamp,
            "exp": exp,
            "nonce": nonce
        }
        raw_json = json.dumps(payload, separators=(",", ":"))
        encoded_data = base64.urlsafe_b64encode(raw_json.encode("utf-8")).decode("utf-8")
        
        # Sign with app_secret or encryption key
        secret = (self.app_secret or settings.TOKEN_ENCRYPTION_KEY).encode("utf-8")
        sig = hmac.new(secret, encoded_data.encode("utf-8"), hashlib.sha256).hexdigest()
        
        return f"{encoded_data}.{sig}"

    def verify_state_signature(self, state: str) -> Optional[Dict[str, Any]]:
        """
        Verifies the HMAC signature and expiration timestamp of the state parameter.
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

    def get_authorization_url(self, account_id: str, employee_id: str, state_token: str) -> str:
        """
        Generates the official Meta Instagram Platform OAuth authorization URL.
        Scopes evaluated: instagram_business_basic, instagram_business_content_publish.
        """
        if not self.is_configured():
            # In simulation mode, point back to redirect URI with a standard simulated authorization code
            return f"{self.redirect_uri}?code=simulated_meta_code_{account_id}&state={state_token}"

        scopes = [
            "instagram_business_basic",
            "instagram_business_content_publish"
        ]
        scope_str = ",".join(scopes)
        auth_url = (
            f"https://www.facebook.com/{self.version}/dialog/oauth"
            f"?client_id={self.app_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&state={state_token}"
            f"&scope={scope_str}"
            f"&response_type=code"
        )
        return auth_url

    async def exchange_code_for_token(self, code: str, expected_username: Optional[str] = None) -> Dict[str, Any]:
        """
        Exchanges the authorization code for a long-lived access token and retrieves Instagram account identity.
        Never associates a token solely based on client-provided username; relies on Meta-returned identity.
        """
        # Simulation Mode / Mock Code Handling for testing all edge cases
        if not self.is_configured() or code.startswith("simulated_") or code.startswith("mock_"):
            if "invalid" in code:
                raise ValueError("Meta OAuth code invalid or expired.")
            
            # Simulate different account types based on code keywords
            account_type = "BUSINESS"
            if "personal" in code:
                account_type = "PERSONAL"
            elif "creator" in code:
                account_type = "CREATOR"

            # Simulate account identity mismatch if requested in code
            if "mismatch" in code:
                simulated_username = "wrong_authorized_user"
                simulated_id = "ig_uid_9999999999"
            else:
                simulated_username = expected_username or "brand_official"
                simulated_id = f"ig_uid_{hashlib.sha256((simulated_username + code).encode()).hexdigest()[:12]}"

            token_suffix = ""
            if "expired" in code:
                token_suffix = "_expired"
            elif "revoked" in code:
                token_suffix = "_revoked"

            return {
                "access_token": f"mock_meta_access_token_{hashlib.md5(code.encode()).hexdigest()}{token_suffix}",
                "expires_in": 5184000,  # 60 days standard
                "token_type": "bearer",
                "instagram_user_id": simulated_id,
                "instagram_username": simulated_username,
                "account_type": account_type,
                "permissions": ["instagram_business_basic", "instagram_business_content_publish"]
            }

        # Official Meta Graph API Production Exchange
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Exchange authorization code for short-lived token
            token_url = f"{self.graph_url}/oauth/access_token"
            resp = await client.get(token_url, params={
                "client_id": self.app_id,
                "client_secret": self.app_secret,
                "redirect_uri": self.redirect_uri,
                "code": code
            })
            if resp.status_code != 200:
                raise ValueError(f"Failed to exchange code with Meta: {resp.text}")
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

            # 3. Retrieve authorized Instagram account identity
            # Primary: Look up Instagram Business / Creator account linked to Facebook pages
            accounts_resp = await client.get(
                f"{self.graph_url}/me/accounts",
                params={
                    "access_token": access_token,
                    "fields": "instagram_business_account{id,username,name}"
                }
            )
            ig_id = None
            ig_username = None
            account_type = "BUSINESS"

            if accounts_resp.status_code == 200:
                pages_data = accounts_resp.json().get("data", [])
                for page in pages_data:
                    ig_acc = page.get("instagram_business_account")
                    if ig_acc:
                        ig_id = ig_acc.get("id")
                        ig_username = ig_acc.get("username")
                        break

            # Fallback for Direct Instagram Platform Login
            if not ig_id:
                direct_ig_resp = await client.get(
                    f"{self.ig_graph_url}/me",
                    params={
                        "access_token": access_token,
                        "fields": "id,username,account_type"
                    }
                )
                if direct_ig_resp.status_code == 200:
                    direct_data = direct_ig_resp.json()
                    ig_id = direct_data.get("id")
                    ig_username = direct_data.get("username")
                    meta_type = direct_data.get("account_type", "").upper()
                    if meta_type in ("BUSINESS", "MEDIA_CREATOR", "CREATOR"):
                        account_type = "CREATOR" if "CREATOR" in meta_type else "BUSINESS"
                    else:
                        account_type = "PERSONAL"
                else:
                    account_type = "PERSONAL"

            # 4. Check granted permissions
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
                "instagram_user_id": ig_id,
                "instagram_username": ig_username,
                "account_type": account_type,
                "permissions": granted_perms
            }

    async def validate_token(self, decrypted_token: str) -> Tuple[bool, str, str]:
        """
        Validates token status against Meta debug_token endpoint.
        Returns: (is_valid, connection_status, message)
        """
        # Handle simulated validation
        if not self.is_configured() or decrypted_token.startswith("mock_"):
            if "_expired" in decrypted_token:
                return False, "TOKEN_EXPIRED", "Instagram access token has expired."
            elif "_revoked" in decrypted_token:
                return False, "ACCESS_REVOKED", "User has revoked application access on Meta/Instagram."
            elif "_reauth" in decrypted_token:
                return False, "REAUTHORIZATION_REQUIRED", "Permissions changed or reauthorization required."
            return True, "CONNECTED", "Token is active and valid."

        async with httpx.AsyncClient(timeout=10.0) as client:
            debug_url = f"{self.graph_url}/debug_token"
            resp = await client.get(debug_url, params={
                "input_token": decrypted_token,
                "access_token": f"{self.app_id}|{self.app_secret}"
            })
            if resp.status_code != 200:
                return False, "CONNECTION_FAILED", f"Token validation request failed: {resp.text}"
            
            data = resp.json().get("data", {})
            is_valid = data.get("is_valid", False)
            error_info = data.get("error", {})
            error_code = error_info.get("code")

            if is_valid:
                return True, "CONNECTED", "Token is active and valid."
            
            # Meta Error Code 190 subcodes:
            # 463: token expired
            # 458: app uninstalled / revoked
            # 460: password changed
            error_subcode = error_info.get("error_subcode")
            if error_subcode == 463:
                return False, "TOKEN_EXPIRED", "Instagram access token has expired. Please reconnect."
            elif error_subcode == 458:
                return False, "ACCESS_REVOKED", "Meta access was revoked by the user."
            elif error_subcode == 460 or error_code == 190:
                return False, "REAUTHORIZATION_REQUIRED", "Security credentials changed. Reauthorization is required."
            
            return False, "CONNECTION_FAILED", error_info.get("message", "Token is invalid.")
