// server.js
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Prüft, ob wir im Entwicklungsmodus sind (wichtig für Next.js)
const dev = process.env.NODE_ENV !== 'production';
// Initialisiert die Next.js App
const app = next({ dev });
// Holt den Request-Handler von Next.js
const handle = app.getRequestHandler();

// Port für den Server
const port = 3000;

// HTTPS Konfiguration mit den mkcert Zertifikaten
// Stelle sicher, dass diese Dateinamen mit den von mkcert erstellten übereinstimmen!
const httpsOptions = {
  key: fs.readFileSync(path.resolve('./192.168.178.148+3-key.pem')),
  cert: fs.readFileSync(path.resolve('./192.168.178.148+3.pem')),
};

// Bereitet die Next.js App vor und startet dann den HTTPS Server
app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    // Übergibt alle Anfragen an den Next.js Handler
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    // Loggt die Adresse, unter der der Server erreichbar ist
    console.log(`> Ready on https://localhost:${port}`);
    console.log(`> Also ready on https://192.168.178.148:${port}`); // Deine IP
  });
});
