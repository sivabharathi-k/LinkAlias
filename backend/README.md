# LinkAlias Backend API (FastAPI + MongoDB)

REST API service for LinkAlias browser extension alias management.

---

## 📁 Backend Directory Structure

```text
backend/
│
├── main.py                # FastAPI application entry point, CORS & lifecycle hooks
├── .env                   # Environment variable configuration (Ignored by Git)
├── .env.example           # Configuration template file
├── .gitignore             # Git ignore rules for environment & Python cache
├── requirements.txt       # Python dependencies list
├── test_api.py            # Automated API integration test suite
│
├── database/
│   ├── __init__.py
│   └── connection.py      # AsyncIOMotorClient connection lifecycle
│
├── models/
│   ├── __init__.py
│   └── alias.py           # MongoDB document helper models
│
├── schemas/
│   ├── __init__.py
│   └── alias.py           # Pydantic request validation & response schemas
│
└── routes/
    ├── __init__.py
    └── alias_routes.py    # CRUD REST API endpoints (/aliases)
```

---

## 🚀 Environment Setup & Running the Server

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `.env` contains your MongoDB connection details:
```ini
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=linkalias
HOST=127.0.0.1
PORT=8000
```

### 3. Start the FastAPI Server
Run Uvicorn server:
```bash
uvicorn main:app --reload
```
The server will start at: `http://127.0.0.1:8000`

---

## 📖 Swagger Documentation & Verification

FastAPI automatically generates interactive Swagger API documentation at:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Request Body / Query | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | API Root Health Check | None | 200 OK |
| `GET` | `/health` | Database Connection Status | None | 200 OK |
| `POST` | `/aliases` | Create Alias Record | `{"url": "...", "alias": "..."}` | 201 Created, 400 Duplicate, 500 Error |
| `GET` | `/aliases` | List All Stored Aliases | None | 200 OK |
| `GET` | `/aliases/by-url` | Lookup Alias by Target URL | `?url=https://google.com` | 200 OK, 404 Not Found |
| `PUT` | `/aliases` | Update Alias Record | `{"url": "...", "alias": "..."}` | 200 OK, 404 Not Found |
| `DELETE` | `/aliases` | Delete Alias Record | `{"url": "..."}` | 200 OK, 404 Not Found |

---

## 🧪 Running Automated Tests

Run the backend integration test suite:
```bash
python test_api.py
```
