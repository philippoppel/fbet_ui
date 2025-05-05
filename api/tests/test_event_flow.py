# tests/test_event_flow.py

from uuid import uuid4
from datetime import date, timedelta # Wird für Mocking-Tests gebraucht
from requests.exceptions import ConnectionError # Wird für Mocking-Tests gebraucht

# Standard Optionen für Events in diesen Tests
DEFAULT_EVENT_OPTIONS = ["Option A", "Option B"]

class TestEventFlow:
    """Tests related to event creation and visibility within groups."""

    # Die Methode create_user_and_group wurde entfernt.
    # Die Tests verwenden jetzt Fixtures und den client direkt für das Setup.

    def test_admin_can_create_event_with_options(self, client, admin_user):
        """Tests if an admin can create a group and then an event within it."""
        admin_jwt = admin_user['token']

        # 1. Admin erstellt Gruppe
        group_name = f"EventGroup-{uuid4()}"
        response_group = client.post(
            "/groups/",
            json={"name": group_name, "description": "Event Test Group"},
            headers={"Authorization": f"Bearer {admin_jwt}"}
        )
        assert response_group.status_code == 201, f"Group creation failed: {response_group.text}"
        group_id = response_group.json()["id"]

        # 2. Admin erstellt Event in dieser Gruppe
        event_title = f"Event-{uuid4()}"
        event_options = ["Fury", "Usyk", "Unentschieden"]
        response_event = client.post(
            "/events/",
            json={
                "title": event_title,
                "description": "WM-Fight",
                "group_id": group_id,
                "question": "Wer gewinnt?",
                "options": event_options
            },
            headers={"Authorization": f"Bearer {admin_jwt}"}
        )
        assert response_event.status_code == 201, f"Event creation failed: {response_event.text}"
        event = response_event.json()
        assert event["title"] == event_title
        assert event["question"] == "Wer gewinnt?"
        assert "id" in event
        assert set(event["options"]) == set(event_options) # Set-Vergleich ist robust

    def test_event_visible_to_group_member(self, client, db_session, admin_user, regular_user):
        """Tests if a regular member can see an event in a group they joined."""
        admin_jwt = admin_user['token']
        member_jwt = regular_user['token']
        member_id = regular_user['id']

        # 1. Admin erstellt Gruppe
        group_name = f"VisibleEventGroup-{uuid4()}"
        response_group = client.post("/groups/", json={"name": group_name, "description": "Group for visibility test"}, headers={"Authorization": f"Bearer {admin_jwt}"})
        assert response_group.status_code == 201
        group_id = response_group.json()["id"]

        # 2. Admin erstellt Event
        event_title = f"Visible Event-{uuid4()}"
        response_create = client.post("/events/", json={"title": event_title, "description": "Test", "group_id": group_id, "question": "?", "options": DEFAULT_EVENT_OPTIONS}, headers={"Authorization": f"Bearer {admin_jwt}"})
        assert response_create.status_code == 201
        event_id = response_create.json()["id"]

        # 3. Normaler User tritt Gruppe bei
        response_join = client.post("/memberships/", json={"user_id": member_id, "group_id": group_id}, headers={"Authorization": f"Bearer {member_jwt}"})
        assert response_join.status_code == 201, f"Setup failed: User could not join group: {response_join.text}"

        # 4. Normaler User (jetzt Mitglied) ruft das Event ab
        response_get = client.get(f"/events/{event_id}", headers={"Authorization": f"Bearer {member_jwt}"})
        assert response_get.status_code == 200, f"Member could not get event: {response_get.text}"
        assert response_get.json()["title"] == event_title

    def test_event_hidden_for_non_members(self, client, admin_user, regular_user):
        """Tests if a user not in the group cannot see the event (gets 403)."""
        admin_jwt = admin_user['token']
        stranger_jwt = regular_user['token'] # regular_user ist hier der "Fremde"

        # 1. Admin erstellt Gruppe
        group_name = f"HiddenEventGroup-{uuid4()}"
        response_group = client.post("/groups/", json={"name": group_name, "description": "Group for hidden test"}, headers={"Authorization": f"Bearer {admin_jwt}"})
        assert response_group.status_code == 201
        group_id = response_group.json()["id"]

        # 2. Admin erstellt Event
        event_title = f"Hidden Event-{uuid4()}"
        response_create = client.post("/events/", json={"title": event_title, "description": "Test", "group_id": group_id, "question": "?", "options": DEFAULT_EVENT_OPTIONS}, headers={"Authorization": f"Bearer {admin_jwt}"})
        assert response_create.status_code == 201
        event_id = response_create.json()["id"]

        # 3. Fremder (regular_user) versucht, das Event abzurufen
        response_get = client.get(f"/events/{event_id}", headers={"Authorization": f"Bearer {stranger_jwt}"})
        assert response_get.status_code == 403 # Erwartet Forbidden

    def test_only_admin_can_create_event(self, client, db_session, admin_user, regular_user):
        """Tests that a regular member cannot create an event in the group (gets 403)."""
        admin_jwt = admin_user['token']
        member_jwt = regular_user['token']
        member_id = regular_user['id']

        # 1. Admin erstellt Gruppe
        group_name = f"AdminOnlyGroup-{uuid4()}"
        response_group = client.post("/groups/", json={"name": group_name, "description": "Admin creates events"}, headers={"Authorization": f"Bearer {admin_jwt}"})
        assert response_group.status_code == 201
        group_id = response_group.json()["id"]

        # 2. Normaler User tritt Gruppe bei
        response_join = client.post("/memberships/", json={"user_id": member_id, "group_id": group_id}, headers={"Authorization": f"Bearer {member_jwt}"})
        assert response_join.status_code == 201

        # 3. Normaler User versucht, ein Event zu erstellen
        response_create = client.post(
            "/events/",
            json={"title": "Member Event", "description": "Should fail", "group_id": group_id, "question": "?", "options": DEFAULT_EVENT_OPTIONS},
            headers={"Authorization": f"Bearer {member_jwt}"} # JWT des normalen Mitglieds
        )
        assert response_create.status_code == 403 # Erwartet Forbidden

    def test_missing_token_or_invalid_token(self, client):
        response = client.post("/events/", json={ "title": "Ohne Token", "description": "...", "group_id": 1, "question": "Wird das gehen?", "options": ["ja", "nein"] })
        assert response.status_code == 401
        response = client.post("/events/", json={ "title": "Falscher Token", "description": "...", "group_id": 1, "question": "Wird das gehen?", "options": ["ja", "nein"] }, headers={"Authorization": "Bearer wrong-token-or-invalid-jwt"})
        assert response.status_code == 401

    def test_get_boxing_schedule_success(self, client, mocker):
        mock_schedule_data = [{"date": "May 18", "location": "Riyadh, Saudi Arabia", "broadcaster": "ESPN+ PPV", "details": "Title fight: Tyson Fury vs. Oleksandr Usyk, 12 rounds, for Fury's WBC and Usyk's WBA, IBF and WBO heavyweight titles" }, {"date": "June 1", "location": "Riyadh, Saudi Arabia", "broadcaster": "DAZN", "details": "Artur Beterbiev vs. Dmitry Bivol, 12 rounds, for Beterbiev's WBC, IBF and WBO and Bivol's WBA light heavyweight titles" } ]
        mocker.patch('app.services.espn_scraper.fetch_and_parse_espn_boxing_schedule', return_value=mock_schedule_data)
        response = client.get("/events/external/boxing-schedule")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["details"] == "Title fight: Tyson Fury vs. Oleksandr Usyk, 12 rounds, for Fury's WBC and Usyk's WBA, IBF and WBO heavyweight titles"
        assert data[1]["broadcaster"] == "DAZN"
        for item in data: assert "date" in item; assert "location" in item; assert "broadcaster" in item; assert "details" in item

    def test_get_boxing_schedule_connection_error(self, client, mocker):
        mocker.patch('app.services.espn_scraper.fetch_and_parse_espn_boxing_schedule', side_effect=ConnectionError("Mocked connection timeout"))
        response = client.get("/events/external/boxing-schedule")
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "Could not fetch data from external source" in data["detail"]
        assert "Mocked connection timeout" in data["detail"]

    def test_get_boxing_schedule_runtime_error(self, client, mocker):
        mocker.patch('app.services.espn_scraper.fetch_and_parse_espn_boxing_schedule', side_effect=RuntimeError("Mocked parsing failed"))
        response = client.get("/events/external/boxing-schedule")
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "An internal error occurred during scraping process" in data["detail"]
        assert "Mocked parsing failed" in data["detail"]

    def test_get_ufc_schedule_success_with_filtering(self, client, mocker):
        today = date.today(); future_date_1 = (today + timedelta(days=10)).isoformat(); future_date_2 = (today + timedelta(days=30)).isoformat()
        mock_upcoming_ufc_data = [ {"summary": "UFC Fight Night: Future Event 1", "location": "APEX, Las Vegas", "description": "Main Event: Fighter A vs Fighter B", "uid": "ufc-event-future-1", "dtstart": f"{future_date_1}T02:00:00", "dtend": f"{future_date_1}T05:00:00"}, {"summary": "UFC 3xx: Another Future Event", "location": "T-Mobile Arena, Las Vegas", "description": "Championship Bout", "uid": "ufc-event-future-2", "dtstart": future_date_2, "dtend": None} ]
        mocker.patch('app.services.ufc_calendar.fetch_and_parse_ufc_schedule', return_value=mock_upcoming_ufc_data)
        response = client.get("/events/external/ufc-schedule")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == len(mock_upcoming_ufc_data)
        assert data[0]["summary"] == "UFC Fight Night: Future Event 1"; assert data[1]["uid"] == "ufc-event-future-2"
        assert data[0]["dtstart"].startswith(future_date_1); assert data[1]["dtstart"].startswith(future_date_2)
        for key in ["summary", "location", "description", "uid", "dtstart", "dtend"]: assert key in data[0]

    def test_get_ufc_schedule_connection_error(self, client, mocker):
        mocker.patch('app.services.ufc_calendar.fetch_and_parse_ufc_schedule', side_effect=ConnectionError("Mocked UFC ICS connection failed"))
        response = client.get("/events/external/ufc-schedule")
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "Could not fetch data from external source (UFC Calendar)" in data["detail"]
        assert "Mocked UFC ICS connection failed" in data["detail"]

    def test_get_ufc_schedule_runtime_error(self, client, mocker):
        mocker.patch('app.services.ufc_calendar.fetch_and_parse_ufc_schedule', side_effect=RuntimeError("Mocked UFC ICS parsing error"))
        response = client.get("/events/external/ufc-schedule")
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "An internal error occurred during UFC calendar processing" in data["detail"]
        assert "Mocked UFC ICS parsing error" in data["detail"]