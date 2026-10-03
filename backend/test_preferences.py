import time
from fastapi.testclient import TestClient
from main import app

def test_platform_preferences_flow():
    with TestClient(app) as client:
        suffix = str(int(time.time()))
        # 1. Register and Login User A
        email_a = f"user_a_{suffix}@example.com"
        pwd = "password123"
        reg_a = client.post("/auth/register", json={"name": "User A", "email": email_a, "password": pwd})
        assert reg_a.status_code == 201, f"Register A failed: {reg_a.text}"
        
        res_a = client.post("/auth/login", json={"email": email_a, "password": pwd})
        assert res_a.status_code == 200, f"Login A failed: {res_a.text}"
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. GET initial preferences for User A (Should be default)
        res_pref_a = client.get("/preferences/platforms", headers=headers_a)
        assert res_pref_a.status_code == 200, f"GET preferences A failed: {res_pref_a.text}"
        data_a = res_pref_a.json()
        assert set(data_a["enabled_platforms"]) == {"whatsapp", "telegram", "discord"}, f"Unexpected defaults A: {data_a}"

        # 3. Update User A preferences to WhatsApp + Instagram
        res_put_a = client.put("/preferences/platforms", json={"enabled_platforms": ["whatsapp", "instagram"]}, headers=headers_a)
        assert res_put_a.status_code == 200, f"PUT preferences A failed: {res_put_a.text}"
        assert set(res_put_a.json()["enabled_platforms"]) == {"whatsapp", "instagram"}

        # 4. Verify GET returns updated User A preferences
        res_get_a2 = client.get("/preferences/platforms", headers=headers_a)
        assert res_get_a2.status_code == 200
        assert set(res_get_a2.json()["enabled_platforms"]) == {"whatsapp", "instagram"}

        # 5. Register and Login User B
        email_b = f"user_b_{suffix}@example.com"
        reg_b = client.post("/auth/register", json={"name": "User B", "email": email_b, "password": pwd})
        assert reg_b.status_code == 201, f"Register B failed: {reg_b.text}"
        
        res_b = client.post("/auth/login", json={"email": email_b, "password": pwd})
        assert res_b.status_code == 200, f"Login B failed: {res_b.text}"
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 6. GET initial preferences for User B -> verify isolation (defaults for User B)
        res_pref_b = client.get("/preferences/platforms", headers=headers_b)
        assert res_pref_b.status_code == 200
        assert set(res_pref_b.json()["enabled_platforms"]) == {"whatsapp", "telegram", "discord"}

        # 7. Update User B preferences
        res_put_b = client.put("/preferences/platforms", json={"enabled_platforms": ["facebook", "discord"]}, headers=headers_b)
        assert res_put_b.status_code == 200
        assert set(res_put_b.json()["enabled_platforms"]) == {"facebook", "discord"}

        # 8. Re-verify User A preferences remain unchanged
        res_get_a3 = client.get("/preferences/platforms", headers=headers_a)
        assert res_get_a3.status_code == 200
        assert set(res_get_a3.json()["enabled_platforms"]) == {"whatsapp", "instagram"}

        # 9. Test rejection of unsupported platform (e.g. youtube)
        res_invalid = client.put("/preferences/platforms", json={"enabled_platforms": ["whatsapp", "youtube"]}, headers=headers_a)
        assert res_invalid.status_code == 422 # Validation error

        print("\nALL PLATFORM PREFERENCES TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_platform_preferences_flow()
