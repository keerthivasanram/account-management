"""Import accounts from CSV: preview first, then add only valid rows, same rules as Add account."""
import uuid

from app.models.models import AccountAssignment, Client, InstagramAccount

from tests.test_rbac_lifecycle import login, org  # noqa: F401  (fixture re-export)


def upload(client, headers, text, dry_run=True):
    return client.post(f"/api/v1/accounts/import?dry_run={'true' if dry_run else 'false'}",
                       files={"file": ("accounts.csv", text.encode("utf-8"), "text/csv")}, headers=headers)


CSV = (
    "username,account_type,niche,client\n"
    "@northstudio,BUSINESS,Home,North Studio\n"
    "clayandco,CREATOR,,\n"
    "northstudio,BUSINESS,,\n"          # duplicate inside the file
    "bad user!,BUSINESS,,\n"            # invalid username
    "personalone,PERSONAL,,\n"          # personal accounts are not eligible
    "ghostbrand,BUSINESS,,No Such Client\n"
    ",,,\n"                             # blank line is ignored
)


def test_template_downloads(client, org):
    r = client.get("/api/v1/accounts/import/template", headers=login(client, "employee1@company.internal"))
    assert r.status_code == 200 and r.text.startswith("username,")


def test_preview_writes_nothing_and_classifies_rows(client, org, db_session):
    db_session.add(Client(id=uuid.uuid4(), name="North Studio"))
    db_session.commit()
    r = upload(client, login(client, "employee1@company.internal"), CSV)
    assert r.status_code == 200, r.text
    body = r.json()
    by_line = {row["line"]: row for row in body["rows"]}
    assert by_line[2]["status"] == "valid" and by_line[2]["username"] == "northstudio"
    assert by_line[3]["status"] == "valid"
    assert by_line[4]["status"] == "duplicate"
    assert by_line[5]["status"] == "error"
    assert by_line[6]["status"] == "error" and "Personal" in by_line[6]["message"]
    assert by_line[7]["status"] == "error" and "No Such Client" in by_line[7]["message"]
    assert (body["total"], body["valid"], body["duplicates"], body["errors"], body["created"]) == (6, 2, 1, 3, 0)
    assert db_session.query(InstagramAccount).count() == 0


def test_import_adds_valid_rows_assigned_to_importer(client, org, db_session):
    sarah = login(client, "employee1@company.internal")
    r = upload(client, sarah, "username\nalpha_one\nbeta.two\n", dry_run=False)
    assert r.status_code == 200 and r.json()["created"] == 2
    accts = db_session.query(InstagramAccount).all()
    assert {a.username for a in accts} == {"alpha_one", "beta.two"}
    assert all(a.registered_by == org["employee"].id for a in accts)
    assert db_session.query(AccountAssignment).filter_by(employee_id=org["employee"].id).count() == 2
    # importing again reports them as already registered
    again = upload(client, sarah, "username\nalpha_one\n").json()
    assert again["rows"][0]["status"] == "duplicate"


def test_rejects_wrong_columns_and_oversize(client, org):
    sarah = login(client, "employee1@company.internal")
    r = upload(client, sarah, "handle,type\nx,y\n")
    assert r.status_code == 400 and "username" in r.json()["detail"]
    big = "username\n" + "\n".join(f"user{i}" for i in range(501))
    assert upload(client, sarah, big).status_code == 400
