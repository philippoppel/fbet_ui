// src/app/api/auth/register/route.ts
import { userCreateSchema } from '../../lib/schema'; // Pfad relativ zu route.ts (also zu src/app/api/lib/schema.ts)
import { createUser } from '../../lib/userService'; // Pfad relativ zu route.ts (also zu src/app/api/lib/userService.ts)

export async function POST(req: Request) {
  // Funktion explizit POST nennen
  // Die req.method !== 'POST' Prüfung ist nicht mehr nötig,
  // da diese Funktion nur für POST-Requests an /api/users aufgerufen wird.

  try {
    // Die Debug-Logs können Sie hier vorerst entfernen oder beibehalten,
    // aber das Kernproblem war das falsche Request-Objekt aufgrund des falschen Speicherorts/Dateinamens.
    // Mit route.ts in src/app/api/... und runtime='edge' sollte req ein Fetch API Request sein.

    const json = await req.json(); // Sollte jetzt funktionieren, wenn der Client JSON sendet
    const parsed = userCreateSchema.safeParse(json);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: parsed.error.flatten(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { email, name, password } = parsed.data;
    const user = await createUser(email, name ?? null, password);

    return new Response(JSON.stringify(user), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in POST /api/users:', err);
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown server error';
    // Stellen Sie sicher, dass die Fehlermeldung JSON-konform ist
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Sie könnten hier auch andere HTTP-Methoden für /api/users definieren:
// export async function GET(req: Request) {
//   // Logik für GET /api/users
//   return new Response(JSON.stringify({ message: 'GET request to /api/users' }), { status: 200 });
// }
