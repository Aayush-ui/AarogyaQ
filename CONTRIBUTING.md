# Contributing to AarogyaQ

We love your input! We want to make contributing to this project as easy and transparent as possible.

## How to Run Tests

### Backend Tests
```bash
cd backend
pytest -q
```

### Frontend Tests
Instructions for running React frontend tests will be added soon.

## Code Style
- Type hints and docstrings are **required** on all public functions.

## Commit Format
Please follow this commit format:
`feat(<layer>): <step-id> -- <summary>`

**Example:**
`feat(backend): IT-1 -- Add integration tests`

## Architectural Rules
**One strict rule:** The frontend NEVER imports from the backend. (This is verified with a CI check).
