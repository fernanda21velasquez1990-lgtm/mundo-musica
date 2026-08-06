import {
  NextResponse,
} from "next/server";

import {
  obtenerAppsScriptUrl,
} from "../../lib/mundo-config";

import {
  crearSesionLocal,
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
          acceso.mensaje ||
          "Debes ingresar con tu código.",
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

  const actual =
    new URL(
      request.url
    );

  const remoto =
    actual.searchParams.get(
      "remoto"
    ) === "1";

  if (remoto) {
    const url =
      await obtenerAppsScriptUrl();

    if (url) {
      try {
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
                    "validarsesion",
                  sesion:
                    acceso.sesionRemota,
                }),
              redirect:
                "follow",
              cache:
                "no-store",
            }
          );

        const datos =
          JSON.parse(
            await r.text()
          );

        if (
          !datos?.ok
        ) {
          return NextResponse.json(
            {
              ok: false,
              mensaje:
                datos?.mensaje ||
                "Tu código o membresía ya no está activo.",
              whatsappAdmin:
                datos?.whatsappAdmin ||
                "",
            },
            {
              status: 401,
            }
          );
        }

        return NextResponse.json(
          {
            ok: true,
            miembro:
              datos.miembro ||
              acceso.miembro,
            sesionExpira:
              acceso.expira,
            whatsappAdmin:
              datos.whatsappAdmin ||
              "",
          },
          {
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );

      } catch (error) {
        console.error(
          "Validación remota:",
          error
        );

        /*
          Un fallo temporal no cierra la sesión local.
        */
        return NextResponse.json(
          {
            ok: true,
            transitorio:
              true,
            miembro:
              acceso.miembro,
            sesionExpira:
              acceso.expira,
          },
          {
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      miembro:
        acceso.miembro,
      sesionExpira:
        acceso.expira,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function POST(
  request: Request
) {
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
    const body =
      await request.json();

    const whatsapp =
      String(
        body?.whatsapp || ""
      )
      .replace(
        /\D/g,
        ""
      );

    const codigo =
      String(
        body?.codigo || ""
      )
      .trim()
      .toUpperCase();

    if (
      whatsapp.length < 8 ||
      codigo.length < 6
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Escribe tu WhatsApp y tu código de acceso.",
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
                "ingresarconcodigo",
              whatsapp,
              codigo,
            }),
          redirect:
            "follow",
          cache:
            "no-store",
        }
      );

    const datos =
      JSON.parse(
        await r.text()
      );

    if (
      !datos?.ok ||
      !datos?.miembro ||
      !datos?.sesion
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            datos?.mensaje ||
            "WhatsApp o código incorrecto.",
          whatsappAdmin:
            datos?.whatsappAdmin ||
            "",
        },
        {
          status: 403,
        }
      );
    }

    const sesion =
      await crearSesionLocal(
        datos.miembro,
        Number(
          datos.sesionExpira || 0
        ) || null,
        String(
          datos.sesion
        )
      );

    return NextResponse.json(
      {
        ok: true,
        mensaje:
          "Acceso autorizado.",
        miembro:
          datos.miembro,
        sesionExpira:
          sesion.expira,
        sesionCliente:
          sesion.token,
        whatsappAdmin:
          datos.whatsappAdmin ||
          "",
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch (error) {
    console.error(
      "LOGIN CÓDIGO:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No se pudo comprobar tu código. Inténtalo nuevamente.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE() {
  return NextResponse.json({
    ok: true,
  });
}
