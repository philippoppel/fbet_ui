# tests/conftest.py

import pytest
from uuid import uuid4
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, engine, get_db
from app.main import app
from .helpers.api_helpers import create_user_login_and_get_jwt

# --- Konstanten ---
DEFAULT_EVENT_OPTIONS = ["Team A", "Team B", "Unentschieden"]


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def prepare_database():
    """Sets up the database once per test session."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Provides a clean database session for each test function."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Provides a FastAPI TestClient with overridden DB dependency."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# --- User Fixtures (angepasst) ---

@pytest.fixture(scope="function")
def admin_user(client: TestClient, db_session):
    """Provides a logged-in admin user using password auth."""
    email = f"admin-{uuid4()}@example.com"
    name = "Admin User"
    password = "adminpassword" # Wähle ein Test-Passwort

    jwt, user_id = create_user_login_and_get_jwt(
        client, db_session, email, name, password
    )
    return {"token": jwt, "id": user_id, "name": name, "email": email}

@pytest.fixture(scope="function")
def regular_user(client: TestClient, db_session):
    """Provides a logged-in regular user using password auth."""
    email = f"user-{uuid4()}@example.com"
    name = "Regular User"
    password = "userpassword" # Wähle ein Test-Passwort

    # Rufe den NEUEN Helper mit Passwort auf
    jwt, user_id = create_user_login_and_get_jwt(
        client, db_session, email, name, password
    )
    return {"token": jwt, "id": user_id, "name": name, "email": email}


@pytest.fixture(scope="function")
def admin_with_group_and_event(client: TestClient, db_session, admin_user: dict):
    """
    Provides a standard setup: an admin user, a group created by them,
    and a default event within that group.
    """
    admin_jwt = admin_user['token'] # Angepasst an Rückgabewert der Fixture
    admin_id = admin_user['id']

    # Rest der Fixture bleibt gleich...
    # 1. Gruppe erstellen
    group_name = f"TestGroup-{uuid4()}"
    response_group = client.post(
        "/groups/",
        json={"name": group_name, "description": "Fixture Group"},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert response_group.status_code == 201, f"Fixture setup failed: Group creation returned {response_group.status_code}"
    group_id = response_group.json()["id"]

    # 2. Event erstellen
    event_title = f"Test Event {uuid4()}"
    response_event = client.post(
        "/events/",
        json={
            "title": event_title,
            "description": "Fixture Event",
            "group_id": group_id,
            "question": "Wer gewinnt?",
            "options": DEFAULT_EVENT_OPTIONS,
        },
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert response_event.status_code == 201, f"Fixture setup failed: Event creation returned {response_event.status_code}"
    event_id = response_event.json()["id"]

    return {
        "admin_jwt": admin_jwt,
        "admin_id": admin_id,
        "group_id": group_id,
        "event_id": event_id,
        "event_options": DEFAULT_EVENT_OPTIONS,
    }