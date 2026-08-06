import {
  NextResponse,
} from "next/server";

import {
  guardarAppsScriptUrl,
  obtenerAppsScriptUrl,
} from "../../lib/mundo-config";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const url =
    await obtenerAppsScriptUrl();

  return NextResponse.json({
    ok: true,
    configurada:
      Boolean(url),
    url:
      process.env.MUNDO_MUSICA_APPS_SCRIPT_URL
        ? ""
        : url,
  });
}

export async function POST(
  request: Request
) {
  /*
    En producción (Vercel) la URL se configura mediante
    MUNDO_MUSICA_APPS_SCRIPT_URL y no se modifica desde
    el navegador.
  */
  if (
    String(
      process.env.MUNDO_MUSICA_APPS_SCRIPT_URL || ""
    ).trim()
  ) {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "La conexión está administrada por el servidor.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const b =
      await request.json();

    const url =
      String(
        b?.url || ""
      ).trim();

    if (
      !url.startsWith(
        "https://script.google.com/macros/s/"
      ) ||
      !url.endsWith(
        "/exec"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "URL inválida.",
        },
        {
          status: 400,
        }
      );
    }

    await guardarAppsScriptUrl(
      url
    );

    return NextResponse.json({
      ok: true,
    });

  } catch {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No se pudo guardar.",
      },
      {
        status: 500,
      }
    );
  }
}
