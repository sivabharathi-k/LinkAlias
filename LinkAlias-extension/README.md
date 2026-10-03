# LinkAlias Browser Extension — Phase 8: Extension Authentication UI & JWT Integration

LinkAlias allows authenticated users to assign, edit, and delete custom aliases for hyperlinks on enabled websites.

**Phase 8 Focus:** Connecting the browser extension UI to the FastAPI JWT authentication system.
- Web dashboard and website selection UI remain **NOT** implemented in Phase 8.

---

## 🏗️ Architecture Overview

```text
User visits WhatsApp Web
          │
  Content Script (content.js)
          │
  Check chrome.storage.local for access_token
          │
  ┌───────┴───────┐
  ▼               ▼
[Token Present] [Token Missing]
  │               │
GET /auth/me    Show Auth Badge: 🔐 Login
  │               │
Validated       User clicks Login or ✏️
  │               │
Load Aliases    Open Auth Modal (Login / Register)
(GET /aliases)    │
  │             POST /auth/login -> Receive JWT
  │               │
  └───────────────┴── Store access_token in chrome.storage.local
```

---

## 📁 Project Structure

```text
LinkAlias/
├── LinkAlias-extension/
│   ├── manifest.json   # Extension manifest V3 (declares "storage" permission)
│   ├── config.js       # Centralized API_BASE_URL ("http://127.0.0.1:8000") & enabled sites
│   ├── content.js      # Auth UI (Login/Register views), JWT storage, Bearer headers, Logout handler
│   ├── styles.css      # Isolated styles for Auth Badge, Auth Modal, inputs, buttons & popups
│   └── README.md       # Extension documentation and testing guide
│
└── backend/
    ├── main.py                # FastAPI entry point & CORS configuration
    ├── database/connection.py # AsyncIOMotorClient connection
    ├── models/                # User & Alias document models
    ├── schemas/               # User & Alias Pydantic validation schemas
    ├── utils/auth.py          # Bcrypt hashing & JWT validation
    └── routes/                # Auth & Alias REST API routes
```

---

## 🔑 Authentication Features

1. **Top-Right Auth Badge:**
   - **Authenticated:** Displays `🔗 LinkAlias | 👤 Sivabharathi [Logout]`.
   - **Unauthenticated:** Displays `🔗 LinkAlias | 🔐 Login / Register`.
2. **Login & Registration Views:**
   - **Login View:** Email, Password, `Login` button, toggle link to Register.
   - **Register View:** Full Name, Email, Password, `Register` button, toggle link to Login.
3. **JWT Token Persistence (`chrome.storage.local`):**
   - On successful login, the access token is saved under key `access_token`.
   - On every alias API call, header `Authorization: Bearer <access_token>` is attached.
4. **Logout Handler:**
   - Removes `access_token` from `chrome.storage.local`.
   - Clears session user info and in-memory `cachedAliases`.
   - Reverts any visible custom alias text on the DOM back to original text.
5. **Unauthorized (401) Interceptor:**
   - If any API call returns `401 Unauthorized`, the extension removes the invalid token and prompts the Login modal without crashing the webpage.

---

## 🧪 Testing Checklist (All 10 Test Scenarios)

### Step 1: Start Backend Server
```bash
cd backend
uvicorn main:app --reload
```

### Step 2: Reload Extension
Open `chrome://extensions/` or `edge://extensions/` and click **Reload (🔄)** on LinkAlias card.

---

### Test Scenarios:

#### TEST 1 — REGISTER
- Open WhatsApp Web or `test.html`.
- Click `🔐 Login / Register` in the top right. Click **Register**.
- Enter Name: `User A`, Email: `userA@example.com`, Password: `password123`. Click **Register**.
- **Expected:** Registration succeeds, token is stored, badge displays `👤 User A [Logout]`.

#### TEST 2 — LOGIN
- Click **Logout**.
- Click `🔐 Login / Register`.
- Enter Email: `userA@example.com`, Password: `password123`. Click **Login**.
- **Expected:** Login succeeds, JWT stored in `chrome.storage.local`.

#### TEST 3 — CURRENT USER (`GET /auth/me`)
- Verify badge displays `👤 User A`. In DevTools console, verify `[LinkAlias] Authenticated as User A (userA@example.com)`.

#### TEST 4 — CREATE ALIAS (USER A)
- Click `✏️` next to `Google Search`. Type `My Google` and click **Save**.
- **Expected:** Request `POST /aliases` with `Authorization: Bearer <token>` succeeds. Text changes to `My Google ✏️`.

#### TEST 5 — LOGOUT
- Click **Logout**.
- **Expected:** `access_token` removed from `chrome.storage.local`. Webpage text reverts to `Google Search ✏️`. Badge displays `🔐 Login / Register`.

#### TEST 6 — LOGIN AS USER B
- Register/Login as `userB@example.com`.
- **Expected:** User B does **NOT** see User A's alias (`Google Search` remains original).

#### TEST 7 — USER B CREATES ALIAS
- User B creates alias `Google Search -> Search Engine`.
- **Expected:** User B sees `Search Engine ✏️`. Logging out and returning as User A shows `My Google ✏️`. User isolation verified!

#### TEST 8 — PAGE REFRESH PERSISTENCE
- Refresh page (`F5`) while logged in.
- **Expected:** Valid JWT is read from `chrome.storage.local`. User remains logged in. Aliases load automatically.

#### TEST 9 — INVALID / EXPIRED TOKEN
- Open DevTools Console and clear token: `localStorage.clear(); chrome.storage.local.clear()`. Reload page.
- **Expected:** Login modal prompts smoothly without crashing page.

#### TEST 10 — BACKEND OFFLINE
- Stop Uvicorn server (`Ctrl+C`).
- Reload page.
- **Expected:** Extension logs `Backend unavailable` and fails gracefully without crashing page layout or breaking links.
