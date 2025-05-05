# api/index.py
# Importiert die FastAPI App aus Ihrem Code
from app.main import app

# Vercel erkennt die ASGI 'app' Variable und dient sie.
# Wichtig: Die Variable muss 'app' heißen für automatische Erkennung.