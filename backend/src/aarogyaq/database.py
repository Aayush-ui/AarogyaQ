"""
Single responsibility: database engine creation, session lifecycle management,
schema initialisation, and default-data seeding for the AarogyaQ SQLite DB.

Module-level constants ``engine`` and ``SessionLocal`` are created once at
import time.  No table queries happen until a caller explicitly invokes
``init_db()`` or ``seed_departments()``.
"""
from __future__ import annotations

from collections.abc import Generator
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from aarogyaq.models import Base, Department

# ── Connection constants ──────────────────────────────────────────────────────

DB_PATH: Path = Path(__file__).parent.parent.parent / "data" / "aarogyaq.db"
DATABASE_URL: str = f"sqlite:///{DB_PATH}"

# ── Module-level engine and session factory ───────────────────────────────────
# ``check_same_thread=False`` is required for SQLite when FastAPI serves
# requests from multiple threads / async workers.

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal: sessionmaker[Session] = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Default department list ───────────────────────────────────────────────────
# FINAL — change only via a DB design revision.

_DEFAULT_DEPARTMENTS: tuple[str, ...] = (
    "Emergency",
    "General OPD",
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Gynecology",
    "ENT",
)


# ── Public API ────────────────────────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yield one :class:`Session` per request.

    The session is **always** closed in the ``finally`` block, whether the
    request succeeds or raises an exception.

    Yields:
        An active :class:`sqlalchemy.orm.Session` bound to the SQLite engine.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Create all ORM-defined tables if they do not already exist.

    Safe to call multiple times — SQLAlchemy uses ``CREATE TABLE IF NOT EXISTS``
    semantics so existing tables are never dropped or altered.

    Also ensures the ``data/`` directory exists on the filesystem.
    """
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)


def seed_departments() -> None:
    """Insert the 8 default departments when the ``departments`` table is empty.

    Default departments (status ``"Available"`` for each):

    * Emergency
    * General OPD
    * Cardiology
    * Neurology
    * Orthopedics
    * Pediatrics
    * Gynecology
    * ENT

    **Idempotent**: if any department rows already exist the function returns
    immediately without inserting anything.  Callers may invoke this as many
    times as they like without creating duplicates.

    Raises:
        RuntimeError: if ``init_db()`` has not been called and the
            ``departments`` table does not yet exist.
    """
    db = SessionLocal()
    try:
        if db.query(Department).count() > 0:
            return  # already seeded — nothing to do
        now = datetime.utcnow()
        for name in _DEFAULT_DEPARTMENTS:
            db.add(Department(name=name, status="Available", updated_at=now))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
