import {
  NextResponse,
} from "next/server";

import {
  validarMembresiaRequest,
} from "../../../lib/membresia-server";

export const dynamic =
  "force-dynamic";

function valido(
  id: string
) {
  return /^[A-Za-z0-9_-]+$/.test(
    id
  );
}

function limpiar(
  nombre: string
) {
  return nombre
    .replace(
      /[\r\n"]/g,
      ""
    )
    .replace(
      /[<>:"/\\|?*]/g,
      "_"
    )
    .slice(
      0,
      180
    );
}

export async function GET(
  request: Request,
  context: {
    params:
      Promise<{
        id: string;
      }>;
  }
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

  const {
    id,
  } =
    await context.params;

  if (!valido(id)) {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "ID inválido.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    searchParams,
  } =
    new URL(
      request.url
    );

  const nombre =
    limpiar(
      searchParams.get(
        "name"
      ) ||
        "mundo-musica.mp3"
    );

  const url =
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;

  try {
    const r =
      await fetch(
        url,
        {
          redirect:
            "follow",
          cache:
            "no-store",
        }
      );

    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Drive no permitió descargar el archivo.",
          codigo:
            r.status,
        },
        {
          status:
            r.status,
        }
      );
    }

    const h =
      new Headers();

    h.set(
      "Content-Type",
      r.headers.get(
        "content-type"
      ) ||
        "audio/mpeg"
    );

    h.set(
      "Content-Disposition",
      `attachment; filename="${nombre}"`
    );

    h.set(
      "Cache-Control",
      "private, no-store"
    );

    const len =
      r.headers.get(
        "content-length"
      );

    if (len) {
      h.set(
        "Content-Length",
        len
      );
    }

    return new Response(
      r.body,
      {
        status: 200,
        headers: h,
      }
    );

  } catch {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No se pudo descargar.",
      },
      {
        status: 500,
      }
    );
  }
}
