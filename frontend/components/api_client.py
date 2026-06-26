import requests

BASE_URL = "http://localhost:8000"

def _handle_response(response: requests.Response) -> dict | list:
    """Helper to check status code and return JSON."""
    if not response.ok:
        raise RuntimeError(f"API Call Failed with status {response.status_code}: {response.text}")
    return response.json()

def check_health() -> bool:
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        return response.status_code == 200
    except requests.RequestException:
        return False

def register_patient(payload: dict) -> dict:
    response = requests.post(f"{BASE_URL}/patients/register", json=payload)
    return _handle_response(response)

def get_emergency_queue() -> list:
    response = requests.get(f"{BASE_URL}/queue/emergency")
    return _handle_response(response)

def get_general_queue() -> list:
    response = requests.get(f"{BASE_URL}/queue/general")
    return _handle_response(response)

def get_stale_patients() -> list:
    response = requests.get(f"{BASE_URL}/queue/stale")
    return _handle_response(response)

def update_visit_status(visit_id: int, status: str, actor: str) -> dict:
    response = requests.patch(f"{BASE_URL}/visits/{visit_id}/status", json={"status": status, "actor": actor})
    return _handle_response(response)

def reassess_patient(visit_id: int, payload: dict) -> dict:
    response = requests.post(f"{BASE_URL}/visits/{visit_id}/reassess", json=payload)
    return _handle_response(response)

def get_patient_history(patient_id: str) -> list:
    response = requests.get(f"{BASE_URL}/patients/{patient_id}/history")
    return _handle_response(response)

def get_shift_report(shift_start: str, shift_end: str) -> dict:
    response = requests.get(f"{BASE_URL}/shift/report", params={"shift_start": shift_start, "shift_end": shift_end})
    return _handle_response(response)

def get_departments() -> list:
    response = requests.get(f"{BASE_URL}/departments")
    return _handle_response(response)

def update_department_status(dept_name: str, status: str) -> dict:
    response = requests.patch(f"{BASE_URL}/departments/{dept_name}/status", json={"status": status})
    return _handle_response(response)
