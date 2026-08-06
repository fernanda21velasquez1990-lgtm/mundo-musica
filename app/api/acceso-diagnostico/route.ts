import {
  NextResponse,
} from "next/server";

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

  return NextResponse.json(
    {
      ok:
        Boolean(
          acceso.ok
        ),
      sesionLocalValida:
        Boolean(
          acceso.ok
        ),
      sesionAppsScript:
        Boolean(
          acceso.ok &&
          acceso.sesionRemota
        ),
      miembro:
        acceso.ok
          ? {
              nombre:
                acceso.miembro?.nombre || "",
              whatsapp:
                acceso.miembro?.whatsapp || "",
            }
          : null,
      nota:
        "FASE 6I no depende de cookies. La app envía el token explícitamente.",
    },
    {
      status:
        acceso.ok
          ? 200
          : 401,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
