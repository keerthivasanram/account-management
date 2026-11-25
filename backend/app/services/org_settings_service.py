"""
Organisation-wide policy settings (super admin controlled).

Values live in the `org_settings` table; anything not stored falls back to DEFAULTS.
Each key has a validator so the API can never persist a malformed policy.
"""
from typing import Any, Callable, Dict

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import OrgSetting
from app.repositories.audit_repo import AuditRepository

LEAVE_TYPES = ("ANNUAL", "SICK", "CASUAL", "EMERGENCY")

DEFAULTS: Dict[str, Any] = {
    "company_name": "KLARVES Corporate",
    "account_target_min": 50,
    "account_target_max": 60,
    "leave_allowance_days": {"ANNUAL": 18, "SICK": 10, "CASUAL": 8, "EMERGENCY": 3},
    "require_mfa": False,
    "session_ttl_minutes": 480,
    "token_expiry_warning_days": 7,
    "alert_reassignments_per_hour": 10,
    "alert_copies_per_10_minutes": 30,
    "community_features": True,
    "content_ideas": [
        "Show the process: a behind-the-scenes Reel of how the product is made or packed.",
        "Answer the most common customer question in a 3-slide carousel.",
        "Before and after: one photo of the problem, one of the result.",
        "Feature a customer: repost a review with their permission and a thank-you.",
        "A 15-second tip your audience can use today, with the tip in the first line of the caption.",
        "Meet the team: introduce one person behind the brand.",
        "This or that: a two-option Story poll about the product.",
        "Myth vs fact about the niche, as a carousel.",
        "Show the product in use in an everyday setting, no studio.",
        "Count down to the next launch or offer with a Story sticker.",
    ],
}

DESCRIPTIONS: Dict[str, str] = {
    "company_name": "Display name used across the workspace.",
    "account_target_min": "Lower bound of Instagram accounts per employee before they are flagged as under-allocated.",
    "account_target_max": "Upper bound of Instagram accounts per employee before they are flagged as overloaded.",
    "leave_allowance_days": "Yearly leave allowance per leave type.",
    "require_mfa": "When on, Supabase sessions must be MFA-verified (aal2) or sign-in must use the email code step.",
    "session_ttl_minutes": "Lifetime of backend-issued sessions before re-login is required.",
    "token_expiry_warning_days": "Warn this many days before a Meta access token expires.",
    "alert_reassignments_per_hour": "Alert founders when one person reassigns more Instagram accounts than this within an hour.",
    "alert_copies_per_10_minutes": "Alert when one employee copies more protected fields than this within 10 minutes.",
    "community_features": "Show kudos and work anniversaries in the employee workspace.",
    "content_ideas": "Content idea of the day: one is shown on the dashboard each day, in order. One idea per line.",
}


def _int_range(lo: int, hi: int) -> Callable[[Any], Any]:
    def v(x):
        if isinstance(x, bool) or not isinstance(x, int) or not lo <= x <= hi:
            raise ValueError(f"must be an integer between {lo} and {hi}")
        return x
    return v


def _bool(x):
    if not isinstance(x, bool):
        raise ValueError("must be true or false")
    return x


def _str(maxlen: int):
    def v(x):
        if not isinstance(x, str) or not x.strip() or len(x) > maxlen:
            raise ValueError(f"must be a non-empty string up to {maxlen} chars")
        return x.strip()
    return v


def _leave(x):
    if not isinstance(x, dict):
        raise ValueError("must be an object of leave type -> days")
    out = {}
    for k, val in x.items():
        if k not in LEAVE_TYPES:
            raise ValueError(f"unknown leave type '{k}'")
        out[k] = _int_range(0, 365)(val)
    return {**DEFAULTS["leave_allowance_days"], **out}


def _ideas(x):
    if not isinstance(x, list):
        raise ValueError("must be a list of ideas")
    out = [i.strip() for i in x if isinstance(i, str) and i.strip()]
    if not 1 <= len(out) <= 200:
        raise ValueError("needs between 1 and 200 ideas")
    if any(len(i) > 280 for i in out):
        raise ValueError("each idea must be 280 characters or fewer")
    return out


VALIDATORS: Dict[str, Callable[[Any], Any]] = {
    "company_name": _str(120),
    "account_target_min": _int_range(0, 1000),
    "account_target_max": _int_range(1, 1000),
    "leave_allowance_days": _leave,
    "require_mfa": _bool,
    "session_ttl_minutes": _int_range(15, 60 * 24 * 7),
    "token_expiry_warning_days": _int_range(1, 60),
    "alert_reassignments_per_hour": _int_range(1, 10000),
    "alert_copies_per_10_minutes": _int_range(1, 10000),
    "community_features": _bool,
    "content_ideas": _ideas,
}


class OrgSettingsService:
    def __init__(self, db: Session):
        self.db = db

    def get(self, key: str) -> Any:
        row = self.db.get(OrgSetting, key)
        return row.value if row is not None and row.value is not None else DEFAULTS[key]

    def all(self) -> Dict[str, Any]:
        stored = {r.key: r.value for r in self.db.query(OrgSetting).all()}
        return {k: stored.get(k, d) if stored.get(k) is not None else d for k, d in DEFAULTS.items()}

    def describe(self) -> list:
        values = self.all()
        return [{"key": k, "value": values[k], "default": DEFAULTS[k], "description": DESCRIPTIONS[k]} for k in DEFAULTS]

    def update(self, changes: Dict[str, Any], actor) -> Dict[str, Any]:
        unknown = set(changes) - set(DEFAULTS)
        if unknown:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown settings: {', '.join(sorted(unknown))}")
        cleaned = {}
        for k, v in changes.items():
            try:
                cleaned[k] = VALIDATORS[k](v)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{k}: {e}")
        merged = {**self.all(), **cleaned}
        if merged["account_target_min"] > merged["account_target_max"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="account_target_min cannot exceed account_target_max")
        before = self.all()
        for k, v in cleaned.items():
            row = self.db.get(OrgSetting, k)
            if row is None:
                self.db.add(OrgSetting(key=k, value=v, updated_by=actor.id))
            else:
                row.value = v
                row.updated_by = actor.id
        self.db.commit()
        AuditRepository(self.db).log(
            action="org_settings_updated", entity_type="org_settings", actor_id=actor.id,
            metadata={"changes": {k: {"from": before.get(k), "to": v} for k, v in cleaned.items()}},
        )
        return self.all()
