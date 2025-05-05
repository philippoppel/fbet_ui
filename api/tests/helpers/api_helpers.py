# helpers/api_helpers.py

from urllib.parse import urlparse, parse_qs
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

# --- NEUE API Helper Funktion ---

# Umbenannt und angepasst für Passwort-Login
def create_user_login_and_get_jwt(
    client: TestClient,
    db_session, # db_session ist hier evtl. nicht nötig, aber schadet nicht
    email: str,
    name: str,
    password: str # NEU: Passwort als Parameter
) -> tuple[str, int]:
    """
    Creates a user with email, name, and password.
    Logs the user in via the /users/login endpoint.
    Returns the JWT access token and user ID.
    """
    test_marker = f" (TestHelper: {email})"

    # --- Schritt 1: User mit Passwort erstellen ---
    user_payload = {"email": email, "name": name, "password": password} # Passwort hinzufügen!
    response_create = client.post("/users/", json=user_payload)
    assert response_create.status_code == 201, \
        f"User creation failed{test_marker}: {response_create.text}"
    user_data = response_create.json()
    user_id = user_data["id"]
    assert user_data["email"] == email

    # --- Schritt 2: User einloggen via /users/login ---
    # Der /login Endpunkt erwartet Form Data, kein JSON!
    # 'username' im Formular entspricht der E-Mail.
    login_data = {"username": email, "password": password}
    response_login = client.post("/users/login", data=login_data) # data= statt json=
    assert response_login.status_code == 200, \
        f"Login failed{test_marker}: {response_login.text}"

    # --- Schritt 3: JWT extrahieren ---
    login_data = response_login.json()
    assert "access_token" in login_data, f"Access token missing in login response{test_marker}"
    assert login_data.get("token_type", "").lower() == "bearer", f"Incorrect token type{test_marker}"
    jwt_token = login_data["access_token"]

    # Optional: Kurzer Check mit /me, um sicherzustellen, dass der Token funktioniert
    response_me = client.get("/users/me", headers={"Authorization": f"Bearer {jwt_token}"})
    assert response_me.status_code == 200, f"/me check failed after login{test_marker}: {response_me.text}"
    assert response_me.json()["id"] == user_id

    return jwt_token, user_id

# Die alte create_user_and_group Funktion muss ebenfalls angepasst werden,
# um die neue Helper-Funktion zu nutzen und das Passwort zu übergeben.
def create_user_and_group(
    client: TestClient,
    db_session,
    email: str,
    name: str,
    password: str, # NEU: Passwort als Parameter
    group_name="Test Group"
) -> tuple[str, int, int]:
    """
    Creates User with password, logs in, gets JWT, and creates a group.
    Calls create_user_login_and_get_jwt from this same module.
    """
    # Ruft die NEUE Funktion aus diesem Modul auf
    jwt_token, user_id = create_user_login_and_get_jwt(
        client, db_session, email, name, password
    )

    response_group = client.post(
        "/groups/",
        json={"name": group_name, "description": "Test Description"},
        headers={"Authorization": f"Bearer {jwt_token}"}
    )
    assert response_group.status_code == 201, \
        f"Group creation failed for user {email}: {response_group.text}"
    group = response_group.json()
    group_id = group["id"]

    return jwt_token, user_id, group_id