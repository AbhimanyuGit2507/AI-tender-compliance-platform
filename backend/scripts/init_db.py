"""
BidKaro — Database Initialization Script
Creates all 14 tables and enables PostgreSQL extensions (vector, pg_trgm).
Run: PYTHONPATH=backend backend/.venv/bin/python3 backend/scripts/init_db.py
"""
import asyncio
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import Base, get_engine
from app.models import *  # Import all 14 models so Base.metadata knows about them


async def init_db():
    print("Connecting to database...")
    engine = get_engine()

    async with engine.begin() as conn:
        print("Ensuring PostgreSQL extensions (vector, pg_trgm)...")
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
            print("Extensions verified successfully.")
        except Exception as e:
            print(f"Warning: Could not create extensions (may require superuser or running outside Postgres): {e}")

        print("Creating all 14 BidKaro tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("All tables created successfully!")


if __name__ == "__main__":
    asyncio.run(init_db())
