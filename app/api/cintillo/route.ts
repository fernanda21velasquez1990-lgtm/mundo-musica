import {
  NextResponse,
} from "next/server";

import {
  obtenerAppsScriptUrl,
} from "../../lib/mundo-config";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const url =
      await obtenerAppsScriptUrl();

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          visible: false,
          mensaje:
            "Mundo Música no está configurado.",
        },
        {
          status: 400,
        }
      );
    }

    const sep =
      url.includes("?")
        ? "&"
        : "?";

    const r =
      await fetch(
        `${url}${sep}accion=cintillo&t=${Date.now()}`,
        {
          cache: "no-store",
          redirect: "follow",
        }
      );

    const datos =
      JSON.parse(
        await r.text()
      );

    return NextResponse.json(
      datos,
      {
        status:
          datos?.ok
            ? 200
            : 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch (error) {
    console.error(
      "CINTILLO:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        visible: false,
      },
      {
        status: 500,
      }
    );
  }
}
