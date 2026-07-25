"""
Tests for rl_agent.py

Coverage:
  - Valid: positive reward for fast Critical attendance → Q-value increases
  - Valid: negative reward for slow Critical → Q-value decreases
  - Valid: epsilon-greedy selects best action when epsilon=0
  - Edge:  empty Q-table defaults to action index 2 (no adjustment)
  - Edge:  threshold offset clamped to ±15
  - Invalid: unknown priority_level → ValueError
  - Determinism: same state + epsilon=0 → same action every call
  - Persistence: save then load round-trips correctly
"""
from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

import pytest

from aarogyaq.rl_agent import (
    ACTIONS,
    RLAgentState,
    apply_threshold_offset,
    compute_reward,
    get_adjusted_thresholds,
    load_agent,
    make_state_key,
    save_agent,
    select_action,
    update_qtable,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def fresh_state() -> RLAgentState:
    return RLAgentState()


def _morning() -> datetime:
    return datetime(2026, 1, 1, 9, 0, 0)   # 09:00 → morning bucket


# ── Valid: reward function ────────────────────────────────────────────────────

def test_reward_critical_fast_is_positive():
    """Critical attended in 5 min (tolerance=15) → strong positive reward."""
    r = compute_reward("Critical", minutes_to_attend=5)
    assert r > 0.5, f"Expected reward > 0.5 for fast Critical, got {r}"


def test_reward_critical_very_slow_is_minus_one():
    """Critical waiting > 30 min → safety-violation reward of -1.0."""
    r = compute_reward("Critical", minutes_to_attend=35)
    assert r == -1.0


def test_reward_high_within_tolerance_positive():
    """High attended in 20 min (tolerance=30) → positive reward."""
    r = compute_reward("High", minutes_to_attend=20)
    assert r > 0


def test_reward_medium_double_tolerance_is_negative():
    """Medium waiting 130 min (> 2×60) → negative reward."""
    r = compute_reward("Medium", minutes_to_attend=130)
    assert r == -0.5


def test_reward_low_exactly_at_tolerance_near_zero():
    """Low at exactly tolerance boundary → small positive or zero."""
    r = compute_reward("Low", minutes_to_attend=120)
    assert -0.1 <= r <= 0.3


# ── Invalid: unknown priority ─────────────────────────────────────────────────

def test_compute_reward_unknown_priority_raises():
    """Unknown priority_level must raise ValueError — never silently return."""
    with pytest.raises(ValueError, match="Unknown priority_level"):
        compute_reward("URGENT", minutes_to_attend=10)


# ── Edge: empty Q-table → conservative default ───────────────────────────────

def test_select_action_empty_qtable_returns_no_change():
    """With empty Q-table all Q-values are 0 → tie → prefer action index 2 (no change)."""
    state = fresh_state()
    state.epsilon = 0.0   # pure exploitation — no randomness
    key = make_state_key("Emergency", now=_morning(), queue_depth=3)
    action_idx = select_action(state, key)
    assert action_idx == 2, f"Expected action 2 (no-change), got {action_idx} = {ACTIONS[action_idx]}"


# ── Valid: Q-table update ─────────────────────────────────────────────────────

def test_qtable_increases_after_positive_reward():
    """A positive reward should raise the Q-value for the chosen action."""
    state = fresh_state()
    key = make_state_key("Emergency", now=_morning(), queue_depth=5)
    action_idx = 2   # no-change action

    before = state.qtable.get(key, [0.0] * len(ACTIONS))[action_idx]
    update_qtable(state, key, action_idx, reward=1.0)
    after = state.qtable[key][action_idx]

    assert after > before, f"Q-value should rise after reward=+1.0 (was {before}, now {after})"


def test_qtable_decreases_after_negative_reward():
    """A negative reward should lower the Q-value for the chosen action."""
    state = fresh_state()
    key = make_state_key("Emergency", now=_morning(), queue_depth=5)
    action_idx = 2

    # First: give it a positive value so we have room to decrease
    update_qtable(state, key, action_idx, reward=1.0)
    q_positive = state.qtable[key][action_idx]

    update_qtable(state, key, action_idx, reward=-1.0)
    q_negative = state.qtable[key][action_idx]

    assert q_negative < q_positive, "Q-value should fall after penalty"


def test_episode_count_increments():
    """Each update_qtable call must increment episodes by exactly 1."""
    state = fresh_state()
    assert state.episodes == 0
    key = make_state_key("General", now=_morning())
    update_qtable(state, key, 2, reward=0.5)
    assert state.episodes == 1
    update_qtable(state, key, 2, reward=0.5)
    assert state.episodes == 2


# ── Edge: threshold offset clamping ──────────────────────────────────────────

def test_threshold_offset_clamped_at_plus_15():
    """Cumulative offset must not exceed +15 points."""
    state = fresh_state()
    # Apply action index 4 (+5) many times
    for _ in range(10):
        apply_threshold_offset(state, "Emergency", action_idx=4)
    assert state.threshold_offsets["Emergency"] <= 15


def test_threshold_offset_clamped_at_minus_15():
    """Cumulative offset must not go below -15 points."""
    state = fresh_state()
    for _ in range(10):
        apply_threshold_offset(state, "Emergency", action_idx=0)   # action 0 = -5
    assert state.threshold_offsets["Emergency"] >= -15


# ── Adjusted thresholds ───────────────────────────────────────────────────────

def test_get_adjusted_thresholds_no_offset():
    """With offset=0, thresholds should match the base values."""
    state = fresh_state()
    thresholds = get_adjusted_thresholds("Emergency", state)
    assert thresholds["Critical"] == (76, 100.0)
    assert thresholds["High"]     == (51, 75.0)
    assert thresholds["Medium"]   == (26, 50.0)
    assert thresholds["Low"]      == (0.0, 25.0)


def test_get_adjusted_thresholds_positive_offset():
    """Positive offset raises all cutoffs proportionally."""
    state = fresh_state()
    state.threshold_offsets["Emergency"] = 5
    thresholds = get_adjusted_thresholds("Emergency", state)
    assert thresholds["Critical"][0] == 81   # 76+5
    assert thresholds["High"][0]     == 56   # 51+5


# ── Determinism ───────────────────────────────────────────────────────────────

def test_determinism_same_state_same_action():
    """With epsilon=0 and same Q-table, select_action must return identical results."""
    state = fresh_state()
    state.epsilon = 0.0
    key = make_state_key("General", now=_morning(), queue_depth=8)
    # Give it some Q-values to make the choice non-trivial
    state.qtable[key] = [0.1, 0.3, 0.5, 0.2, 0.1]

    actions = [select_action(state, key) for _ in range(10)]
    assert len(set(actions)) == 1, "select_action should be deterministic when epsilon=0"
    assert actions[0] == 2   # index with Q=0.5


# ── Persistence round-trip ────────────────────────────────────────────────────

def test_save_load_roundtrip(tmp_path):
    """save_agent followed by load_agent must reproduce the exact state."""
    state = fresh_state()
    state.epsilon = 0.12
    state.episodes = 42
    state.qtable["Emergency|morning|low"] = [0.1, 0.2, 0.5, 0.15, 0.05]
    state.threshold_offsets["Emergency"] = 5
    state.threshold_offsets["General"]   = -3

    # Patch the module-level path to use tmp_path
    qtable_file = tmp_path / "rl_qtable.json"
    import aarogyaq.rl_agent as rl_mod
    original_path = rl_mod._QTABLE_PATH
    rl_mod._QTABLE_PATH = qtable_file
    try:
        save_agent(state)
        loaded = load_agent()
    finally:
        rl_mod._QTABLE_PATH = original_path

    assert loaded.epsilon   == pytest.approx(0.12)
    assert loaded.episodes  == 42
    assert loaded.qtable["Emergency|morning|low"] == pytest.approx([0.1, 0.2, 0.5, 0.15, 0.05])
    assert loaded.threshold_offsets["Emergency"]  == 5
    assert loaded.threshold_offsets["General"]    == -3
