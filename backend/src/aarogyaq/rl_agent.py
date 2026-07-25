"""
Single responsibility: Epsilon-greedy contextual bandit RL agent that learns
to adjust priority score thresholds based on patient outcome feedback.

DESIGN
------
State  = (queue_type, time_bucket, queue_depth_bucket)
            queue_type       : "Emergency" | "General"
            time_bucket      : "morning" | "afternoon" | "evening" | "night"
            queue_depth_bucket: "low" | "medium" | "high"

Action = threshold_adjustment ∈ {-5, -2, 0, +2, +5}
            Applied as a delta to the Critical/High/Medium/Low score cutoffs.
            Action index 0→-5, 1→-2, 2→0, 3→+2, 4→+5.

Reward = f(priority_level, minutes_to_attend)
            +1.0  : Critical attended within 15 min
            +0.75 : High attended within 30 min
            +0.5  : Medium attended within 60 min
            +0.25 : Low attended within 120 min
             0.0  : attended just within 2× tolerance
            -0.5  : waited > 2× tolerance for their priority
            -1.0  : Critical waited > 30 min (safety violation)

Q-table is stored in backend/config/rl_qtable.json and survives restarts.

DETERMINISM: The agent is deterministic when epsilon=0. The only randomness
is in exploration (epsilon > 0 → random action). This module is the only
module that touches rl_qtable.json. No other module is affected.
"""
from __future__ import annotations

import json
import logging
import random
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

ACTIONS: list[int] = [-5, -2, 0, 2, 5]          # threshold adjustments in points
DEFAULT_EPSILON: float = 0.2                      # 20% exploration
LEARNING_RATE:  float = 0.1                       # α
DISCOUNT:       float = 0.9                       # γ  (single-step bandit → not critical)
MIN_EPSILON:    float = 0.05                      # never go fully greedy

# Max wait times (minutes) per priority level before applying a penalty
TOLERANCE: dict[str, int] = {
    "Critical": 15,
    "High":     30,
    "Medium":   60,
    "Low":      120,
}

_QTABLE_PATH = Path(__file__).parent.parent.parent.parent / "config" / "rl_qtable.json"


# ── State + persistence dataclass ─────────────────────────────────────────────

@dataclass
class RLAgentState:
    """Serialisable snapshot of the agent's full state.

    Attributes:
        version:  Schema version for forward-compatibility.
        epsilon:  Current exploration rate.
        episodes: Total number of feedback events processed.
        qtable:   Nested dict: state_key → list[float] of Q-values per action.
        threshold_offsets: Current cumulative threshold adjustments per queue type.
    """
    version:           int              = 1
    epsilon:           float            = DEFAULT_EPSILON
    episodes:          int              = 0
    qtable:            dict[str, list[float]] = field(default_factory=dict)
    threshold_offsets: dict[str, int]  = field(default_factory=lambda: {
        "Emergency": 0,
        "General":   0,
    })


# ── Public API ────────────────────────────────────────────────────────────────

def load_agent() -> RLAgentState:
    """Load RL agent state from disk.  Returns a fresh default if the file is
    missing or corrupt.

    Returns:
        :class:`RLAgentState` populated from JSON, or a fresh default.
    """
    if not _QTABLE_PATH.exists():
        logger.info("rl_qtable.json not found — initialising fresh agent.")
        return RLAgentState()
    try:
        with open(_QTABLE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        state = RLAgentState(
            version=data.get("version", 1),
            epsilon=float(data.get("epsilon", DEFAULT_EPSILON)),
            episodes=int(data.get("episodes", 0)),
            qtable=data.get("qtable", {}),
            threshold_offsets=data.get("threshold_offsets", {"Emergency": 0, "General": 0}),
        )
        return state
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.warning("rl_qtable.json corrupt (%s) — resetting agent.", exc)
        return RLAgentState()


def save_agent(state: RLAgentState) -> None:
    """Persist RL agent state to disk.

    Args:
        state: The :class:`RLAgentState` to serialise.
    """
    _QTABLE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_QTABLE_PATH, "w", encoding="utf-8") as f:
        json.dump(asdict(state), f, indent=2)


def make_state_key(
    queue_type: str,
    now: datetime | None = None,
    queue_depth: int = 0,
) -> str:
    """Build a compact state key string for the Q-table lookup.

    Args:
        queue_type:  "Emergency" or "General".
        now:         Timestamp to bucket into time-of-day. Defaults to utcnow.
        queue_depth: Current number of waiting patients in the queue.

    Returns:
        A string like ``"Emergency|morning|low"``.
    """
    if now is None:
        now = datetime.utcnow()

    hour = now.hour
    if 6 <= hour < 12:
        time_bucket = "morning"
    elif 12 <= hour < 18:
        time_bucket = "afternoon"
    elif 18 <= hour < 22:
        time_bucket = "evening"
    else:
        time_bucket = "night"

    if queue_depth <= 5:
        depth_bucket = "low"
    elif queue_depth <= 15:
        depth_bucket = "medium"
    else:
        depth_bucket = "high"

    return f"{queue_type}|{time_bucket}|{depth_bucket}"


def select_action(state: RLAgentState, state_key: str) -> int:
    """Choose an action index using the epsilon-greedy policy.

    Args:
        state:     Current agent state (holds Q-table and epsilon).
        state_key: State key string from :func:`make_state_key`.

    Returns:
        An index into :data:`ACTIONS` (0–4).
    """
    q_values = state.qtable.get(state_key, [0.0] * len(ACTIONS))

    if random.random() < state.epsilon:
        # Explore: choose a random action
        return random.randrange(len(ACTIONS))
    else:
        # Exploit: choose the action with highest Q-value
        # Tie-break by preferring action_index=2 (no change, conservative default)
        best_val = max(q_values)
        best_indices = [i for i, v in enumerate(q_values) if v == best_val]
        if 2 in best_indices:
            return 2
        return best_indices[0]


def compute_reward(priority_level: str, minutes_to_attend: int) -> float:
    """Calculate the reward signal for a completed visit.

    Args:
        priority_level:    Patient's triage priority (Critical/High/Medium/Low).
        minutes_to_attend: Minutes from registration to first attendance.

    Returns:
        Reward float in [-1.0, +1.0].

    Raises:
        ValueError: if priority_level is not recognised.
    """
    if priority_level not in TOLERANCE:
        raise ValueError(f"Unknown priority_level: {priority_level!r}")

    tolerance = TOLERANCE[priority_level]

    # Safety violation — critical patient left too long
    if priority_level == "Critical" and minutes_to_attend > 30:
        return -1.0

    if minutes_to_attend <= tolerance:
        # Reward scaled by how much faster than tolerance they were seen
        ratio = minutes_to_attend / tolerance   # 0 = instantly, 1 = exactly at limit
        return round(1.0 - 0.75 * ratio, 4)    # +1.0 → +0.25
    elif minutes_to_attend <= 2 * tolerance:
        # Attended late but not catastrophic
        return 0.0
    else:
        # Waited > 2× the tolerance
        return -0.5


def update_qtable(
    state: RLAgentState,
    state_key: str,
    action_idx: int,
    reward: float,
) -> RLAgentState:
    """Apply a Bellman update to the Q-table and decay epsilon.

    Args:
        state:      Current agent state.
        state_key:  State key for the action that was taken.
        action_idx: Index into :data:`ACTIONS` of the chosen action.
        reward:     Observed reward from :func:`compute_reward`.

    Returns:
        Updated :class:`RLAgentState` (mutates in-place and returns self).
    """
    if state_key not in state.qtable:
        state.qtable[state_key] = [0.0] * len(ACTIONS)

    q_values = state.qtable[state_key]
    old_q = q_values[action_idx]
    # Single-step contextual bandit: no next-state max needed
    new_q = old_q + LEARNING_RATE * (reward - old_q)
    q_values[action_idx] = round(new_q, 6)

    state.episodes += 1

    # Decay epsilon — explore less as we accumulate experience
    state.epsilon = max(MIN_EPSILON, state.epsilon * 0.999)

    return state


def apply_threshold_offset(state: RLAgentState, queue_type: str, action_idx: int) -> None:
    """Commit the chosen action's delta to the persistent threshold offset.

    Args:
        state:      Agent state (mutated in-place).
        queue_type: "Emergency" or "General".
        action_idx: Chosen action index.
    """
    delta = ACTIONS[action_idx]
    current = state.threshold_offsets.get(queue_type, 0)
    # Clamp total offset to ±15 points to prevent runaway drift
    new_offset = max(-15, min(15, current + delta))
    state.threshold_offsets[queue_type] = new_offset


def get_adjusted_thresholds(queue_type: str, state: RLAgentState | None = None) -> dict[str, tuple[float, float]]:
    """Return the RL-adjusted priority score thresholds for a queue type.

    The base thresholds from priority.py are shifted by the agent's learned
    cumulative offset for this queue type.

    Args:
        queue_type: "Emergency" or "General".
        state:      Agent state. If None, loads from disk.

    Returns:
        Dict mapping priority name → (low, high) inclusive score range.
    """
    if state is None:
        state = load_agent()

    offset = state.threshold_offsets.get(queue_type, 0)

    return {
        "Critical": (max(0,  76 + offset), 100.0),
        "High":     (max(0,  51 + offset), min(100.0, 75 + offset)),
        "Medium":   (max(0,  26 + offset), min(100.0, 50 + offset)),
        "Low":      (0.0,                  min(100.0, 25 + offset)),
    }
