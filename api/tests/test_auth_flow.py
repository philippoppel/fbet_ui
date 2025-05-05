# tests/test_auth_flow.py
import pytest
from fastapi.testclient import TestClient


def test_user_registration_and_login_password(client: TestClient):
    """
    Testet die Registrierung mit Passwort und den anschließenden Login
    über E-Mail/Passwort, der einen JWT zurückgibt.
    """
    test_email = "bob.testing.password@example.com" # Eindeutige E-Mail
    test_name = "Bob Tester PW"
    test_password = "bob_secure_password"

    # --- Schritt 1: Registrierung mit Passwort ---
    response_create = client.post(
        "/users/",
        json={"email": test_email, "name": test_name, "password": test_password} # Passwort senden!
    )
    assert response_create.status_code == 201, \
        f"User creation failed: {response_create.text}"
    created_user_data = response_create.json()
    assert created_user_data["email"] == test_email
    assert created_user_data["name"] == test_name
    assert "id" in created_user_data
    assert "password" not in created_user_data
    user_id = created_user_data["id"]

    # --- Schritt 2: Login mit E-Mail und Passwort ---
    login_form_data = {"username": test_email, "password": test_password}
    response_login = client.post(
        "/users/login", # Korrekter Login-Pfad
        data=login_form_data # Als Form Data senden!
    )
    assert response_login.status_code == 200, \
        f"Login failed: {response_login.text}"
    login_data = response_login.json()
    assert "access_token" in login_data
    assert login_data.get("token_type", "").lower() == "bearer"
    jwt_token = login_data["access_token"]

    # --- Schritt 3: Testen eines geschützten Endpunkts mit dem JWT ---
    response_me = client.get(
        "/users/me", # Sicherstellen, dass Prefix in Router/main.py konsistent ist
        headers={"Authorization": f"Bearer {jwt_token}"} # JWT im Header senden
    )
    assert response_me.status_code == 200, \
        f"Failed to access /users/me: {response_me.text}"
    me_data = response_me.json()
    assert me_data["id"] == user_id
    assert me_data["email"] == test_email
    assert me_data["name"] == test_name
    assert "hashed_password" not in me_data