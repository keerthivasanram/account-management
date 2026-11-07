import pytest
import uuid
from datetime import datetime, timedelta, timezone
from app.models.models import InstagramAccount

def test_documents_classification_and_access_control(client, seed_data):
    admin_token = "dev-token-admin"
    emp_token = "dev-token-employee-EMP-0002"

    # 1. Regular employee uploads INTERNAL document
    res_doc1 = client.post(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "title": "Brand Guidelines 2026",
            "category": "BRAND_ASSET",
            "classification": "INTERNAL",
            "file_url": "https://s3.amazonaws.com/internal-docs/brand-guidelines.pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 2048576
        }
    )
    assert res_doc1.status_code == 201
    doc1_id = res_doc1.json()["id"]

    # 2. Regular employee tries to upload RESTRICTED document -> should be rejected (403)
    res_bad = client.post(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "title": "Confidential Executive Compensation",
            "category": "FINANCIAL",
            "classification": "RESTRICTED",
            "file_url": "https://s3.amazonaws.com/internal-docs/salaries.pdf"
        }
    )
    assert res_bad.status_code == 403

    # 3. Admin uploads RESTRICTED document
    res_admin_doc = client.post(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Executive Board Strategy 2026",
            "category": "POLICY",
            "classification": "RESTRICTED",
            "file_url": "https://s3.amazonaws.com/internal-docs/board-strategy.pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 1048576
        }
    )
    assert res_admin_doc.status_code == 201
    restricted_id = res_admin_doc.json()["id"]

    # 4. Regular employee cannot access RESTRICTED document
    res_forbidden = client.get(
        f"/api/v1/documents/{restricted_id}",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert res_forbidden.status_code == 403

    # 5. Admin accesses and downloads RESTRICTED document
    res_view = client.get(
        f"/api/v1/documents/{restricted_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_view.status_code == 200

    res_download = client.post(
        f"/api/v1/documents/{restricted_id}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_download.status_code == 200
    assert res_download.json()["status"] == "download_logged"

def test_social_post_publishing_pipeline(client, seed_data, db_session):
    admin_token = "dev-token-admin"
    emp_token = "dev-token-employee-EMP-0002"

    # Seed an Instagram account
    account = InstagramAccount(
        id=uuid.uuid4(),
        username="klarves_fashion",
        username_normalized="klarves_fashion",
        display_name="Klarves Fashion",
        profile_url="https://instagram.com/klarves_fashion",
        account_created_date=datetime.now().date(),
        registered_by=seed_data["employee"].id,
        status="approved"
    )
    db_session.add(account)
    db_session.commit()

    # 1. Staff creates scheduled post
    scheduled_time = datetime.now(timezone.utc) + timedelta(days=1)
    res_post = client.post(
        "/api/v1/social/posts",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "account_id": str(account.id),
            "caption": "Step into autumn elegance with our newest collection drop. #AutumnVibes #Klarves",
            "media_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
            "media_type": "IMAGE",
            "scheduled_at": scheduled_time.isoformat()
        }
    )
    assert res_post.status_code == 201
    post_id = res_post.json()["id"]
    assert res_post.json()["status"] == "PENDING_APPROVAL"

    # 2. Admin reviews and approves scheduled post
    res_approve = client.patch(
        f"/api/v1/social/posts/{post_id}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "status": "APPROVED",
            "remarks": "Creative approved for Q4 release."
        }
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "APPROVED"

    # 3. Admin triggers immediate publish
    res_pub = client.post(
        f"/api/v1/social/posts/{post_id}/publish-now",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_pub.status_code == 200
    published_data = res_pub.json()
    assert published_data["status"] == "PUBLISHED"
    assert published_data["published_at"] is not None
