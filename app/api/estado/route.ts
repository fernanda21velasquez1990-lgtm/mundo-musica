import {
  NextResponse,
} from "next/server";

import {
  obtenerAppsScriptUrl,
} from "../../lib/mundo-config";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const appsScriptUrl =
    await obtenerAppsScriptUrl();

  return NextResponse.json(
    {
      ok: true,
      proyecto:
        "Mundo Música",
      appsScriptConfigurado:
        Boolean(
          appsScriptUrl
        ),
      entorno:
        process.env.VERCEL
          ? "VERCEL"
          : "LOCAL",
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
