import {
  NextResponse,
} from "next/server";

import {
  obtenerAppsScriptUrl,
} from "../../lib/mundo-config";

import {
  validarMembresiaRequest,
} from "../../lib/membresia-server";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: Request
) {
  const acceso =
    await validarMembresiaRequest(
      request
    );

  if (!acceso.ok) {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Membresía requerida.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const url =
      await obtenerAppsScriptUrl();

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
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
        `${url}${sep}accion=programacionradio&sesion=${encodeURIComponent(acceso.sesionRemota)}&t=${Date.now()}`,
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
          datos?.codigo === 401
            ? 401
            : datos?.ok
            ? 200
            : 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No se pudo cargar la programación de Radio.",
      },
      {
        status: 500,
      }
    );
  }
}
