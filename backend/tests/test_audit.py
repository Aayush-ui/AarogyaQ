import pytest
from aarogyaq.audit import write_log, get_logs_for_visit
from aarogyaq.models import AuditLog, Visit, Patient
from datetime import datetime

@pytest.fixture
def clean_db(test_db):
    test_db.query(AuditLog).delete()
    test_db.query(Visit).delete()
    test_db.query(Patient).delete()
    test_db.commit()
    return test_db

def test_write_log_visit(clean_db):
    # Write log for a visit: assert log stored, logged_at is set.
    p1 = Patient(patient_id="ARQ-01", name="A", age=20, gender="Male")
    clean_db.add(p1)
    clean_db.flush()
    
    v1 = Visit(patient_id="ARQ-01", chief_complaint="Pain", pain_level=2, queue_type="General", status="Waiting", visit_timestamp=datetime.utcnow())
    clean_db.add(v1)
    clean_db.flush()

    log = write_log(clean_db, v1.visit_id, "nurse", "REGISTERED", "Test note")
    
    assert log.log_id is not None
    assert log.logged_at is not None
    assert log.visit_id == v1.visit_id
    assert log.actor == "nurse"
    assert log.action == "REGISTERED"

def test_write_log_no_visit(clean_db):
    # Write log with visit_id=None: assert stored without FK error.
    log = write_log(clean_db, None, "system", "SYSTEM_ALERT_AGING")
    
    assert log.log_id is not None
    assert log.visit_id is None
    assert log.actor == "system"

def test_write_log_invalid_actor(clean_db):
    # Invalid actor "admin": ValueError raised.
    with pytest.raises(ValueError, match="Invalid actor: admin"):
        write_log(clean_db, None, "admin", "SYSTEM_ALERT_AGING")

def test_write_log_invalid_action(clean_db):
    # Invalid action "DELETED": ValueError raised.
    with pytest.raises(ValueError, match="Invalid action: DELETED"):
        write_log(clean_db, None, "system", "DELETED")

def test_get_logs_for_visit(clean_db):
    # get_logs_for_visit: write 3 logs, assert returned in chronological order.
    p1 = Patient(patient_id="ARQ-01", name="A", age=20, gender="Male")
    clean_db.add(p1)
    clean_db.flush()
    
    v1 = Visit(patient_id="ARQ-01", chief_complaint="Pain", pain_level=2, queue_type="General", status="Waiting", visit_timestamp=datetime.utcnow())
    clean_db.add(v1)
    clean_db.flush()

    write_log(clean_db, v1.visit_id, "nurse", "REGISTERED")
    write_log(clean_db, v1.visit_id, "system", "QUEUE_ASSIGNED")
    write_log(clean_db, v1.visit_id, "doctor", "STATUS_ATTENDING")

    logs = get_logs_for_visit(clean_db, v1.visit_id)
    assert len(logs) == 3
    assert logs[0].action == "REGISTERED"
    assert logs[1].action == "QUEUE_ASSIGNED"
    assert logs[2].action == "STATUS_ATTENDING"
    # Verify order
    assert logs[0].logged_at <= logs[1].logged_at <= logs[2].logged_at
