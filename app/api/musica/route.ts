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
        codigo: 401,
        mensaje:
          "Tu membresía no está activa.",
      },
      {
        status: 401,
      }
    );
  }

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

  try {
    const sep =
      url.includes("?")
        ? "&"
        : "?";

    const r =
      await fetch(
        `${url}${sep}accion=canciones&sesion=${encodeURIComponent(acceso.sesionRemota)}`,
        {
          cache: "no-store",
          redirect: "follow",
        }
      );

    const texto =
      await r.text();

    const datos =
      JSON.parse(
        texto
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
          "No se pudo conectar con Apps Script.",
      },
      {
        status: 500,
      }
    );
  }
}
