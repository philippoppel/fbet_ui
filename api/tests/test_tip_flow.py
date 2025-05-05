# tests/test_tip_flow.py

import pytest
from uuid import uuid4

from tests.helpers.api_helpers import create_user_login_and_get_jwt
from fastapi.testclient import TestClient


# Importiere den zentralen Helfer nur, falls er noch *direkt* gebraucht wird
# (z.B. im komplexen Highscore-Test)


class TestTippFlow:
    """Tests related to tip submission, results, points, and highscores."""

    # Die alten Helper-Methoden (create_event, setup_group_and_event, ...) werden entfernt.

    def test_user_can_submit_tip(self, client, admin_with_group_and_event):
        """Tests if a logged-in user (the admin from the fixture) can submit a valid tip."""
        setup_data = admin_with_group_and_event
        tip_option = setup_data["event_options"][0] # Nimm die erste Option

        response = client.post(
            "/tips/",
            json={
                "event_id": setup_data["event_id"],
                "selected_option": tip_option
            },
            headers={"Authorization": f"Bearer {setup_data['admin_jwt']}"}
        )

        assert response.status_code == 201, f"Tip submission failed: {response.text}"
        tip_data = response.json()
        assert tip_data["selected_option"] == tip_option
        assert tip_data["user_id"] == setup_data["admin_id"]
        assert tip_data["event_id"] == setup_data["event_id"]

    def test_user_cannot_tip_twice(self, client, admin_with_group_and_event):
        """Tests if a user can submit only one tip per event."""
        setup_data = admin_with_group_and_event
        tip_option_1 = setup_data["event_options"][0]
        tip_option_2 = setup_data["event_options"][1]

        # Erster Tipp
        response1 = client.post(
            "/tips/",
            json={"event_id": setup_data["event_id"], "selected_option": tip_option_1},
            headers={"Authorization": f"Bearer {setup_data['admin_jwt']}"}
        )
        assert response1.status_code == 201

        # Zweiter Tipp (sollte fehlschlagen)
        response2 = client.post(
            "/tips/",
            json={"event_id": setup_data["event_id"], "selected_option": tip_option_2},
            headers={"Authorization": f"Bearer {setup_data['admin_jwt']}"}
        )
        assert response2.status_code == 409, f"Second tip should fail with 409: {response2.text}"

    def test_non_member_cannot_tip(self, client, admin_with_group_and_event, regular_user):
        """Tests if a user not belonging to the group can submit a tip."""
        setup_data = admin_with_group_and_event
        stranger_jwt = regular_user['token'] # Nutze den regular_user als Fremden
        tip_option = setup_data["event_options"][0]

        # Fremder (regular_user) versucht zu tippen
        response = client.post(
            "/tips/",
            json={"event_id": setup_data["event_id"], "selected_option": tip_option},
            headers={"Authorization": f"Bearer {stranger_jwt}"}
        )
        assert response.status_code == 403, f"Non-member tipping should fail with 403: {response.text}"

    def test_admin_can_set_event_result(self, client, admin_with_group_and_event):
        """Tests if the group admin can set the event result."""
        setup_data = admin_with_group_and_event
        winning_option = setup_data["event_options"][0]

        # Admin setzt Ergebnis
        response = client.post(
            "/events/result",
            json={
                "event_id": setup_data["event_id"],
                "winning_option": winning_option
            },
            headers={"Authorization": f"Bearer {setup_data['admin_jwt']}"}
        )
        assert response.status_code == 200, f"Setting result failed: {response.text}"
        assert response.json()["winning_option"] == winning_option

    def test_non_admin_cannot_set_result(self, client, admin_with_group_and_event, regular_user):
        """Tests if a regular group member (non-admin) can set the result."""
        setup_data = admin_with_group_and_event
        member_jwt = regular_user['token']
        member_id = regular_user['id']
        winning_option = setup_data["event_options"][0]

        # Stelle sicher, dass der regular_user Mitglied ist (erforderlich für diesen Test)
        response_join = client.post(
            "/memberships/",
            json={"user_id": member_id, "group_id": setup_data['group_id']},
            headers={"Authorization": f"Bearer {member_jwt}"} # User tritt selbst bei
        )
        assert response_join.status_code == 201, f"Setup failed: User could not join group: {response_join.text}"

        # Normaler User versucht, Ergebnis zu setzen
        response_result = client.post(
            "/events/result",
            json={"event_id": setup_data["event_id"], "winning_option": winning_option},
            headers={"Authorization": f"Bearer {member_jwt}"} # JWT des normalen Users
        )
        assert response_result.status_code == 403, f"Non-admin setting result should fail with 403: {response_result.text}"

    def test_user_gets_points_for_correct_tip(self, client, admin_with_group_and_event):
        """Tests if a user receives points for a correct tip."""
        setup_data = admin_with_group_and_event
        correct_option = setup_data["event_options"][0]

        # User (Admin in diesem Setup) gibt korrekten Tipp ab
        response_tip = client.post(
            "/tips/",
            json={"event_id": setup_data["event_id"], "selected_option": correct_option},
            headers={"Authorization": f"Bearer {setup_data['admin_jwt']}"}
        )
        assert response_tip.status_code == 201

        # Admin setzt Ergebnis
        response_result = client.post(
            "/events/result",
            json={"event_id": setup_data["event_id"], "winning_option": correct_option},
            headers={"Authorization": f"Bearer {setup_data['admin_jwt']}"}
        )
        assert response_result.status_code == 200

        # Punkte abfragen
        response_points = client.get(
            f"/tips/points/{setup_data['group_id']}",
            headers={"Authorization": f"Bearer {setup_data['admin_jwt']}"}
        )
        assert response_points.status_code == 200, f"Getting points failed: {response_points.text}"
        points_data = response_points.json()
        assert points_data["user_id"] == setup_data["admin_id"]
        assert points_data["group_id"] == setup_data["group_id"]
        assert points_data["points"] > 0 # Sollte Punkte haben
        assert points_data["calculated_events"] == 1

    # --- Highscore Test ---
    def test_highscore_ranking(self, client: TestClient, db_session):
        """Tests the highscore calculation with bonus points and asserts each step."""

        def _create_event(jwt_token: str, group_id: int, title: str) -> int:
            response = client.post("/events/", json={
                "title": title,
                "description": "Highscore Test Event",
                "group_id": group_id,
                "question": "A or B?",
                "options": ["A", "B"]
            }, headers={"Authorization": f"Bearer {jwt_token}"})
            assert response.status_code == 201, response.text
            return response.json()["id"]

        test_password = "highscore_user_pw"
        anna_email = f"anna+{uuid4()}@example.com"
        jwt_anna, anna_id = create_user_login_and_get_jwt(client, db_session, anna_email, "Anna", test_password)

        response_group = client.post("/groups/", json={
            "name": f"Highscore Group {uuid4()}",
            "description": "Anna's Group"
        }, headers={"Authorization": f"Bearer {jwt_anna}"})
        assert response_group.status_code == 201
        group_id = response_group.json()["id"]

        def _create_and_join(email_prefix):
            email = f"{email_prefix}+{uuid4()}@example.com"
            name = email_prefix.capitalize()
            jwt_token, user_id = create_user_login_and_get_jwt(client, db_session, email, name, test_password)
            resp_join = client.post("/memberships/", json={
                "user_id": user_id, "group_id": group_id
            }, headers={"Authorization": f"Bearer {jwt_token}"})
            assert resp_join.status_code == 201
            return jwt_token, user_id, name

        jwt_bob, bob_id, _ = _create_and_join("bob")
        jwt_carla, carla_id, _ = _create_and_join("carla")

        # --- Event 1 ---
        event_id_1 = _create_event(jwt_anna, group_id, "Event 1")
        r = client.post("/tips/", json={"event_id": event_id_1, "selected_option": "A"},
                        headers={"Authorization": f"Bearer {jwt_bob}"})
        assert r.status_code == 201
        r = client.post("/tips/", json={"event_id": event_id_1, "selected_option": "B"},
                        headers={"Authorization": f"Bearer {jwt_carla}"})
        assert r.status_code == 201
        r = client.post("/events/result", json={"event_id": event_id_1, "winning_option": "A"},
                        headers={"Authorization": f"Bearer {jwt_anna}"})
        assert r.status_code == 200

        # --- Event 2 ---
        event_id_2 = _create_event(jwt_anna, group_id, "Event 2")
        r = client.post("/tips/", json={"event_id": event_id_2, "selected_option": "A"},
                        headers={"Authorization": f"Bearer {jwt_bob}"})
        assert r.status_code == 201
        r = client.post("/tips/", json={"event_id": event_id_2, "selected_option": "B"},
                        headers={"Authorization": f"Bearer {jwt_carla}"})
        assert r.status_code == 201
        r = client.post("/events/result", json={"event_id": event_id_2, "winning_option": "B"},
                        headers={"Authorization": f"Bearer {jwt_anna}"})
        assert r.status_code == 200

        # --- Event 3 ---
        event_id_3 = _create_event(jwt_anna, group_id, "Event 3")
        r = client.post("/tips/", json={"event_id": event_id_3, "selected_option": "A"},
                        headers={"Authorization": f"Bearer {jwt_bob}"})
        assert r.status_code == 201
        r = client.post("/tips/", json={"event_id": event_id_3, "selected_option": "A"},
                        headers={"Authorization": f"Bearer {jwt_carla}"})
        assert r.status_code == 201
        r = client.post("/events/result", json={"event_id": event_id_3, "winning_option": "A"},
                        headers={"Authorization": f"Bearer {jwt_anna}"})
        assert r.status_code == 200

        # Highscore abfragen
        resp_hs = client.get(f"/tips/highscore/{group_id}", headers={"Authorization": f"Bearer {jwt_anna}"})
        assert resp_hs.status_code == 200, resp_hs.text
        hs_data = resp_hs.json()

        print("Highscore response:", hs_data)  # Für Debugging

        scores = {entry["user_id"]: entry["points"] for entry in hs_data}

        # Erwartete Punkte:
        # Bob: Event1 (allein richtig → 3), Event2 (falsch → 0), Event3 (mit Carla → 1) → 4
        # Carla: Event1 (falsch → 0), Event2 (allein richtig → 3), Event3 (mit Bob → 1) → 4
        # Anna: kein Tipp → 0

        assert scores.get(bob_id) == 4, f"Bob hat {scores.get(bob_id)} Punkte"
        assert scores.get(carla_id) == 4, f"Carla hat {scores.get(carla_id)} Punkte"
        assert scores.get(anna_id) == 0, f"Anna hat {scores.get(anna_id)} Punkte"

        # Reihenfolge prüfen (nicht zwingend)
        assert hs_data[0]["points"] == 4
        assert hs_data[1]["points"] == 4
        assert hs_data[2]["points"] == 0
        assert {hs_data[0]["user_id"], hs_data[1]["user_id"]} == {bob_id, carla_id}
