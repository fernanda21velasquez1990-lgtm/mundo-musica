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

    const body =
      await request.json();

    const cancion =
      String(
        body?.cancion || ""
      ).trim();

    const artista =
      String(
        body?.artista || ""
      ).trim();

    if (
      !cancion ||
      !artista
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Canción y artista son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    const r =
      await fetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "text/plain;charset=utf-8",
          },
          body:
            JSON.stringify({
              accion:
                "solicitarcancion",
              sesion:
                acceso.sesionRemota,
              nombreOyente:
                String(
                  body?.nombreOyente ||
                  acceso?.miembro?.nombre ||
                  ""
                ).trim(),
              cancion,
              artista,
              dedicatoria:
                String(
                  body?.dedicatoria || ""
                ).trim(),
              whatsapp:
                String(
                  body?.whatsapp ||
                  acceso?.miembro?.whatsapp ||
                  ""
                ).trim(),
            }),
          redirect: "follow",
          cache: "no-store",
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
          "No se pudo enviar la solicitud.",
      },
      {
        status: 500,
      }
    );
  }
}
