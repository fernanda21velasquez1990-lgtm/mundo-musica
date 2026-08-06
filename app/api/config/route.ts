import {
  NextResponse,
} from "next/server";

import {
  obtenerAppsScriptUrl,
} from "../../lib/mundo-config";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const url =
    await obtenerAppsScriptUrl();

  return NextResponse.json(
    {
      ok: true,
      configurada:
        Boolean(url),
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function POST() {
  /*
    La configuración técnica nunca se modifica desde
    la página pública.
  */
  return NextResponse.json(
    {
      ok: false,
      mensaje:
        "Configuración administrada por el servidor.",
    },
    {
      status: 403,
    }
  );
}
