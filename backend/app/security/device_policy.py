"""Company software: phones and tablets may not use the API.

Detection uses the User-Agent and the Sec-CH-UA-Mobile client hint. It stops ordinary phone and
tablet browsers; a "request desktop site" browser can still look like a computer, so this is a
policy guard, not device attestation (registered company devices would be the strong control).
"""
import re

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

MOBILE_UA = re.compile(r"Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile|Silk|Kindle", re.I)
MOBILE_BLOCKED_DETAIL = "Klarves is available on company computers only. Please sign in from your company laptop or desktop."


def is_mobile_request(user_agent: str, ch_mobile: str = "") -> bool:
    if (ch_mobile or "").strip() == "?1":
        return True
    return bool(MOBILE_UA.search(user_agent or ""))


class MobileBlockMiddleware(BaseHTTPMiddleware):
    """Refuses /api requests from phones and tablets (health checks and CORS preflight pass)."""

    async def dispatch(self, request, call_next):
        path = request.url.path
        if (request.method != "OPTIONS" and path.startswith("/api/") and not path.startswith("/api/health")
                and is_mobile_request(request.headers.get("user-agent", ""), request.headers.get("sec-ch-ua-mobile", ""))):
            return JSONResponse(status_code=403, content={"detail": MOBILE_BLOCKED_DETAIL, "code": "MOBILE_BLOCKED"})
        return await call_next(request)
