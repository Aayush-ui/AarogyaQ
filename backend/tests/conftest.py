"""
Shared pytest fixtures for the AarogyaQ test suite.

Provides an in-memory SQLite engine and a transactional session that is
rolled back after each test function, ensuring full test isolation.
"""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from aarogyaq.models import Base


@pytest.fixture(scope="function")
def test_engine():
    """Create a fresh in-memory SQLite engine with all ORM tables.

    Yields:
        A SQLAlchemy Engine backed by ``sqlite:///:memory:``.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(scope="function")
def test_db(test_engine) -> Session:  # type: ignore[type-arg]
    """Yield an isolated SQLAlchemy Session; roll back after each test.

    Args:
        test_engine: Fixture providing the in-memory engine.

    Yields:
        An active, isolated :class:`Session`.
    """
    factory = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    session = factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
