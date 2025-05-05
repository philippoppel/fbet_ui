# app/services/espn_scraper.py

import requests
from bs4 import BeautifulSoup
import logging
from typing import List, Dict, Optional

# Konfiguration für Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ESPN Boxing Schedule URL und Header
ESPN_BOXING_URL = "https://www.espn.com/boxing/story/_/id/12508267/boxing-schedule"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
REQUEST_TIMEOUT = 20  # Erhöhtes Timeout


def parse_key_dates(html: str) -> List[Dict[str, Optional[str]]]:
    """
    Parst die "Key dates" aus dem gegebenen HTML und gibt sie als Liste von Dictionaries zurück.
    """
    soup = BeautifulSoup(html, 'html.parser')
    key_dates_data = []

    # Suche nach einer H2-Überschrift, die "key dates" enthält (case-insensitive)
    key_dates_heading = soup.find(['h2', 'h3'], string=lambda
        text: text and 'key dates' in text.lower())  # H3 hinzugefügt als Fallback

    if not key_dates_heading:
        logger.warning("Überschrift 'Key dates:' nicht im HTML gefunden.")
        return []

    # Finde die nächste <ul> Liste als Geschwister-Element der Überschrift
    # Gehe durch Geschwister, falls es nicht direkt das nächste ist
    element = key_dates_heading.find_next_sibling()
    key_dates_list = None
    while element:
        if element.name == 'ul':
            key_dates_list = element
            break
        element = element.find_next_sibling()

    if not key_dates_list:
        logger.warning("Konnte keine <ul> Liste nach der Überschrift 'Key dates:' finden.")
        return []

    # Iteriere durch alle Listeneinträge <li>
    for item in key_dates_list.find_all('li'):
        try:
            p_tag = item.find('p')
            if not p_tag:
                continue

            b_tag = p_tag.find('b')
            if not b_tag:
                # Manchmal ist der Text direkt im p-Tag ohne b-Tag
                raw_text = p_tag.get_text(strip=True)
                separator = ' -- '
                if separator not in raw_text:
                    logger.debug(f"Eintrag ohne '<b>' und ' -- ' übersprungen: {raw_text}")
                    continue

                # Versuche, Datum/Ort/Broadcaster vor ' -- ' zu extrahieren
                header_part, details = raw_text.split(separator, 1)
                details = details.strip()

                date_str, location_str, broadcaster_str = None, None, None
                parts = header_part.split(':', 1)
                if len(parts) == 2:
                    date_str = parts[0].strip()
                    location_part = parts[1].strip()
                    if '(' in location_part and location_part.endswith(')'):
                        last_paren_index = location_part.rfind('(')
                        location_str = location_part[:last_paren_index].strip()
                        broadcaster_str = location_part[last_paren_index + 1:-1].strip()
                    else:
                        location_str = location_part
                else:
                    # Fallback, wenn ':' nicht gefunden wird (z.B. nur Datum)
                    date_str = header_part.strip()
                    location_str = None  # Annahme: Kein Ort/Sender angegeben

            else:
                # Extrahiere Datum, Ort und Sender aus dem <b>-Tag
                date_location_raw = b_tag.get_text(strip=True)
                date_str, location_str, broadcaster_str = None, None, None

                parts = date_location_raw.split(':', 1)
                if len(parts) == 2:
                    date_str = parts[0].strip()
                    location_part = parts[1].strip()
                    # Suche nach Klammern für den Broadcaster am Ende
                    if '(' in location_part and location_part.endswith(')'):
                        last_paren_index = location_part.rfind('(')
                        location_str = location_part[:last_paren_index].strip()
                        broadcaster_str = location_part[last_paren_index + 1:-1].strip()
                    else:
                        location_str = location_part
                        # Broadcaster könnte auch ohne Klammern da sein, aber das ist weniger wahrscheinlich
                else:
                    # Fallback, wenn ':' fehlt (z.B. nur Datum)
                    date_str = date_location_raw
                    location_str = None  # Annahme: Kein Ort/Sender angegeben
                    logger.warning(f"Konnte Datum und Ort/Sender nicht eindeutig trennen in: '{date_location_raw}'")

                # Extrahiere die Details nach " -- "
                full_p_text = p_tag.get_text()
                details = None
                separator = ' -- '
                if separator in full_p_text:
                    # Finde den Separator *nach* dem Inhalt des b-Tags
                    b_content_text = b_tag.get_text()
                    try:
                        b_content_index = full_p_text.index(b_content_text)
                        b_content_len = len(b_content_text)
                        details_start_index = full_p_text.find(separator, b_content_index + b_content_len)
                        if details_start_index != -1:
                            details = full_p_text[details_start_index + len(separator):].strip()
                        else:
                            # Manchmal steht der Detailtext direkt nach dem b-Tag ohne Separator
                            potential_details = full_p_text[b_content_index + b_content_len:].strip()
                            if potential_details:
                                details = potential_details
                                logger.debug(f"Details ohne '--' gefunden für: {date_location_raw}")

                    except ValueError:
                        # Fallback wenn b_content_text nicht exakt gefunden wird (selten)
                        details_start_index = full_p_text.find(separator)
                        if details_start_index != -1:
                            details = full_p_text[details_start_index + len(separator):].strip()

            if date_str and details:
                key_dates_data.append({
                    "date": date_str,
                    "location": location_str,
                    "broadcaster": broadcaster_str,
                    "details": details
                })
            else:
                # Nur loggen, wenn ein wesentlicher Teil fehlt
                if p_tag:  # Zumindest p_tag sollte existieren
                    logger.warning(
                        f"Eintrag nicht vollständig geparst (Datum/Details fehlen): {item.get_text(strip=True)}")


        except Exception as e:
            logger.error(f"Unerwarteter Fehler beim Verarbeiten des Eintrags '{item.get_text(strip=True)}': {e}",
                         exc_info=True)
            continue  # Zum nächsten <li> übergehen

    return key_dates_data


def fetch_and_parse_espn_boxing_schedule() -> List[Dict[str, Optional[str]]]:
    """
    Ruft die ESPN Boxing Schedule Seite ab, parst die Key Dates und gibt sie zurück.
    Löst eine Exception bei Abruf- oder schweren Parsing-Fehlern.
    """
    logger.info(f"Rufe HTML von {ESPN_BOXING_URL} ab...")
    try:
        response = requests.get(ESPN_BOXING_URL, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()  # Fehler bei HTTP-Statuscodes wie 404 oder 500 auslösen
        html_to_parse = response.text
        logger.info("HTML erfolgreich abgerufen.")

        logger.info("Starte Parsing...")
        parsed_data = parse_key_dates(html_to_parse)
        if not parsed_data:
            logger.warning("Keine Key Dates zum Parsen gefunden oder Parsing-Fehler aufgetreten.")
        logger.info(f"Parsing abgeschlossen, {len(parsed_data)} Einträge gefunden.")
        return parsed_data

    except requests.exceptions.Timeout:
        logger.error(f"Zeitüberschreitung beim Abrufen von {ESPN_BOXING_URL}")
        raise ConnectionError(f"Timeout fetching data from {ESPN_BOXING_URL}")
    except requests.exceptions.HTTPError as http_err:
        logger.error(f"HTTP-Fehler beim Abrufen von {ESPN_BOXING_URL}: {http_err}")
        raise ConnectionError(f"HTTP error fetching data from {ESPN_BOXING_URL}: {http_err.response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Problem beim Abrufen der URL {ESPN_BOXING_URL}: {e}")
        raise ConnectionError(f"Network error fetching data from {ESPN_BOXING_URL}: {e}")
    except Exception as e:
        logger.error(f"Unerwarteter Fehler während des Fetch/Parse Vorgangs: {e}", exc_info=True)
        raise RuntimeError(f"An unexpected error occurred during scraping: {e}")