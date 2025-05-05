# tests/test_group_flow.py

import pytest
from uuid import uuid4

from fastapi.testclient import TestClient

from .helpers.api_helpers import create_user_login_and_get_jwt


class TestGroupFlow:
    """Tests related to group creation, joining, and member listing using JWT auth."""

    def test_create_group(self, client, admin_user):
        """Testet, ob ein eingeloggter User (via admin_user fixture) eine Gruppe erstellen kann."""
        group_name = f"Tipprunde {uuid4()}"
        response = client.post(
            "/groups/",
            json={
                "name": group_name,
                "description": "Beste Gruppe",
            },
            headers={"Authorization": f"Bearer {admin_user['token']}"}
        )
        assert response.status_code == 201, f"Group creation failed: {response.text}"
        group = response.json()
        assert group["name"] == group_name
        assert group["created_by"] == admin_user['id']

    def test_user_can_join_group(self, client, admin_user, regular_user):
        """Testet, ob ein User (regular_user) einer vom Admin (admin_user) erstellten Gruppe beitreten kann."""
        group_name = f"Tipprunde {uuid4()}"
        response_group = client.post(
            "/groups/",
            json={"name": group_name, "description": "Coole Truppe"},
            headers={"Authorization": f"Bearer {admin_user['token']}"}
        )
        assert response_group.status_code == 201
        group_id = response_group.json()["id"]

        join_response = client.post(
            "/memberships/",
            json={
                "user_id": regular_user['id'], # user_id wird explizit gesendet
                "group_id": group_id
             },
            headers={"Authorization": f"Bearer {regular_user['token']}"}
        )
        assert join_response.status_code == 201, f"Joining group failed: {join_response.text}"
        membership = join_response.json()
        assert membership["user_id"] == regular_user['id']
        assert membership["group_id"] == group_id

    def test_get_group_members(self, client: TestClient, db_session, admin_user): # client importieren
        """Testet, ob die Mitgliederliste einer Gruppe korrekt abgerufen werden kann."""
        # ... (Setup: Gruppe erstellen) ...
        group_name = f"Tipprunde {uuid4()}"
        response_group = client.post(
            "/groups/",
            json={"name": group_name, "description": "Wer ist dabei?"},
            headers={"Authorization": f"Bearer {admin_user['token']}"} # 'token' statt 'jwt' verwenden
        )
        assert response_group.status_code == 201
        group_id = response_group.json()["id"]
        admin_id = admin_user['id']


        members_to_join = []
        test_password = "group_member_pw" # Passwort für neue User definieren
        for name in ["Greta", "Hugo"]:
            email = f"{name.lower()}+{uuid4()}@example.com"
            # Verwende den NEUEN Helper mit Passwort
            jwt_user, user_id = create_user_login_and_get_jwt(
                client, db_session, email, name, test_password
            )
            members_to_join.append({"jwt": jwt_user, "id": user_id, "name": name})

            join_resp = client.post(
                "/memberships/",
                json={"user_id": user_id, "group_id": group_id},
                headers={"Authorization": f"Bearer {jwt_user}"}
            )
            assert join_resp.status_code == 201

        response_members = client.get(
            f"/memberships/group/{group_id}",
            headers={"Authorization": f"Bearer {admin_user['token']}"} # 'token' statt 'jwt'
        )
        # ... (Rest der Asserts bleibt gleich) ...
        assert response_members.status_code == 200, f"Failed to get members: {response_members.text}"
        memberships_data = response_members.json()
        expected_ids = {admin_id} | {m['id'] for m in members_to_join}
        actual_ids_in_list = {m["user_id"] for m in memberships_data}
        assert actual_ids_in_list == expected_ids
        assert len(memberships_data) == len(expected_ids)

    def test_cannot_join_group_twice(self, client, admin_user):
        """Testet, ob ein User (admin_user) derselben Gruppe nicht zweimal beitreten kann."""
        group_name = f"Tipprunde {uuid4()}"
        response_group = client.post(
            "/groups/",
            json={"name": group_name, "description": "Nur einmal beitreten"},
            headers={"Authorization": f"Bearer {admin_user['token']}"}
        )
        assert response_group.status_code == 201
        group_id = response_group.json()["id"]

        second_join_response = client.post(
            "/memberships/",
             json={
                "user_id": admin_user['id'], # user_id wird explizit gesendet
                "group_id": group_id
             },
            headers={"Authorization": f"Bearer {admin_user['token']}"}
        )
        assert second_join_response.status_code == 409, \
            f"Second join attempt should fail with 409 (Conflict), got {second_join_response.status_code}: {second_join_response.text}"