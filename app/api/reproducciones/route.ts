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
    const appsScriptUrl =
      await obtenerAppsScriptUrl();

    if (!appsScriptUrl) {
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

    const id =
      String(
        body?.id || ""
      ).trim();

    let cantidad =
      Number(
        body?.cantidad || 1
      );

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Falta el ID de la canción.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        cantidad
      ) ||
      cantidad < 1
    ) {
      cantidad = 1;
    }

    cantidad =
      Math.min(
        Math.floor(
          cantidad
        ),
        100
      );

    const respuesta =
      await fetch(
        appsScriptUrl,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "text/plain;charset=utf-8",
          },
          body:
            JSON.stringify({
              accion:
                "registrarreproduccion",
              id,
              cantidad,
              sesion:
                acceso.sesionRemota,
            }),
          redirect: "follow",
          cache: "no-store",
        }
      );

    const datos =
      JSON.parse(
        await respuesta.text()
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
          "No se pudo registrar la reproducción.",
      },
      {
        status: 500,
      }
    );
  }
}
