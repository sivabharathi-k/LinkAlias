# LinkAlias Control Panel — Web Application

LinkAlias Web Application is a standalone dashboard for managing custom link aliases, user profiles, and website preferences.

**Key Architecture Rule:** The Web App operates completely separate from the browser extension (`LinkAlias-extension/`). It does **NOT** inject dashboard UI into target webpages. Both the Web App and Extension communicate with the central FastAPI backend (`http://127.0.0.1:8000`).

---

## 📁 Project Structure

```text
web-app/
├── index.html           # HTML entry point with Plus Jakarta Sans font
├── package.json         # React 18, React Router v6, Lucide icons, Vite
├── vite.config.js       # Vite server configuration
├── src/
│   ├── api/
│   │   └── api.js       # Centralized REST API service layer (http://127.0.0.1:8000)
│   ├── components/
│   │   ├── Sidebar.jsx  # Control Panel navigation sidebar
│   │   ├── StatCard.jsx # Stat metrics card
│   │   ├── AliasModal.jsx # Create/Edit Alias modal dialog
│   │   └── ProtectedRoute.jsx # Route guard for JWT authentication
│   ├── pages/
│   │   ├── LoginPage.jsx     # Welcome Back login view
│   │   ├── RegisterPage.jsx  # User registration view
│   │   ├── DashboardPage.jsx # Overview dashboard with stat cards & recent aliases
│   │   ├── AliasesPage.jsx   # Dedicated "My Aliases" page with search filter
│   │   ├── WebsitesPage.jsx  # Supported Websites preferences UI (WhatsApp active)
│   │   └── ProfilePage.jsx   # User profile details and sign-out button
│   ├── styles/
│   │   └── index.css    # Modern design system (glassmorphism, typography, colors)
│   ├── App.jsx          # Client-side router & auth state provider
│   └── main.jsx         # React application entry point
└── README.md            # Web App documentation
```

---

## 🚀 Running the Web Application

### 1. Install Dependencies
```bash
cd web-app
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will open at: `http://localhost:5173`

---

## 🔌 API Service Layer (`src/api/api.js`)

Centralized service communicating with the FastAPI backend (`http://127.0.0.1:8000`):

- `api.register(name, email, password)` $\rightarrow$ `POST /auth/register`
- `api.login(email, password)` $\rightarrow$ `POST /auth/login`
- `api.getMe()` $\rightarrow$ `GET /auth/me`
- `api.getAliases()` $\rightarrow$ `GET /aliases`
- `api.createAlias(url, alias)` $\rightarrow$ `POST /aliases`
- `api.updateAlias(url, alias)` $\rightarrow$ `PUT /aliases`
- `api.deleteAlias(url)` $\rightarrow$ `DELETE /aliases`

---

## 🧪 Testing Checklist

1. **Start Backend Server:** Ensure FastAPI backend is running on `http://127.0.0.1:8000`.
2. **Start Web App:** Run `npm run dev` inside `web-app/`. Open `http://localhost:5173`.
3. **Register:** Create a new user account at `http://localhost:5173/register`.
4. **Login:** Login with credentials. Verify redirect to `/` (Dashboard).
5. **Dashboard:** Verify welcome banner, Total Aliases count, Active Websites count, and Recent Aliases table.
6. **My Aliases:** Navigate to `/aliases`. Test searching aliases, adding a new alias via modal, editing an alias, and deleting an alias.
7. **Website Preferences:** Navigate to `/websites`. Verify WhatsApp Web is active by default.
8. **Profile:** Navigate to `/profile`. Verify Name, Email, and Member Since date.
9. **Sign Out:** Click **Sign Out**. Verify token removal and redirect to `/login`. Protected routes cannot be accessed without logging in.
