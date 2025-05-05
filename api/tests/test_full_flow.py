# tests/test_full_flow.py

import pytest
from uuid import UUID # Importieren, um Token-Format zu prüfen (optional)

# --- Der eigentliche Test ---
def test_full_flow(client, admin_user, regular_user):
    """
    Tests a complete user flow: registration, login, group creation (with token),
    event creation, joining VIA TOKEN, tipping, result setting, and scoring checks.
    Uses JWT authentication via fixtures.
    """
    # 1. Admin-User ist bereits durch 'admin_user' Fixture angelegt & JWT erhalten
    admin_jwt = admin_user['token']
    admin_id = admin_user['id']

    # 2. Gruppe anlegen (mit Admin JWT)
    response_group = client.post(
        "/groups/",
        json={
            "name": "Wiener Wettfreunde",
            "description": "Tipprunde der Elite",
        },
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert response_group.status_code == 201, f"Group creation failed: {response_group.text}"
    group = response_group.json()
    group_id = group["id"]
    assert group["created_by"] == admin_id

    # --- InviteToken prüfen und speichern ---
    assert "invite_token" in group, "Group response must include 'invite_token'"
    invite_token = group["invite_token"]
    # >>> WICHTIG: Die nächste Zeile wird fehlschlagen, wenn dein Backend immer noch 'None' liefert <<<
    assert invite_token is not None, "invite_token must not be null (Check Backend Code & DB Migration!)"
    assert isinstance(invite_token, str) and len(invite_token) > 10, "invite_token must be a reasonably long string"
    # Optionale Prüfung auf UUID-Format
    try:
        UUID(invite_token, version=4)
        print(f"Invite token received: {invite_token}") # Debugging
    except ValueError:
        pytest.fail(f"invite_token '{invite_token}' is not a valid UUID v4")
    # --- Ende Token Prüfung ---

    # 3. Event anlegen (mit Admin JWT)
    event_options = ["Fury", "Usyk", "Unentschieden"]
    response_event = client.post(
        "/events/",
        json={
            "title": "Boxkampf Fury vs. Usyk",
            "description": "Weltmeisterschaft am Samstag",
            "group_id": group_id,
            "question": "Wer gewinnt?",
            "options": event_options
        },
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert response_event.status_code == 201, f"Event creation failed: {response_event.text}"
    event = response_event.json()
    event_id = event["id"]

    # 4. Event abrufen (mit Admin JWT)
    response_get_event = client.get(f"/events/{event_id}", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert response_get_event.status_code == 200
    assert response_get_event.json()["title"] == "Boxkampf Fury vs. Usyk"

    # 5. Zweiter User (Teilnehmer) ist bereits durch 'regular_user' Fixture angelegt & JWT erhalten
    user_jwt = regular_user['token']
    user_id = regular_user['id']
    user_name = regular_user['name']

    # 6. User tritt der Gruppe bei (mit User JWT und Invite Token) --- Token-Beitritt ---
    response_join = client.post(
        f"/memberships/join/{invite_token}", # Neuer Endpunkt mit Token im Pfad
        headers={"Authorization": f"Bearer {user_jwt}"} # JWT des beitretenden Users
        # Kein JSON-Body mehr
    )
    assert response_join.status_code == 201, f"Joining group via token failed: {response_join.text}"
    # Überprüfe die Antwort (sollte die neue Mitgliedschaft sein)
    membership = response_join.json()
    assert membership["user_id"] == user_id
    assert membership["group_id"] == group_id
    # --- Ende Token-Beitritt ---

    # 7. User gibt Tipp ab (mit User JWT)
    tip_selection = event_options[0] # "Fury"
    response_tip = client.post(
        "/tips/",
        json={
            "event_id": event_id,
            "selected_option": tip_selection
        },
        headers={"Authorization": f"Bearer {user_jwt}"}
    )
    assert response_tip.status_code == 201, f"Tip submission failed: {response_tip.text}"
    assert response_tip.json()["selected_option"] == tip_selection

    # 8. Admin setzt das Ergebnis (mit Admin JWT)
    winning_option = tip_selection # "Fury"
    response_result = client.post(
        "/events/result",
        json={
            "event_id": event_id,
            "winning_option": winning_option
        },
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    # Laut OpenAPI gibt /events/result {} zurück, prüfe nur Status
    assert response_result.status_code == 200, f"Setting result failed: {response_result.text}"

    # 9. Punkte abfragen (User) (mit User JWT)
    response_points = client.get(f"/tips/points/{group_id}", headers={"Authorization": f"Bearer {user_jwt}"})
    assert response_points.status_code == 200, f"Getting points failed: {response_points.text}"
    points_data = response_points.json()
    assert points_data["user_id"] == user_id
    assert points_data["group_id"] == group_id
    assert points_data["points"] > 0, f"User should have points, got {points_data.get('points')}"

    # 10. Highscore abfragen (Admin) (mit Admin JWT)
    response_highscore = client.get(f"/tips/highscore/{group_id}", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert response_highscore.status_code == 200, f"Getting highscore failed: {response_highscore.text}"
    highscore = response_highscore.json()
    user_score_entry = next((entry for entry in highscore if entry["user_id"] == user_id), None)
    assert user_score_entry is not None, f"User {user_id} not found in highscore: {highscore}"
    assert user_score_entry["name"] == user_name
    assert user_score_entry["points"] > 0