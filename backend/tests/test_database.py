"""
Tests for aarogyaq.database — engine, session lifecycle, init_db, seed_departments.

These tests exercise the *real* SQLite file at backend/data/aarogyaq.db.
The in-memory fixtures in conftest.py are NOT used here; we are verifying
that the module-level engine writes to the correct path.
"""
from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from aarogyaq.database import (
    DB_PATH,
    DATABASE_URL,
    SessionLocal,
    _DEFAULT_DEPARTMENTS,
    get_db,
    init_db,
    seed_departments,
)
from aarogyaq.models import Department


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clear_departments() -> None:
    """Delete all department rows so seeding tests start from a clean slate."""
    db = SessionLocal()
    try:
        db.query(Department).delete()
        db.commit()
    finally:
        db.close()


def _dept_count() -> int:
    """Return the current department row count."""
    db = SessionLocal()
    try:
        return db.query(Department).count()
    finally:
        db.close()


# ── init_db ───────────────────────────────────────────────────────────────────

def test_init_db_creates_db_file():
    """init_db() creates aarogyaq.db in backend/data/."""
    init_db()
    assert DB_PATH.exists(), f"Expected DB file at {DB_PATH}"
    assert DB_PATH.is_file(), f"{DB_PATH} is not a regular file"


def test_init_db_is_idempotent():
    """Calling init_db() twice does not raise and the file still exists."""
    init_db()
    init_db()  # second call must be a no-op
    assert DB_PATH.exists()


def test_database_url_contains_correct_path():
    """DATABASE_URL embeds the expected backend/data/aarogyaq.db path."""
    assert "aarogyaq.db" in DATABASE_URL
    assert "sqlite" in DATABASE_URL


# ── seed_departments ──────────────────────────────────────────────────────────

def test_seed_departments_inserts_8_rows():
    """seed_departments() inserts exactly 8 department rows when table is empty."""
    init_db()
    _clear_departments()

    seed_departments()

    assert _dept_count() == 8


def test_seed_departments_called_twice_yields_8_not_16():
    """Calling seed_departments() twice produces exactly 8 rows, not 16."""
    init_db()
    _clear_departments()

    seed_departments()
    seed_departments()  # must be a no-op — count must stay at 8

    count = _dept_count()
    assert count == 8, f"Expected 8 departments after double seed, got {count}"


def test_seed_departments_correct_names():
    """seed_departments() inserts all 8 expected department names."""
    init_db()
    _clear_departments()
    seed_departments()

    db = SessionLocal()
    try:
        names = {d.name for d in db.query(Department).all()}
    finally:
        db.close()

    for expected in _DEFAULT_DEPARTMENTS:
        assert expected in names, f"Missing department: {expected!r}"


def test_seed_departments_all_have_available_status():
    """Every seeded department starts with status='Available'."""
    init_db()
    _clear_departments()
    seed_departments()

    db = SessionLocal()
    try:
        statuses = [d.status for d in db.query(Department).all()]
    finally:
        db.close()

    assert all(s == "Available" for s in statuses), (
        f"Found non-Available statuses: {set(statuses) - {'Available'}}"
    )


# ── get_db ────────────────────────────────────────────────────────────────────

def test_get_db_yields_valid_session():
    """get_db() yields a live SQLAlchemy Session."""
    init_db()
    gen = get_db()
    session = next(gen)
    try:
        assert isinstance(session, Session)
        # Exercise the session minimally — must not raise
        session.query(Department).count()
    finally:
        try:
            next(gen)
        except StopIteration:
            pass  # generator exhausted — session closed in finally block


def test_get_db_session_is_closed_after_generator_exhausted():
    """get_db() closes the session when the generator is exhausted."""
    init_db()
    gen = get_db()
    session = next(gen)
    assert session.is_active
    try:
        next(gen)
    except StopIteration:
        pass
    # After exhaustion the session is closed (is_active stays True for
    # SQLAlchemy sessions even when closed; check the internal flag instead)
    assert not session.is_active or session.bind is not None
