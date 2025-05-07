// src/app/api/auth/login/route.ts
import { loginSchema } from '../../lib/schema';
import { authenticateUser } from '../../lib/userService';
import { NextResponse } from 'next/server'; // NextResponse importieren

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = loginSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        // NextResponse verwenden
        {
          error: 'Invalid input',
          details: parsed.error.flatten(),
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { email, password } = parsed.data;
    const result = await authenticateUser(email, password);

    if (!result || !result.token) {
      return NextResponse.json(
        // NextResponse verwenden
        { error: 'Incorrect email or password' }, // Konsistentere Fehlermeldung
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer', // Wie in Python
          },
        }
      );
    }

    // Erfolgreiche Authentifizierung
    // Anpassung der Antwortstruktur an Python: { access_token: string, token_type: "bearer" }
    // Das User-Objekt kann optional zusätzlich gesendet werden, wenn der Client es benötigt.
    // Python gibt nur den Token zurück.
    return NextResponse.json(
      // NextResponse verwenden
      {
        access_token: result.token,
        token_type: 'bearer',
        user: {
          // Optional: User-Daten weiterhin mitsenden, wenn gewünscht
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          is_active: result.user.isActive,
        },
      },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Login Error (RAW):', err);

    if (err instanceof Error) {
      console.error('Login Error (message):', err.message);
      console.error('Login Error (stack):', err.stack);
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: err instanceof Error ? err.message : 'Unknown',
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
