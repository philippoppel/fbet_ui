# init_db.py

import logging
from app.database import engine, Base
# Stelle sicher, dass ALLE deine Model-Dateien hier importiert werden!
from app.models import user, group, group_membership, event, tip # <--- tip hinzugefügt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("Datenbank wird zurückgesetzt und Tabellen neu erstellt...")

try:
    # 🧨 Vorsicht: drop_all löscht alle Tabellen, die in den importierten
    # Modellen definiert sind, und alle darin enthaltenen Daten!
    # Nur für Entwicklung/Tests verwenden oder wenn du sicher bist,
    # dass du alle Daten verlieren willst.
    logger.warning("LÖSCHE alle existierenden Tabellen (drop_all)...")
    Base.metadata.drop_all(bind=engine)
    logger.info("Existierende Tabellen gelöscht.")

    # Erstellt alle Tabellen basierend auf den importierten Modellen
    logger.info("Erstelle neue Tabellen (create_all)...")
    Base.metadata.create_all(bind=engine)
    logger.info("Neue Tabellen erfolgreich erstellt.")

except Exception as e:
    logger.error(f"Fehler während des Datenbank-Resets: {e}", exc_info=True)
    raise # Fehler weitergeben, damit das Skript abbricht

logger.info("Datenbank-Reset abgeschlossen.")