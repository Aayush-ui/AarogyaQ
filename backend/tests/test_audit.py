"""Tests for aarogyaq.audit — audit log writing and retrieval."""
from __future__ import annotations

import pytest

from aarogyaq.audit import get_audit_trail, log_event
from aarogyaq.models import AuditLog


def test_log_event_persists_entry_valid_case(test_db):
    """log_event persists an AuditLog row and returns the ORM instance."""
    entry = log_event(test_db, actor="system", action="TEST", visit_id=1, notes="Testing")
    assert entry.actor == "system"
    assert entry.action == "TEST"
    assert entry.visit_id == 1
    assert entry.notes == "Testing"
    assert test_db.query(AuditLog).count() == 1


def test_log_event_empty_actor_invalid_case(test_db):
    """log_event raises ValueError when actor is an empty string."""
    with pytest.raises(ValueError, match="actor cannot be empty"):
        log_event(test_db, actor="", action="TEST")
    with pytest.raises(ValueError, match="action cannot be empty"):
        log_event(test_db, actor="system", action="")


def test_get_audit_trail_empty_visit_edge(test_db):
    """get_audit_trail returns an empty list for a visit with no log entries."""
    trail = get_audit_trail(test_db, 999)
    assert trail == []
    
    # insert an entry and test retrieving it
    log_event(test_db, actor="nurse", action="REGISTERED", visit_id=1)
    trail2 = get_audit_trail(test_db, 1)
    assert len(trail2) == 1
    assert trail2[0].action == "REGISTERED"
