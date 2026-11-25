"""Bulk "Import accounts" from CSV.

Every row goes through the same rules as the single "Add account" form (AccountCreate
validation + AccountService.register_account), so an import can never create something the
form would refuse. A dry run returns the per-row preview without writing anything; the real
run creates only the valid rows and reports the rest.
"""
import csv
import io
from datetime import date
from typing import Dict, List, Optional

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Campaign, Client, Employee
from app.schemas.account import AccountCreate
from app.services.account_service import AccountService

TEMPLATE_COLUMNS = ["username", "account_type", "niche", "client", "campaign", "display_name"]
REQUIRED = {"username"}
MAX_ROWS = 500

TEMPLATE_CSV = (
    ",".join(TEMPLATE_COLUMNS) + "\n"
    "northstudio,BUSINESS,Home decor,North Studio,Winter launch,North Studio\n"
    "clayandco,CREATOR,Ceramics,,,\n"
)


def _first_error(exc: ValidationError) -> str:
    err = exc.errors()[0]
    msg = str(err.get("msg", "Invalid value"))
    return msg.removeprefix("Value error, ")


class AccountImportService:
    def __init__(self, db: Session):
        self.db = db
        self.accounts = AccountService(db)

    # ------------------------------------------------------------------ lookups

    def _client(self, name: str) -> Optional[Client]:
        return self.db.query(Client).filter(func.lower(Client.name) == name.lower()).first()

    def _campaign(self, name: str, client: Optional[Client]) -> Optional[Campaign]:
        q = self.db.query(Campaign).filter(func.lower(Campaign.name) == name.lower())
        if client is not None:
            q = q.filter(Campaign.client_id == client.id)
        return q.first()

    # ------------------------------------------------------------------ parsing

    def _parse(self, content: str) -> List[Dict]:
        reader = csv.DictReader(io.StringIO(content.lstrip("﻿")))
        headers = [h.strip().lower() for h in (reader.fieldnames or [])]
        missing = REQUIRED - set(headers)
        if missing:
            raise HTTPException(status_code=400, detail=(
                f"The file needs a '{', '.join(sorted(missing))}' column. "
                f"Download the template to see the expected columns: {', '.join(TEMPLATE_COLUMNS)}."))
        rows = []
        for line_no, raw in enumerate(reader, start=2):
            row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items() if k}
            if not any(row.values()):
                continue  # blank line
            rows.append({"line": line_no, **row})
        if len(rows) > MAX_ROWS:
            raise HTTPException(status_code=400, detail=f"Import up to {MAX_ROWS} accounts at a time; split the file.")
        return rows

    def _check_row(self, row: Dict, seen: set) -> Dict:
        username = row.get("username", "").lstrip("@")
        result = {"line": row["line"], "username": username, "status": "valid", "message": None, "payload": None}
        if not username:
            return {**result, "status": "error", "message": "Username is empty."}
        key = username.lower()
        if key in seen:
            return {**result, "status": "duplicate", "message": "Appears more than once in this file."}
        seen.add(key)

        client = campaign = None
        if row.get("client"):
            client = self._client(row["client"])
            if not client:
                return {**result, "status": "error", "message": f"No client named '{row['client']}'."}
        if row.get("campaign"):
            campaign = self._campaign(row["campaign"], client)
            if not campaign:
                where = f" for client '{client.name}'" if client else ""
                return {**result, "status": "error", "message": f"No campaign named '{row['campaign']}'{where}."}

        try:
            payload = AccountCreate(
                username=username,
                profile_url=f"https://www.instagram.com/{username}/",
                display_name=row.get("display_name") or username,
                account_created_date=date.today(),
                account_type=(row.get("account_type") or "BUSINESS"),
                niche=row.get("niche") or None,
                client_id=client.id if client else None,
                campaign_id=campaign.id if campaign else None,
            )
        except ValidationError as exc:
            return {**result, "status": "error", "message": _first_error(exc)}

        if self.accounts.check_duplicate(payload.username).is_duplicate:
            return {**result, "status": "duplicate", "message": "Already registered in Klarves."}
        return {**result, "payload": payload}

    # ------------------------------------------------------------------ public

    def run(self, content: str, employee: Employee, dry_run: bool) -> Dict:
        rows = self._parse(content)
        if not rows:
            raise HTTPException(status_code=400, detail="The file has no account rows.")
        seen: set = set()
        results = [self._check_row(r, seen) for r in rows]

        created = 0
        if not dry_run:
            for r in results:
                if r["status"] != "valid":
                    continue
                try:
                    self.accounts.register_account(r["payload"], employee)
                    r["status"] = "created"
                    created += 1
                except HTTPException as exc:
                    r["status"] = "duplicate" if exc.status_code == 409 else "error"
                    r["message"] = exc.detail if isinstance(exc.detail, str) else "Could not be added."

        for r in results:
            r.pop("payload", None)
        count = lambda s: sum(1 for r in results if r["status"] == s)
        return {
            "dry_run": dry_run,
            "total": len(results),
            "valid": count("valid") + created,
            "created": created,
            "duplicates": count("duplicate"),
            "errors": count("error"),
            "rows": results,
        }
