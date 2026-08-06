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

export async function GET(
  request: Request,
  context: {
    params:
      Promise<{
        id: string;
      }>;
  }
) {
  /*
    IMPORTANTE:
    Los reproductores HTML hacen varias peticiones Range
    mientras reproducen un MP3.

    Antes validábamos la membresía contra Apps Script en
    CADA fragmento de audio. Eso podía bloquear o retrasar
    biblioteca, radio y audiolibros.

    Aquí solo comprobamos que el navegador tenga la sesión
    HttpOnly creada al iniciar sesión. La membresía completa
    sigue validándose en /api/acceso y en las APIs de datos.
  */
  const acceso =
    await validarMembresiaRequest(
      request
    );

  if (!acceso.ok) {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Debes iniciar sesión para escuchar.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store",
        },
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

  const range =
    request.headers.get(
      "range"
    );

  const url =
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;

  try {
    const headers:
      HeadersInit = {};

    if (range) {
      headers["Range"] =
        range;
    }

    const respuesta =
      await fetch(
        url,
        {
          headers,
          redirect:
            "follow",
          cache:
            "no-store",
        }
      );

    if (
      !respuesta.ok &&
      respuesta.status !== 206
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Google Drive no permitió abrir el audio.",
          codigo:
            respuesta.status,
        },
        {
          status:
            respuesta.status,
        }
      );
    }

    const h =
      new Headers();

    h.set(
      "Content-Type",
      respuesta.headers.get(
        "content-type"
      ) ||
        "audio/mpeg"
    );

    h.set(
      "Accept-Ranges",
      "bytes"
    );

    h.set(
      "Cache-Control",
      "private, no-store"
    );

    const len =
      respuesta.headers.get(
        "content-length"
      );

    const contentRange =
      respuesta.headers.get(
        "content-range"
      );

    if (len) {
      h.set(
        "Content-Length",
        len
      );
    }

    if (contentRange) {
      h.set(
        "Content-Range",
        contentRange
      );
    }

    return new Response(
      respuesta.body,
      {
        status:
          respuesta.status,
        headers:
          h,
      }
    );

  } catch (error) {
    console.error(
      "AUDIO PROXY:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No se pudo cargar el audio.",
      },
      {
        status: 500,
      }
    );
  }
}
