import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
  obtenerAppsScriptUrl,
} from "./mundo-config";

export const COOKIE_MEMBRESIA =
  "mundo_musica_sesion";

export const COOKIE_MEMBRESIA_FALLBACK =
  "mundo_musica_sesion_cliente";

export type MiembroSesion = {
  id: string;
  nombre: string;
  whatsapp: string;
  plan: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  estado?: string;
  estadoAcceso?: string;
  accesos?: number;
};

export type TokenLocalValido = {
  ok: true;
  codigo: 200;
  miembro: MiembroSesion;
  expira: number;
  sesionRemota: string;
  token: string;
};

export type TokenLocalInvalido = {
  ok: false;
  codigo: number;
  mensaje: string;
};

export type TokenLocalResultado =
  | TokenLocalValido
  | TokenLocalInvalido;

export type MembresiaRequestValida =
  TokenLocalValido & {
    sesion: string;
  };

export type MembresiaRequestInvalida =
  TokenLocalInvalido & {
    sesion: string;
  };

export type MembresiaRequestResultado =
  | MembresiaRequestValida
  | MembresiaRequestInvalida;

type PayloadSesion = {
  miembro: MiembroSesion;
  exp: number;
  sesionRemota: string;
};

function base64Url(
  texto: string
) {
  return Buffer
    .from(
      texto,
      "utf8"
    )
    .toString(
      "base64url"
    );
}

function leerBase64Url(
  texto: string
) {
  return Buffer
    .from(
      texto,
      "base64url"
    )
    .toString(
      "utf8"
    );
}

async function secretoLocal() {
  /*
    Derivamos una clave estable del backend configurado.
    No se envía al navegador.
    En Vercel también puede fijarse MUNDO_MUSICA_SESSION_SECRET.
  */
  const env =
    String(
      process.env.MUNDO_MUSICA_SESSION_SECRET || ""
    ).trim();

  if (env) {
    return env;
  }

  const url =
    await obtenerAppsScriptUrl();

  return createHash(
    "sha256"
  )
    .update(
      `MUNDO-MUSICA|SESION-V2|${url}`
    )
    .digest(
      "hex"
    );
}

async function firma(
  payload: string
) {
  return createHmac(
    "sha256",
    await secretoLocal()
  )
    .update(
      payload
    )
    .digest(
      "base64url"
    );
}

export async function crearSesionLocal(
  miembro: MiembroSesion,
  expiraOpcional?: number | null,
  sesionRemota = ""
) {
  const ahora =
    Date.now();

  let expira =
    Number(
      expiraOpcional || 0
    );

  if (
    !Number.isFinite(
      expira
    ) ||
    expira <= ahora
  ) {
    expira =
      ahora +
      30 *
      24 *
      60 *
      60 *
      1000;
  }

  /*
    Como protección adicional, si la ficha trae fecha
    de vencimiento limitamos la cookie a esa fecha.
  */
  if (
    miembro.fechaVencimiento
  ) {
    const limite =
      new Date(
        `${miembro.fechaVencimiento}T23:59:59`
      ).getTime();

    if (
      Number.isFinite(
        limite
      ) &&
      limite > ahora
    ) {
      expira =
        Math.min(
          expira,
          limite
        );
    }
  }

  const payloadObj:
    PayloadSesion = {
      miembro,
      exp:
        expira,
      sesionRemota:
        String(
          sesionRemota || ""
        ).trim(),
    };

  const payload =
    base64Url(
      JSON.stringify(
        payloadObj
      )
    );

  const sig =
    await firma(
      payload
    );

  return {
    token:
      `${payload}.${sig}`,
    expira,
  };
}

export function obtenerSesionDeRequest(
  request: Request
) {

  /*
    FASE 6I:
    La sesión principal llega explícitamente desde el navegador.
    No dependemos de cookies.
  */

  const header =
    String(
      request.headers.get(
        "x-mundo-musica-session"
      ) || ""
    )
    .trim();


  if (header) {
    return header;
  }


  try {

    const url =
      new URL(
        request.url
      );


    const query =
      String(
        url.searchParams.get(
          "session"
        ) || ""
      )
      .trim();


    if (query) {
      return query;
    }

  } catch {
    // Nada.
  }


  /*
    Compatibilidad temporal con instalaciones anteriores.
  */
  const cookie =
    request.headers.get(
      "cookie"
    ) || "";


  const nombres = [
    COOKIE_MEMBRESIA,
    COOKIE_MEMBRESIA_FALLBACK
  ];


  for (
    const nombre
    of nombres
  ) {

    const prefijo =
      `${nombre}=`;


    const encontrado =
      cookie
        .split(";")
        .map(
          (x) =>
            x.trim()
        )
        .find(
          (x) =>
            x.startsWith(
              prefijo
            )
        );


    if (
      encontrado
    ) {

      try {
        return decodeURIComponent(
          encontrado.slice(
            prefijo.length
          )
        );
      } catch {
        return "";
      }

    }

  }


  return "";

}


export async function validarTokenLocal(
  token: string
): Promise<TokenLocalResultado> {
  try {
    const partes =
      String(
        token || ""
      )
      .trim()
      .split(
        "."
      );

    if (
      partes.length !== 2
    ) {
      return {
        ok: false,
        codigo: 401,
        mensaje:
          "Sesión inválida.",
      };
    }

    const payload =
      partes[0];

    const recibida =
      partes[1];

    const esperada =
      await firma(
        payload
      );

    const a =
      Buffer.from(
        recibida
      );

    const b =
      Buffer.from(
        esperada
      );

    if (
      a.length !==
      b.length ||
      !timingSafeEqual(
        a,
        b
      )
    ) {
      return {
        ok: false,
        codigo: 401,
        mensaje:
          "Sesión inválida.",
      };
    }

    const datos:
      PayloadSesion =
      JSON.parse(
        leerBase64Url(
          payload
        )
      );

    if (
      !datos?.miembro?.id ||
      !datos?.miembro?.whatsapp ||
      !datos?.exp ||
      !datos?.sesionRemota
    ) {
      return {
        ok: false,
        codigo: 401,
        mensaje:
          "Sesión inválida.",
      };
    }

    if (
      Date.now() >
      Number(
        datos.exp
      )
    ) {
      return {
        ok: false,
        codigo: 401,
        mensaje:
          "La membresía venció.",
      };
    }

    return {
      ok: true,
      codigo: 200,
      miembro:
        datos.miembro,
      expira:
        Number(
          datos.exp
        ),
      sesionRemota:
        String(
          datos.sesionRemota
        ),
      token,
    };

  } catch {
    return {
      ok: false,
      codigo: 401,
      mensaje:
        "Sesión inválida.",
    };
  }
}

export async function validarMembresiaRequest(
  request: Request
): Promise<MembresiaRequestResultado> {
  const sesion =
    obtenerSesionDeRequest(
      request
    );

  if (!sesion) {
    return {
      ok: false,
      codigo: 401,
      mensaje:
        "Debes iniciar sesión.",
      sesion: "",
    };
  }

  const validacion =
    await validarTokenLocal(
      sesion
    );

  if (!validacion.ok) {
    return {
      ok: false,
      codigo:
        validacion.codigo,
      mensaje:
        validacion.mensaje,
      sesion,
    };
  }

  return {
    ok: true,
    codigo: 200,
    miembro:
      validacion.miembro,
    expira:
      validacion.expira,
    sesionRemota:
      validacion.sesionRemota,
    token:
      validacion.token,
    sesion,
  };
}


export function limpiarCacheSesion(
  _sesion: string
) {
  /*
    Se conserva por compatibilidad con las rutas existentes.
    La sesión V2 no usa caché en memoria.
  */
}
