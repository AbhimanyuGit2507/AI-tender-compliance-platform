# BidKaro — AI Tender Analysis & Bid Preparation Platform

BidKaro is an enterprise SaaS platform engineered for Indian public infrastructure and government procurement (GeM, CPPP, State PWDs, NHAI, DFCCIL). It combines deterministic procurement math engines with hybrid pgvector RAG, split-screen PDF clause citation, company vault evidence matching, and automated bid compilation.

---

## 🚀 Quick Start (Local Development)

To start the entire local development stack (**PostgreSQL with pgvector, Redis, FastAPI Backend, Celery Worker, and Vite Frontend**) with a single command:

```bash
./dev.sh
```

or using `npm`:

```bash
npm run dev:all
```

This single command will:
1. Ensure **PostgreSQL 16 (pgvector)** and **Redis 7** are running in Docker.
2. Initialize database schemas & enable `vector` and `pg_trgm` extensions.
3. Automatically seed demo tenant data (MJP Water Pipeline tender, company vault, audited turnover).
4. Launch the **FastAPI backend** with hot-reload on `http://localhost:8000`.
5. Launch the **Celery background worker** (for AI ingestion and document generation).
6. Launch the **Vite frontend dev server** with HMR on `http://localhost:5173`.
7. Intercept `Ctrl + C` to gracefully stop all background servers and release ports.

---

## 🛠️ CLI Development Commands

The `./dev.sh` orchestrator provides several convenient sub-commands:

```bash
# Check service health and listening ports
./dev.sh status
# or: npm run dev:status

# Stop all local development processes and containers
./dev.sh stop
# or: npm run dev:stop

# Re-seed the database with fresh demo data
./dev.sh seed

# Run the 100% containerized stack in Docker Compose
./dev.sh docker
# or: npm run dev:docker
```

---

## 🌐 Local Service URLs

| Service | URL | Notes |
|:---|:---|:---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Vite React SPA with split-screen Copilot |
| **Tender Discovery** | [http://localhost:5173/discovery](http://localhost:5173/discovery) | GeM / CPPP feed with pre-qualification match |
| **Company Vault** | [http://localhost:5173/vault](http://localhost:5173/vault) | Turnover, project experience, UDYAM certs |
| **FastAPI Backend** | [http://localhost:8000](http://localhost:8000) | Core REST & SSE status streaming |
| **Swagger Interactive Docs** | [http://localhost:8000/api/docs](http://localhost:8000/api/docs) | OpenAPI 3.0 specification |
| **ReDoc Documentation** | [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc) | Clean API reference |
| **PostgreSQL 16 (pgvector)** | `localhost:5432` | DB: `bidkaro` / User: `bidkaro` / Pass: `bidkaro` |
| **Redis 7** | `localhost:6379` | Celery broker & Redis Pub/Sub SSE |

---

## 🔑 Demo Account Credentials

- **Email:** `rajesh@apexinfra.in`
- **Password:** `ApexDemo2026!`
- **Company:** Apex Infra Projects Pvt. Ltd. (MSE UDYAM Registered, GFR 170 EMD Exempted)

---

## 🧪 Testing & Verification

Run the full backend integration test suite (39/39 passing):

```bash
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/ -v
```

Run frontend production build verification:

```bash
npm run build
```
