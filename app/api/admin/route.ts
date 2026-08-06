import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const configPath = path.join(
  process.cwd(),
  ".mundomusica-config.json"
);

async function obtenerAppsScriptUrl() {
  try {
    const texto = await fs.readFile(
      configPath,
      "utf8"
    );

    const config = JSON.parse(texto);

    return String(
      config?.appsScriptUrl || ""
    ).trim();
  } catch {
    return "";
  }
}

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
            "Mundo Música no tiene configurada la URL de Apps Script.",
        },
        {
          status: 400,
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
            "Falta la clave del panel.",
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
            `Apps Script respondió ${respuesta.status}.`,
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
            "Apps Script no devolvió una respuesta JSON válida.",
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
          "No se pudo conectar con Apps Script.",
      },
      {
        status: 500,
      }
    );
  }
}
