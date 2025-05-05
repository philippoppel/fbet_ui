# app/services/ufc_calendar.py

import requests
import logging
from icalendar import Calendar
from datetime import date, datetime, timezone # timezone hinzufügen
from typing import List, Dict, Optional

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# URL und Header
UFC_ICS_URL = "https://raw.githubusercontent.com/clarencechaan/ufc-cal/ics/UFC.ics"
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
REQUEST_TIMEOUT = 20

def parse_and_filter_ufc_events(ics_content: str) -> List[Dict[str, Optional[str]]]:
    """
    Parst einen iCalendar (.ics) String, filtert nach zukünftigen Events
    und gibt sie als Liste von Dictionaries zurück.
    """
    events_list = []
    today = date.today() # Heutiges Datum für den Vergleich holen

    try:
        cal = Calendar.from_ical(ics_content)

        for component in cal.walk():
            if component.name == "VEVENT":
                dtstart_obj = component.get('dtstart')

                # --- Filterung nach Datum ---
                event_date: Optional[date] = None
                if dtstart_obj and hasattr(dtstart_obj, 'dt'):
                    # Prüfen, ob dt ein date oder datetime Objekt ist
                    if isinstance(dtstart_obj.dt, datetime):
                        # Wenn es datetime ist, nur das Datum für den Vergleich nehmen
                        # Beachte: Timezone-naive oder -aware Behandlung kann hier wichtig sein.
                        # Für einen einfachen Zukunfts-Check reicht oft der Vergleich der Datumsteile.
                        # Sicherer wäre es, alles in UTC zu konvertieren, wenn Zeitzonen vorhanden sind.
                        # Hier gehen wir von einem einfachen Vergleich des Datums aus.
                        event_date = dtstart_obj.dt.date()
                    elif isinstance(dtstart_obj.dt, date):
                        event_date = dtstart_obj.dt
                    else:
                        logger.warning(f"Unbekannter Typ für dtstart.dt: {type(dtstart_obj.dt)}")
                        continue # Nicht verarbeitbares Datum

                    # Event nur hinzufügen, wenn es heute oder in der Zukunft liegt
                    if event_date < today:
                        continue # Überspringe vergangene Events
                else:
                    logger.warning("Event ohne gültiges Startdatum (dtstart) gefunden, wird übersprungen.")
                    continue # Überspringe Events ohne Startdatum

                # --- Extraktion der Daten (nur für zukünftige Events) ---
                event_data = {}
                summary = component.get('summary')
                dtend = component.get('dtend')
                location = component.get('location')
                description = component.get('description')
                uid = component.get('uid')

                event_data['summary'] = str(summary) if summary else None
                event_data['location'] = str(location) if location else None
                event_data['description'] = str(description) if description else None
                event_data['uid'] = str(uid) if uid else None
                event_data['dtstart'] = dtstart_obj.dt.isoformat() # Immer isoformat verwenden

                if dtend and hasattr(dtend, 'dt'):
                    if isinstance(dtend.dt, (datetime, date)):
                        event_data['dtend'] = dtend.dt.isoformat()
                    else:
                        event_data['dtend'] = str(dtend.dt) # Fallback
                else:
                    event_data['dtend'] = None

                events_list.append(event_data)

    except Exception as e:
        logger.error(f"Fehler beim Parsen des ICS Inhalts: {e}", exc_info=True)
        # Optional: Hier eine spezifischere Exception werfen, die im Router gefangen wird
        raise RuntimeError(f"Fehler beim Parsen des ICS: {e}")

    # Optional: Sortieren nach Startdatum
    events_list.sort(key=lambda x: x.get('dtstart') or '')

    return events_list

def fetch_and_parse_ufc_schedule() -> List[Dict[str, Optional[str]]]:
    """
    Ruft den UFC iCalendar ab, parst ihn und filtert nach zukünftigen Events.
    Löst eine Exception bei Abruf- oder schweren Parsing-Fehlern.
    """
    logger.info(f"Rufe ICS von {UFC_ICS_URL} ab...")
    ics_content_str = ""
    try:
        response = requests.get(UFC_ICS_URL, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        ics_content_str = response.text # Inhalt als Text
        logger.info("ICS erfolgreich abgerufen.")

        logger.info("Starte Parsing und Filterung...")
        parsed_events = parse_and_filter_ufc_events(ics_content_str)
        logger.info(f"Parsing abgeschlossen, {len(parsed_events)} zukünftige Events gefunden.")
        return parsed_events

    except requests.exceptions.Timeout:
        logger.error(f"Zeitüberschreitung beim Abrufen von {UFC_ICS_URL}")
        raise ConnectionError(f"Timeout fetching data from {UFC_ICS_URL}")
    except requests.exceptions.HTTPError as http_err:
        logger.error(f"HTTP-Fehler beim Abrufen von {UFC_ICS_URL}: {http_err}")
        raise ConnectionError(f"HTTP error fetching data from {UFC_ICS_URL}: {http_err.response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Problem beim Abrufen der URL {UFC_ICS_URL}: {e}")
        raise ConnectionError(f"Network error fetching data from {UFC_ICS_URL}: {e}")
    except RuntimeError as e: # Fängt den Parsing-Fehler von oben
         logger.error(f"Fehler bei der ICS-Verarbeitung: {e}", exc_info=True)
         raise e # Gib den Runtime Error weiter
    except Exception as e:
        logger.error(f"Unerwarteter Fehler während des Fetch/Parse Vorgangs für UFC Kalender: {e}", exc_info=True)
        raise RuntimeError(f"An unexpected error occurred during UFC calendar processing: {e}")