"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ResultadoToken = {
  nombre: string;
  whatsapp: string;
  token: string;
  vencimiento: string;
};

function fechaIso(
  fecha: Date
) {
  const y =
    fecha.getFullYear();

  const m =
    String(
      fecha.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const d =
    String(
      fecha.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${y}-${m}-${d}`;
}

function sumarMeses(
  meses: number
) {
  const hoy =
    new Date();

  const fin =
    new Date(
      hoy.getFullYear(),
      hoy.getMonth() + meses,
      hoy.getDate()
    );

  return {
    inicio:
      fechaIso(
        hoy
      ),
    fin:
      fechaIso(
        fin
      ),
  };
}

function guardarAdminLocal(
  clave: string
) {
  window.localStorage.setItem(
    "mundo_musica_admin_token",
    clave
  );

  document.cookie =
    `mundo_musica_admin_token=${encodeURIComponent(clave)}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
}

export default function AdminRapidoPage() {
  const [clave, setClave] =
    useState("");

  const [conectado, setConectado] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [nombre, setNombre] =
    useState("");

  const [whatsapp, setWhatsapp] =
    useState("");

  const [meses, setMeses] =
    useState(1);

  const [creando, setCreando] =
    useState(false);

  const [resultado, setResultado] =
    useState<ResultadoToken | null>(
      null
    );

  const fechas =
    useMemo(
      () =>
        sumarMeses(
          meses
        ),
      [meses]
    );

  async function apiAdmin(
    payload:
      Record<string, unknown>
  ) {
    const r =
      await fetch(
        "/api/admin",
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(
              payload
            ),
          cache:
            "no-store",
        }
      );

    const d =
      await r.json();

    if (
      !r.ok ||
      !d.ok
    ) {
      throw new Error(
        d.mensaje ||
        "No se pudo completar."
      );
    }

    return d;
  }

  async function conectar(
    valor:
      string
  ) {
    const limpia =
      valor.trim();

    if (!limpia) {
      setMensaje(
        "Escribe tu PIN."
      );
      return;
    }

    try {
      setMensaje(
        "⏳ Conectando..."
      );

      await apiAdmin({
        accion:
          "probaradmin",
        token:
          limpia,
      });

      setClave(
        limpia
      );

      guardarAdminLocal(
        limpia
      );

      setConectado(
        true
      );

      setMensaje(
        "✅ Listo. Este teléfono recordará tu PIN."
      );

    } catch (e) {
      setConectado(
        false
      );

      setMensaje(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ PIN incorrecto."
      );
    }
  }

  useEffect(() => {
    const guardada =
      String(
        window.localStorage.getItem(
          "mundo_musica_admin_token"
        ) || ""
      )
      .trim();

    if (guardada) {
      setClave(
        guardada
      );

      conectar(
        guardada
      );
    }
  }, []);

  async function crearToken() {
    const numero =
      whatsapp.replace(
        /\D/g,
        ""
      );

    if (
      !nombre.trim() ||
      numero.length < 8
    ) {
      setMensaje(
        "⚠️ Escribe nombre y WhatsApp."
      );
      return;
    }

    try {
      setCreando(true);
      setMensaje(
        "⏳ Creando cliente y token..."
      );
      setResultado(null);

      const d =
        await apiAdmin({
          accion:
            "crearmembresia",
          token:
            clave.trim(),
          datos: {
            nombre:
              nombre.trim(),
            whatsapp:
              numero,
            plan:
              `${meses} mes${meses === 1 ? "" : "es"}`,
            fechaInicio:
              fechas.inicio,
            fechaVencimiento:
              fechas.fin,
            estado:
              "ACTIVO",
            observacion:
              "Creado desde Admin Rápido móvil",
          },
        });

      const tokenGenerado =
        String(
          d.codigoAcceso || ""
        )
        .trim();

      setResultado({
        nombre:
          nombre.trim(),
        whatsapp:
          numero,
        token:
          tokenGenerado,
        vencimiento:
          fechas.fin,
      });

      setMensaje(
        "✅ Cliente creado. Token listo."
      );

      setNombre("");
      setWhatsapp("");

    } catch (e) {
      setMensaje(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo crear."
      );
    } finally {
      setCreando(false);
    }
  }

  async function copiarToken() {
    if (
      !resultado?.token
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        resultado.token
      );

      setMensaje(
        "✅ Token copiado."
      );
    } catch {
      setMensaje(
        "⚠️ Mantén presionado el token para copiarlo."
      );
    }
  }

  const mensajeWhatsapp =
    resultado
      ? encodeURIComponent(
          `🎵 MUNDO MÚSICA\n\nHola ${resultado.nombre}.\nTu membresía está activa.\n\n🔑 TOKEN DE ACCESO:\n${resultado.token}\n\n📅 Vence: ${resultado.vencimiento}\n\nIngresa a Mundo Música y coloca solamente este token.`
        )
      : "";

  return (
    <main className="min-h-screen bg-[#07070b] p-4 text-white">
      <div className="mx-auto max-w-md pb-12">
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
              Mundo Música
            </p>
            <h1 className="mt-1 text-2xl font-black">
              📱 Admin rápido
            </h1>
          </div>

          <a
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
          >
            Panel completo
          </a>
        </div>

        {!conectado ? (
          <section className="mt-5 rounded-3xl border border-purple-500/20 bg-[#111117] p-5">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-3xl">
                🔐
              </div>

              <h2 className="mt-4 text-xl font-black">
                Ingresa tu PIN
              </h2>

              <p className="mt-2 text-xs leading-5 text-gray-400">
                Solo la primera vez en este teléfono.
              </p>
            </div>

            <input
              value={clave}
              onChange={(e) =>
                setClave(
                  e.target.value
                )
              }
              type="password"
              inputMode="numeric"
              placeholder="PIN de 6 números"
              className="mt-5 h-14 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-center text-xl font-black tracking-[0.3em] outline-none"
            />

            <button
              onClick={() =>
                conectar(
                  clave
                )
              }
              className="mt-3 h-12 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 font-black"
            >
              Entrar
            </button>

            <p className="mt-4 text-center text-[11px] leading-5 text-gray-600">
              Usa Chrome normal, no incógnito, para que el teléfono recuerde el PIN.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-3xl border border-green-500/20 bg-green-500/[0.04] p-4">
              <p className="text-sm font-black text-green-300">
                ● Admin conectado
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Crea un cliente y su token en menos de un minuto.
              </p>
            </section>

            <section className="mt-4 rounded-3xl border border-purple-500/20 bg-[#111117] p-5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                Nombre del cliente
              </label>

              <input
                value={nombre}
                onChange={(e) =>
                  setNombre(
                    e.target.value
                  )
                }
                placeholder="Nombre y apellido"
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 font-bold outline-none"
              />

              <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                WhatsApp registrado
              </label>

              <input
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(
                    e.target.value
                  )
                }
                inputMode="tel"
                placeholder="58412..."
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 font-bold outline-none"
              />

              <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                Duración
              </label>

              <div className="mt-2 grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map(
                  (m) => (
                    <button
                      key={m}
                      onClick={() =>
                        setMeses(
                          m
                        )
                      }
                      className={`h-11 rounded-xl text-xs font-black ${
                        meses === m
                          ? "bg-fuchsia-500 text-white"
                          : "border border-white/10 bg-white/5 text-gray-400"
                      }`}
                    >
                      {m === 12
                        ? "1 año"
                        : `${m}m`}
                    </button>
                  )
                )}
              </div>

              <div className="mt-4 rounded-xl bg-white/[0.03] p-3 text-xs text-gray-400">
                📅 Inicio: <b>{fechas.inicio}</b>
                <br />
                📅 Vence: <b>{fechas.fin}</b>
              </div>

              <button
                onClick={crearToken}
                disabled={creando}
                className="mt-4 h-14 w-full rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-base font-black disabled:opacity-50"
              >
                {creando
                  ? "⏳ Creando..."
                  : "⚡ Crear cliente + token"}
              </button>
            </section>

            {resultado && (
              <section className="mt-4 rounded-3xl border border-fuchsia-500/30 bg-fuchsia-500/[0.07] p-5 text-center">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-300">
                  Token listo
                </p>

                <p className="mt-4 break-all font-mono text-2xl font-black tracking-wider">
                  {resultado.token}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  {resultado.nombre} · {resultado.whatsapp}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={copiarToken}
                    className="h-12 rounded-xl border border-white/10 bg-white/5 text-xs font-black"
                  >
                    📋 Copiar
                  </button>

                  <a
                    href={`https://wa.me/${resultado.whatsapp}?text=${mensajeWhatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-12 items-center justify-center rounded-xl bg-green-500/15 text-xs font-black text-green-300"
                  >
                    💬 Enviar WhatsApp
                  </a>
                </div>
              </section>
            )}
          </>
        )}

        {mensaje && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center text-xs leading-5 text-yellow-100">
            {mensaje}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-4 text-[11px] leading-5 text-blue-100/70">
          💡 En tu celular abre esta página en Chrome normal y usa
          <b> “Agregar a pantalla de inicio”</b>. Así tendrás un acceso directo
          para crear tokens sin entrar al panel completo.
        </div>
      </div>
    </main>
  );
}
