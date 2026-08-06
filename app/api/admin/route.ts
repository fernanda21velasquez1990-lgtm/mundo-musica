import {
  NextResponse,
} from "next/server";

import {
  obtenerAppsScriptUrl,
} from "../../lib/mundo-config";

export const dynamic =
  "force-dynamic";

export async function POST(
  request: Request
) {
  try {
    const appsScriptUrl =
      await obtenerAppsScriptUrl();

    if (!appsScriptUrl) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El servicio de administración no está configurado.",
        },
        {
          status: 503,
        }
      );
    }

    const body =
      await request.json();

    const accion =
      String(
        body?.accion || ""
      ).trim();

    const token =
      String(
        body?.token || ""
      ).trim();

    if (!accion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Falta la acción administrativa.",
        },
        {
          status: 400,
        }
      );
    }

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Escribe tu PIN de administrador.",
        },
        {
          status: 401,
        }
      );
    }

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
            JSON.stringify(body),
          redirect: "follow",
          cache: "no-store",
        }
      );

    const texto =
      await respuesta.text();

    if (!respuesta.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No se pudo comunicar con el servicio.",
        },
        {
          status: 502,
        }
      );
    }

    try {
      const datos =
        JSON.parse(texto);

      const codigo =
        Number(
          datos?.codigo || 0
        );

      return NextResponse.json(
        datos,
        {
          status:
            codigo === 401
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
            "El servicio no devolvió una respuesta válida.",
        },
        {
          status: 502,
        }
      );
    }

  } catch (error) {
    console.error(
      "ADMIN API ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No se pudo conectar con el servicio.",
      },
      {
        status: 500,
      }
    );
  }
}
