// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UTApi, UTFile } from 'uploadthing/server';

export const runtime = 'nodejs'; // ⬅️ ganz wichtig

// Die UTApi-Instanz wird hier im Modul-Scope erstellt, aber NICHT exportiert.
// Sie ist weiterhin für die POST-Funktion in dieser Datei verfügbar.
const utapi = new UTApi();

export async function POST(req: NextRequest) {
  const logPrefix = '[upload-route]';
  try {
    console.log(`${logPrefix} 1️⃣  incoming request`);

    /* --------------------------------- STEP 1 -------------------------------- */
    const form = await req.formData();
    const fileField = form.get('file');
    console.log(
      `${logPrefix} 2️⃣  formData parsed – type:`,
      Object.prototype.toString.call(fileField)
    );

    if (!(fileField instanceof File)) {
      console.error(`${logPrefix} 2a 🚫 fileField is not File`, fileField);
      return NextResponse.json(
        { step: 'file-check', error: 'No file provided' },
        { status: 400 }
      );
    }

    /* --------------------------------- STEP 2 -------------------------------- */
    // Bei „Edge“ gäbe es hier kein Buffer -> deshalb runtime=nodejs
    const arrayBuffer = await fileField.arrayBuffer();
    const utFile = new UTFile([arrayBuffer], fileField.name, {
      type: fileField.type,
    });

    console.log(
      `${logPrefix} 3️⃣  UTFile created – name: ${utFile.name}, size: ${utFile.size}`
    );

    /* --------------------------------- STEP 3 -------------------------------- */
    // utapi ist hier immer noch verfügbar, da es im selben Modul definiert wurde.
    const resultArr = await utapi.uploadFiles([utFile]);
    const result = resultArr[0];

    console.log(`${logPrefix} 4️⃣  UTApi result`, result);

    if (result.error || !result.data) {
      console.error(
        `${logPrefix} 4a 🚫 UploadThing returned error`,
        result.error
      );
      return NextResponse.json(
        { step: 'utapi-upload', error: result.error ?? 'unknown' },
        { status: 500 }
      );
    }

    /* --------------------------------- STEP 4 -------------------------------- */
    const { url } = result.data;
    console.log(`${logPrefix} 5️⃣  success – url: ${url}`);
    return NextResponse.json({ url });
  } catch (err) {
    console.error(`${logPrefix} 6a 🚫 caught exception`, err);
    // Bei JSON.stringify auf Error aufpassen
    return NextResponse.json(
      {
        step: 'catch',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// Andere Handler (GET, PUT, etc.) oder Konfigurationen könnten hier folgen,
// aber keine anderen "beliebigen" Exporte.
