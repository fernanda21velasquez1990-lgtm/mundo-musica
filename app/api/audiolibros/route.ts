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

  const base =
    await obtenerAppsScriptUrl();

  if (!base) {
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
      base.includes("?")
        ? "&"
        : "?";

    const r =
      await fetch(
        `${base}${sep}accion=audiolibros&sesion=${encodeURIComponent(acceso.sesionRemota)}&t=${Date.now()}`,
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
      }
    );

  } catch {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No se pudieron cargar los audiolibros.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
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

  const base =
    await obtenerAppsScriptUrl();

  if (!base) {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 400,
      }
    );
  }

  try {
    const body =
      await request.json();

    const r =
      await fetch(
        base,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "text/plain;charset=utf-8",
          },
          body:
            JSON.stringify({
              accion:
                "registrarreproduccionaudiolibro",
              id:
                String(
                  body?.id || ""
                ).trim(),
              sesion:
                acceso.sesionRemota,
            }),
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
      }
    );

  } catch {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No se pudo registrar.",
      },
      {
        status: 500,
      }
    );
  }
}
