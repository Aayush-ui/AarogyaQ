import pytest
from aarogyaq.priority import classify, get_color, get_queue

def test_classify_critical():
    # score=80: "Critical", queue="Emergency", color="#D32F2F"
    assert classify(80) == "Critical"
    assert get_queue("Critical") == "Emergency"
    assert get_color("Critical") == "#D32F2F"

def test_classify_high():
    # score=60: "High", queue="Emergency"
    assert classify(60) == "High"
    assert get_queue("High") == "Emergency"

def test_classify_medium():
    # score=35: "Medium", queue="General"
    assert classify(35) == "Medium"
    assert get_queue("Medium") == "General"

def test_classify_low():
    # score=10: "Low", queue="General"
    assert classify(10) == "Low"
    assert get_queue("Low") == "General"

def test_classify_critical_boundary():
    # score=76 (boundary): "Critical"
    assert classify(76) == "Critical"

def test_classify_high_boundary():
    # score=51 (boundary): "High"
    assert classify(51) == "High"

def test_classify_negative_out_of_bounds():
    # score=-1: ValueError
    with pytest.raises(ValueError):
        classify(-1)

def test_classify_above_out_of_bounds():
    # score=101: ValueError
    with pytest.raises(ValueError):
        classify(101)
