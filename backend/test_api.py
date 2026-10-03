"""
LinkAlias Phase 7 Authentication & User Isolation Integration Test Suite
Tests all 10 required test cases:
1. Register user (POST /auth/register) -> 201 Created
2. Duplicate register (POST /auth/register) -> 409 Conflict
3. Login user (POST /auth/login) -> 200 OK with access_token
4. Invalid login (POST /auth/login with wrong password) -> 401 Unauthorized
5. Get current user (GET /auth/me) -> 200 OK with user profile
6. Create authenticated alias (POST /aliases) -> 201 Created
7. Get user aliases (GET /aliases) -> 200 OK returning user's aliases
8. User isolation (User A & User B both create alias for google.com, verified completely isolated)
9. Unauthorized access (GET /aliases without token) -> 401 Unauthorized
10. Invalid token (GET /aliases with bad JWT) -> 401 Unauthorized
"""

import unittest
from fastapi.testclient import TestClient
from main import app
from database.connection import db_instance
from utils.auth import hash_password

class MockUsersCollection:
    def __init__(self):
        self.users = {} # email -> user_doc
        self.counter = 1

    async def find_one(self, filter_dict):
        if "email" in filter_dict:
            return self.users.get(filter_dict["email"])
        if "_id" in filter_dict or "id" in filter_dict:
            uid = str(filter_dict.get("_id") or filter_dict.get("id"))
            for doc in self.users.values():
                if str(doc.get("_id")) == uid or str(doc.get("id")) == uid:
                    return doc
        return None

    async def insert_one(self, doc):
        email = doc.get("email")
        uid = f"user_{self.counter}"
        self.counter += 1
        doc["_id"] = uid
        doc["id"] = uid
        self.users[email] = doc
        return True


class MockAliasesCollection:
    def __init__(self):
        self.docs = [] # list of alias docs

    async def find_one(self, filter_dict):
        user_id = filter_dict.get("user_id")
        url = filter_dict.get("url")
        for doc in self.docs:
            if doc.get("user_id") == user_id and doc.get("url") == url:
                return doc
        return None

    async def insert_one(self, doc):
        doc["_id"] = f"alias_{len(self.docs)+1}"
        self.docs.append(doc)
        return True

    def find(self, filter_dict):
        user_id = filter_dict.get("user_id")
        matched = [doc for doc in self.docs if doc.get("user_id") == user_id]

        class AsyncCursor:
            def __init__(self, docs_list):
                self.docs_list = docs_list
                self.index = 0

            def __aiter__(self):
                return self

            async def __anext__(self):
                if self.index < len(self.docs_list):
                    res = self.docs_list[self.index]
                    self.index += 1
                    return res
                raise StopAsyncIteration

        return AsyncCursor(matched)

    async def find_one_and_update(self, filter_dict, update_dict, return_document=True):
        user_id = filter_dict.get("user_id")
        url = filter_dict.get("url")
        for doc in self.docs:
            if doc.get("user_id") == user_id and doc.get("url") == url:
                if "$set" in update_dict:
                    for k, v in update_dict["$set"].items():
                        doc[k] = v
                return doc
        return None

    async def delete_one(self, filter_dict):
        user_id = filter_dict.get("user_id")
        url = filter_dict.get("url")
        class DeleteResult:
            def __init__(self, count):
                self.deleted_count = count

        for i, doc in enumerate(self.docs):
            if doc.get("user_id") == user_id and doc.get("url") == url:
                del self.docs[i]
                return DeleteResult(1)
        return DeleteResult(0)


class MockDatabase:
    def __init__(self):
        self.mock_users = MockUsersCollection()
        self.mock_aliases = MockAliasesCollection()

    def __getitem__(self, item):
        if item == "users":
            return self.mock_users
        elif item == "aliases":
            return self.mock_aliases
        return self.mock_aliases


class TestLinkAliasAuthAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        db_instance.db = MockDatabase()

    def test_full_auth_and_user_isolation(self):
        print("\n--- Starting Phase 7 Authentication & User Isolation Test Suite ---")

        # TEST 1: POST /auth/register
        reg_payload = {
            "name": "Sivabharathi",
            "email": "userA@example.com",
            "password": "password123"
        }
        res_reg = self.client.post("/auth/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 201)
        self.assertEqual(res_reg.json()["message"], "User registered successfully")
        print("[OK] TEST 1 PASSED: POST /auth/register created user account")

        # TEST 2: DUPLICATE REGISTER -> 409 Conflict
        res_dup = self.client.post("/auth/register", json=reg_payload)
        self.assertEqual(res_dup.status_code, 409)
        self.assertEqual(res_dup.json()["detail"], "Email already registered")
        print("[OK] TEST 2 PASSED: Duplicate registration returned 409 Conflict")

        # TEST 3: LOGIN -> 200 OK with access_token
        login_payload = {
            "email": "userA@example.com",
            "password": "password123"
        }
        res_login = self.client.post("/auth/login", json=login_payload)
        self.assertEqual(res_login.status_code, 200)
        token_data = res_login.json()
        self.assertIn("access_token", token_data)
        tokenA = token_data["access_token"]
        headersA = {"Authorization": f"Bearer {tokenA}"}
        print("[OK] TEST 3 PASSED: POST /auth/login returned JWT access_token")

        # TEST 4: INVALID LOGIN -> 401 Unauthorized
        res_bad_login = self.client.post("/auth/login", json={"email": "userA@example.com", "password": "wrongpassword"})
        self.assertEqual(res_bad_login.status_code, 401)
        print("[OK] TEST 4 PASSED: Invalid password returned 401 Unauthorized")

        # TEST 5: GET /auth/me -> 200 OK
        res_me = self.client.get("/auth/me", headers=headersA)
        self.assertEqual(res_me.status_code, 200)
        user_info = res_me.json()
        self.assertEqual(user_info["email"], "usera@example.com")
        self.assertEqual(user_info["name"], "Sivabharathi")
        self.assertNotIn("password", user_info)
        self.assertNotIn("password_hash", user_info)
        print("[OK] TEST 5 PASSED: GET /auth/me retrieved user info without password fields")

        # TEST 6: CREATE AUTHENTICATED ALIAS (User A)
        alias_payload = {"url": "https://google.com", "alias": "My Google"}
        res_aliasA = self.client.post("/aliases", json=alias_payload, headers=headersA)
        self.assertEqual(res_aliasA.status_code, 201)
        docA = res_aliasA.json()
        self.assertEqual(docA["alias"], "My Google")
        self.assertEqual(docA["user_id"], user_info["id"])
        print("[OK] TEST 6 PASSED: POST /aliases created alias assigned to User A")

        # TEST 7: GET USER ALIASES (User A)
        res_getA = self.client.get("/aliases", headers=headersA)
        self.assertEqual(res_getA.status_code, 200)
        listA = res_getA.json()
        self.assertEqual(len(listA), 1)
        self.assertEqual(listA[0]["alias"], "My Google")
        print("[OK] TEST 7 PASSED: GET /aliases returned User A's aliases")

        # TEST 8: USER ISOLATION (Register & Login User B)
        reg_payloadB = {"name": "User B", "email": "userB@example.com", "password": "password456"}
        self.client.post("/auth/register", json=reg_payloadB)
        res_loginB = self.client.post("/auth/login", json={"email": "userB@example.com", "password": "password456"})
        tokenB = res_loginB.json()["access_token"]
        headersB = {"Authorization": f"Bearer {tokenB}"}

        # User B creates alias for SAME URL (https://google.com)
        alias_payloadB = {"url": "https://google.com", "alias": "Search Engine"}
        res_aliasB = self.client.post("/aliases", json=alias_payloadB, headers=headersB)
        self.assertEqual(res_aliasB.status_code, 201)

        # Verify User A sees only "My Google"
        res_checkA = self.client.get("/aliases/by-url?url=https://google.com", headers=headersA)
        self.assertEqual(res_checkA.json()["alias"], "My Google")

        # Verify User B sees only "Search Engine"
        res_checkB = self.client.get("/aliases/by-url?url=https://google.com", headers=headersB)
        self.assertEqual(res_checkB.json()["alias"], "Search Engine")

        print("[OK] TEST 8 PASSED: User isolation verified! User A & User B have separate aliases for same URL")

        # TEST 9: UNAUTHORIZED ACCESS (No token -> 401)
        res_unauth = self.client.get("/aliases")
        self.assertEqual(res_unauth.status_code, 401)
        print("[OK] TEST 9 PASSED: Calling protected endpoint without token returned 401 Unauthorized")

        # TEST 10: INVALID TOKEN -> 401
        res_bad_token = self.client.get("/aliases", headers={"Authorization": "Bearer invalid_token_xyz"})
        self.assertEqual(res_bad_token.status_code, 401)
        print("[OK] TEST 10 PASSED: Calling protected endpoint with invalid token returned 401 Unauthorized")

        print("\nALL 10 PHASE 7 AUTHENTICATION & ISOLATION TESTS PASSED!\n")

if __name__ == "__main__":
    unittest.main()
