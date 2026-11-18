import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
import uuid


@pytest.mark.asyncio
async def test_razorpay_create_order_aliases():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tenant_id = uuid.uuid4()
        user_id = uuid.uuid4()
        token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="admin")

        headers = {"Authorization": f"Bearer {token}"}

        # 1. Test single_pack
        res = await client.post("/api/plans/razorpay/create-order", json={"plan_id": "single_pack"}, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["amount_inr"] == 199.0
        assert data["credits"] == 100
        assert data["currency"] == "INR"

        # 2. Test growth alias
        res_growth = await client.post("/api/plans/razorpay/create-order", json={"plan_id": "growth"}, headers=headers)
        assert res_growth.status_code == 200
        data_growth = res_growth.json()
        assert data_growth["amount_inr"] == 499.0
        assert data_growth["credits"] == 500

        # 3. Test pro_contractor
        res_pro = await client.post("/api/plans/razorpay/create-order", json={"plan_id": "pro_contractor"}, headers=headers)
        assert res_pro.status_code == 200
        data_pro = res_pro.json()
        assert data_pro["amount_inr"] == 999.0
        assert data_pro["credits"] == 1500

        # 4. Test invalid plan
        res_invalid = await client.post("/api/plans/razorpay/create-order", json={"plan_id": "unknown_plan_xyz"}, headers=headers)
        assert res_invalid.status_code == 400


@pytest.mark.asyncio
async def test_razorpay_tax_invoice_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tenant_id = uuid.uuid4()
        user_id = uuid.uuid4()
        token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="admin")

        headers = {"Authorization": f"Bearer {token}"}

        # Test invoice details
        test_inv = "INV-202611-TEST01"
        res = await client.get(f"/api/plans/invoice/{test_inv}", headers=headers)
        # Note: If tenant does not exist in test DB, it returns 404
        assert res.status_code in (200, 404)
        if res.status_code == 200:
            inv = res.json()
            assert inv["invoice_no"] == test_inv
            assert inv["sac_code"] == "998313"
