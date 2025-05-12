// src/app/api/generate-ai-bet/route.ts

import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { context } = await req.json();

    // Verwende einen Standardkontext, falls keiner übergeben wird
    const Ctx = context || 'eine lustige Wette für unsere Freundesgruppe';

    console.log('[generate-ai-bet] Kontext erhalten:', Ctx);

    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192', // Oder ein anderes Modell deiner Wahl
      messages: [
        {
          role: 'system', // Optional: Eine System-Nachricht kann helfen, den Kontext besser zu setzen
          content:
            'Du bist ein kreativer Assistent, der lustige und ungewöhnliche Wettideen für Freundesgruppen auf Deutsch generiert. Halte dich strikt an das vorgegebene Ausgabeformat.',
        },
        {
          role: 'user',
          content: `Erfinde eine kreative, lustige Wette auf Deutsch für eine Freundesgruppe. Kontext: "${Ctx}".
Gib die Antwort **nur** in diesem exakten Format zurück, ohne zusätzliche Erklärungen, Einleitungen oder Markdown (außer für die Feldnamen selbst):

Titel: [Formuliere hier die Wettfrage, z.B. "Wie oft wird diese Woche bei Lieferando bestellt?"]
Beschreibung: [Erkläre hier kurz die Regeln oder Details der Wette, z.B. "Gezählt werden alle Bestellungen der Gruppe von Mo-So."]
Optionen:
[Antwortmöglichkeit 1, passend zur Frage im Titel, z.B. "0-2 Mal"]
[Antwortmöglichkeit 2, passend zur Frage im Titel, z.B. "3-4 Mal"]
[Antwortmöglichkeit 3, passend zur Frage im Titel, z.B. "5+ Mal"]

WICHTIG:
1. Stelle sicher, dass die Optionen direkt zur Frage im Titel passen und mindestens zwei Optionen vorhanden sind.
2. Die 'Optionen' müssen die Frage im 'Titel' **direkt** beantworten. (Wenn der Titel nach einer Anzahl fragt, müssen die Optionen Anzahlen sein. Wenn der Titel nach Ja/Nein fragt, müssen die Optionen Ja/Nein sein etc.).
3. Bevorzuge Fragen, bei denen die Antworten Zahlen, Häufigkeiten oder einfache, kurze Auswahlmöglichkeiten sind (z.B. "Wie oft...", "Wie viele...", "Ja/Nein", "A/B/C"). Vermeide offene "Wer"-Fragen, wenn möglich.`,
        },
      ],
      temperature: 0.8, // Etwas höher für mehr Kreativität, aber nicht zu hoch, um das Format zu wahren
      // max_tokens: 150, // Optional: Begrenze die Antwortlänge
    });

    const message = response.choices?.[0]?.message?.content;
    console.log('[generate-ai-bet] Antwort erhalten:', message);

    if (
      !message ||
      !message.includes('Titel:') ||
      !message.includes('Optionen:')
    ) {
      console.error(
        '[generate-ai-bet] Ungültige oder leere Antwort von Groq oder Format nicht erkannt.'
      );
      // Gib eine spezifischere Fehlermeldung zurück
      return NextResponse.json(
        {
          error:
            'Keine gültige Antwort von der AI erhalten oder das Format wurde nicht erkannt.',
        },
        { status: 502 } // 502 Bad Gateway könnte passen
      );
    }

    // Optional: Zusätzliche Validierung, ob die Struktur grob passt
    // const lines = message.split('\n');
    // const titleLine = lines.find(l => l.startsWith('Titel:'));
    // const optionsIndex = lines.findIndex(l => l.startsWith('Optionen:'));
    // if (!titleLine || optionsIndex === -1 || lines.length <= optionsIndex + 1) {
    //   console.error('[generate-ai-bet] Detailliertere Formatprüfung fehlgeschlagen.');
    //   return NextResponse.json({ error: 'AI-Antwort entspricht nicht dem erwarteten Detailformat.' }, { status: 502 });
    // }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('[generate-ai-bet] Fehler im API-Handler:', error);
    // Logge den spezifischen Fehler, wenn möglich
    const errorMessage = error.message || 'Interner Serverfehler.';
    return NextResponse.json(
      { error: `Interner Serverfehler: ${errorMessage}. Siehe Server-Logs.` },
      { status: 500 }
    );
  }
}
