"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Cancion = {
  id: string;
  titulo: string;
  artista: string;
  album: string;
  genero: string;
  portada: string;
  driveId: string;
  archivoNombre: string;
  archivoUrl: string;
  duracion: string;
  publicada: string;
  descargable: string;
  radio: string;
  reproducciones: number;
  descargas: number;
  karaoke: string;
  letraLrc: string;
};

type ProgramaRadio = {
  id: string;
  nombre: string;
  descripcion: string;
  locutor: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  portada: string;
  driveId: string;
  activo: string;
};

type JingleRadio = {
  id: string;
  nombre: string;
  driveId: string;
  archivoUrl: string;
  duracion: string;
  activo: string;
  fecha: string;
};

type PublicidadRadio = {
  id: string;
  cliente: string;
  titulo: string;
  descripcion: string;
  driveId: string;
  archivoUrl: string;
  fechaInicio: string;
  fechaFin: string;
  activa: string;
};

type EspecialRadio = {
  id: string;
  nombre: string;
  descripcion: string;
  locutorDj: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  portada: string;
  driveId: string;
  archivoUrl: string;
  activo: string;
  modoEnVivo: string;
  segundosTranscurridos?: number;
};

type RadioEnVivoConfig = {
  activo: string;
  nombre: string;
};

type ContenidoRadioActual = {
  tipo: "CANCION" | "JINGLE" | "PUBLICIDAD" | "PROGRAMA" | "ESPECIAL";
  id: string;
  titulo: string;
  subtitulo: string;
  portada: string;
  driveId: string;
};

type Audiolibro = {
  id: string;
  titulo: string;
  autor: string;
  categoria: string;
  descripcion: string;
  portada: string;
  driveId: string;
  archivoUrl: string;
  duracion: string;
  publicado: string;
  descargable: string;
  reproducciones: number;
  fecha: string;
};

type CintilloPublico = {
  id: string;
  tipo: "EN_VIVO" | "PUBLICIDAD" | "AVISO" | string;
  texto: string;
  activo: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  enlace: string;
  textoBoton: string;
  fecha: string;
};

type MiembroMundoMusica = {
  id: string;
  nombre: string;
  whatsapp: string;
  plan: string;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: string;
  estadoAcceso?: string;
  accesos?: number;
};

type ApiRespuesta = {
  ok: boolean;
  canciones?: Cancion[];
  mensaje?: string;
};

const CATALOGO_LOCAL_KEY = "mundo_musica_catalogo_cache";
const CATALOGO_FECHA_KEY = "mundo_musica_catalogo_cache_fecha";
const CATALOGO_CACHE_NAME = "mundo-musica-catalogo-v1";
const CATALOGO_CACHE_URL = "/__mundo_musica_catalogo__.json";
const PORTADAS_CACHE_NAME = "mundo-musica-offline-portadas-v1";
const REPRO_PENDIENTES_KEY = "mundo_musica_reproducciones_pendientes";

async function guardarCatalogoOffline(lista: Cancion[]) {
  try {
    window.localStorage.setItem(
      CATALOGO_LOCAL_KEY,
      JSON.stringify(lista)
    );

    window.localStorage.setItem(
      CATALOGO_FECHA_KEY,
      new Date().toISOString()
    );
  } catch (e) {
    console.error("No se pudo guardar catálogo en localStorage:", e);
  }

  if ("caches" in window) {
    try {
      const cache = await caches.open(CATALOGO_CACHE_NAME);

      await cache.put(
        CATALOGO_CACHE_URL,
        new Response(
          JSON.stringify({
            ok: true,
            canciones: lista,
            fecha: new Date().toISOString(),
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );
    } catch (e) {
      console.error("No se pudo guardar catálogo en Cache Storage:", e);
    }
  }
}

async function leerCatalogoOffline(): Promise<Cancion[]> {
  try {
    const guardado = window.localStorage.getItem(CATALOGO_LOCAL_KEY);

    if (guardado) {
      const lista = JSON.parse(guardado);

      if (Array.isArray(lista) && lista.length > 0) {
        return lista;
      }
    }
  } catch (e) {
    console.error("No se pudo leer catálogo de localStorage:", e);
  }

  if ("caches" in window) {
    try {
      const cache = await caches.open(CATALOGO_CACHE_NAME);
      const respuesta = await cache.match(CATALOGO_CACHE_URL);

      if (respuesta) {
        const datos = await respuesta.json();
        const lista = datos?.canciones;

        if (Array.isArray(lista) && lista.length > 0) {
          return lista;
        }
      }
    } catch (e) {
      console.error("No se pudo leer catálogo de Cache Storage:", e);
    }
  }

  return [];
}

const generosBase = [
  ["🔥", "Reggaetón"],
  ["💃", "Salsa"],
  ["❤️", "Romántica"],
  ["🥁", "Merengue"],
  ["🎤", "Pop"],
  ["🎶", "Bachata"],
  ["🎧", "Variada"],
];

function tiempo(valor: number) {
  if (!Number.isFinite(valor) || valor < 0) return "0:00";
  const m = Math.floor(valor / 60);
  const s = Math.floor(valor % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

type LineaKaraoke = {
  tiempo: number;
  texto: string;
};

function parsearLrc(texto: string): LineaKaraoke[] {
  const lineas =
    String(texto || "")
      .split(/\r?\n/);

  const resultado: LineaKaraoke[] = [];

  const patron =
    /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/;

  lineas.forEach((linea) => {
    const match =
      linea.match(patron);

    if (!match) {
      return;
    }

    const minutos =
      Number(match[1] || 0);

    const segundos =
      Number(match[2] || 0);

    const fraccionTexto =
      String(match[3] || "0");

    const fraccion =
      fraccionTexto.length === 3
        ? Number(fraccionTexto) / 1000
        : Number(fraccionTexto) / 100;

    const textoLinea =
      String(match[4] || "")
        .trim();

    resultado.push({
      tiempo:
        minutos * 60 +
        segundos +
        fraccion,
      texto:
        textoLinea || "♪",
    });
  });

  return resultado.sort(
    (a, b) =>
      a.tiempo -
      b.tiempo
  );
}

export default function Home() {
  const [configurada, setConfigurada] = useState<boolean | null>(null);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [urlConfig, setUrlConfig] = useState("");
  const [mensajeConfig, setMensajeConfig] = useState("");
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [estadoAcceso, setEstadoAcceso] = useState<"COMPROBANDO" | "SIN_ACCESO" | "ACTIVO">("COMPROBANDO");
  const [whatsappIngreso, setWhatsappIngreso] = useState("");
  const [codigoIngreso, setCodigoIngreso] = useState("");
  const [mensajeIngreso, setMensajeIngreso] = useState("");
  const [ingresando, setIngresando] = useState(false);
  const [miembroActual, setMiembroActual] = useState<MiembroMundoMusica | null>(null);
  const [sesionExpira, setSesionExpira] = useState<number | null>(null);
  const [whatsappAdministrador, setWhatsappAdministrador] = useState("");
  const [accesoOffline, setAccesoOffline] = useState(false);

  const [cintilloVisible, setCintilloVisible] = useState(false);
  const [cintilloPublico, setCintilloPublico] = useState<CintilloPublico | null>(null);

  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [actual, setActual] = useState<Cancion | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [actualSeg, setActualSeg] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [volumen, setVolumen] = useState(0.85);
  const [playerMovilAbierto, setPlayerMovilAbierto] = useState(false);
  const [modoKaraoke, setModoKaraoke] = useState(false);

  const [audiolibros, setAudiolibros] = useState<Audiolibro[]>([]);
  const [audiolibroActual, setAudiolibroActual] = useState<Audiolibro | null>(null);
  const [audiolibroAbierto, setAudiolibroAbierto] = useState(false);
  const [audiolibroReproduciendo, setAudiolibroReproduciendo] = useState(false);
  const [audiolibroSeg, setAudiolibroSeg] = useState(0);
  const [audiolibroDuracion, setAudiolibroDuracion] = useState(0);
  const audioLibroRef = useRef<HTMLAudioElement | null>(null);

  const [radioAbierta, setRadioAbierta] = useState(false);
  const [radioActiva, setRadioActiva] = useState(false);
  const [radioIndice, setRadioIndice] = useState(0);
  const [radioAleatoria, setRadioAleatoria] = useState(true);
  const [historialRadio, setHistorialRadio] = useState<string[]>([]);

  const [programasRadio, setProgramasRadio] = useState<ProgramaRadio[]>([]);
  const [jinglesRadio, setJinglesRadio] = useState<JingleRadio[]>([]);
  const [publicidadRadio, setPublicidadRadio] = useState<PublicidadRadio[]>([]);
  const [especialesRadio, setEspecialesRadio] = useState<EspecialRadio[]>([]);
  const [radioEnVivoConfig, setRadioEnVivoConfig] = useState<RadioEnVivoConfig>({
    activo: "NO",
    nombre: "Música Mezclada en Vivo",
  });
  const [indiceRadioEnVivo, setIndiceRadioEnVivo] = useState(0);
  const [programaActualRadio, setProgramaActualRadio] = useState<ProgramaRadio | null>(null);
  const [especialActualRadio, setEspecialActualRadio] = useState<EspecialRadio | null>(null);
  const [horaServidorRadio, setHoraServidorRadio] = useState("");
  const [cargandoProgramacionRadio, setCargandoProgramacionRadio] = useState(false);

  const [contenidoRadioActual, setContenidoRadioActual] = useState<ContenidoRadioActual | null>(null);
  const [cancionesDesdeJingle, setCancionesDesdeJingle] = useState(0);
  const [cancionesDesdePublicidad, setCancionesDesdePublicidad] = useState(0);
  const [programaReproducidoId, setProgramaReproducidoId] = useState("");
  const [ultimaPublicidadId, setUltimaPublicidadId] = useState("");
  const [ultimoJingleId, setUltimoJingleId] = useState("");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [recientes, setRecientes] = useState<string[]>([]);
  const [vistaBiblioteca, setVistaBiblioteca] = useState<"PORTADAS" | "LISTA">("PORTADAS");
  const [seccionMovil, setSeccionMovil] = useState<"INICIO" | "BUSCAR" | "FAVORITOS" | "MIMUSICA">("INICIO");
  const [modoBusqueda, setModoBusqueda] = useState<"CANCIONES" | "ARTISTAS" | "ALBUMES" | "SOLICITAR">("CANCIONES");

  const [solicitud, setSolicitud] = useState({
    nombreOyente: "",
    cancion: "",
    artista: "",
    dedicatoria: "",
    whatsapp: "",
  });
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState("");

  const [guardandoOffline, setGuardandoOffline] = useState(false);
  const [progresoOffline, setProgresoOffline] = useState({ actual: 0, total: 0 });
  const [mensajeOffline, setMensajeOffline] = useState("");
  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  const [offlinePortadas, setOfflinePortadas] = useState(0);
  const [online, setOnline] = useState(true);
  const [catalogoDesdeCache, setCatalogoDesdeCache] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function comprobarConfig() {
    try {
      const r = await fetch("/api/config", {
        cache: "no-store",
      });

      if (!r.ok) {
        throw new Error(`Config respondió ${r.status}`);
      }

      const respuestaOffline =
        r.headers.get("X-Mundo-Musica-Offline") === "1";

      const d = await r.json();
      const ok = Boolean(d.configurada);

      setConfigurada(ok);
      setOnline(
        window.navigator.onLine
      );
      setCatalogoDesdeCache(
        respuestaOffline &&
        !window.navigator.onLine
      );

      return ok;
    } catch (e) {
      console.error("Configuración sin red:", e);

      setOnline(false);

      const lista = await leerCatalogoOffline();

      if (lista.length > 0) {
        setConfigurada(true);
        setCatalogoDesdeCache(true);
        return true;
      }

      setConfigurada(false);
      return false;
    }
  }

  const SESION_CLIENTE_KEY =
    "mundo_musica_token_acceso";

  const ACCESO_RECORDADO_KEY =
    "mundo_musica_acceso_recordado";

  function guardarAccesoRecordado(
    whatsapp: string,
    nombre: string
  ) {
    try {
      window.localStorage.setItem(
        ACCESO_RECORDADO_KEY,
        JSON.stringify({
          whatsapp:
            String(
              whatsapp || ""
            )
            .replace(
              /\D/g,
              ""
            ),
          nombre:
            String(
              nombre || ""
            )
            .trim(),
        })
      );
    } catch {
      // Nada.
    }
  }

  function leerAccesoRecordado() {
    try {
      const raw =
        window.localStorage.getItem(
          ACCESO_RECORDADO_KEY
        );

      if (!raw) {
        return null;
      }

      const datos =
        JSON.parse(
          raw
        );

      return {
        whatsapp:
          String(
            datos?.whatsapp || ""
          )
          .replace(
            /\D/g,
            ""
          ),
        nombre:
          String(
            datos?.nombre || ""
          )
          .trim(),
      };

    } catch {
      return null;
    }
  }

  function borrarAccesoRecordado() {
    try {
      window.localStorage.removeItem(
        ACCESO_RECORDADO_KEY
      );
    } catch {
      // Nada.
    }
  }

  function guardarSesionCliente(
    token: string,
    expira: number | null
  ) {
    const limpio =
      String(
        token || ""
      )
      .trim();

    if (!limpio) {
      return;
    }

    try {
      window.localStorage.setItem(
        SESION_CLIENTE_KEY,
        JSON.stringify({
          token:
            limpio,
          expira:
            Number(
              expira || 0
            ),
        })
      );
    } catch {
      // Nada.
    }
  }

  function obtenerSesionCliente() {
    try {
      const raw =
        window.localStorage.getItem(
          SESION_CLIENTE_KEY
        );

      if (!raw) {
        return "";
      }

      const datos =
        JSON.parse(
          raw
        );

      const token =
        String(
          datos?.token || ""
        )
        .trim();

      const expira =
        Number(
          datos?.expira || 0
        );

      if (
        !token ||
        (
          Number.isFinite(
            expira
          ) &&
          expira > 0 &&
          Date.now() >= expira
        )
      ) {
        window.localStorage.removeItem(
          SESION_CLIENTE_KEY
        );
        return "";
      }

      return token;

    } catch {
      return "";
    }
  }

  function borrarSesionCliente() {
    try {
      window.localStorage.removeItem(
        SESION_CLIENTE_KEY
      );
    } catch {
      // Nada.
    }
  }

  async function fetchMiembro(
    url: string,
    init: RequestInit = {}
  ) {
    const token =
      obtenerSesionCliente();

    const headers =
      new Headers(
        init.headers || {}
      );

    if (token) {
      headers.set(
        "X-Mundo-Musica-Session",
        token
      );
    }

    return fetch(
      url,
      {
        ...init,
        headers,
      }
    );
  }

  function urlAudioMiembro(
    driveId: string
  ) {
    const token =
      obtenerSesionCliente();

    const base =
      `/api/audio/${encodeURIComponent(driveId)}`;

    if (!token) {
      return base;
    }

    return (
      base +
      "?session=" +
      encodeURIComponent(
        token
      )
    );
  }

  function urlDownloadMiembro(
    driveId: string,
    nombre: string
  ) {
    const token =
      obtenerSesionCliente();

    const params =
      new URLSearchParams();

    params.set(
      "name",
      nombre
    );

    if (token) {
      params.set(
        "session",
        token
      );
    }

    return (
      `/api/download/${encodeURIComponent(driveId)}?` +
      params.toString()
    );
  }

  function guardarAccesoLocal(
    miembro: MiembroMundoMusica,
    expira: number | null,
    whatsappAdmin = ""
  ) {
    try {
      window.localStorage.setItem(
        "mundo_musica_acceso_local",
        JSON.stringify({
          miembro,
          expira:
            expira ||
            Date.now() +
              24 *
              60 *
              60 *
              1000,
          whatsappAdmin,
        })
      );
    } catch {
      // Nada.
    }
  }

  function leerAccesoLocal() {
    try {
      const raw =
        window.localStorage.getItem(
          "mundo_musica_acceso_local"
        );

      if (!raw) {
        return null;
      }

      const datos =
        JSON.parse(raw);

      if (
        !datos?.miembro ||
        !datos?.expira ||
        Date.now() >
          Number(
            datos.expira
          )
      ) {
        return null;
      }

      return datos;

    } catch {
      return null;
    }
  }

  async function comprobarAcceso(
    silencioso = false,
    remoto = false
  ) {
    const token =
      obtenerSesionCliente();

    if (!token) {
      setEstadoAcceso(
        "SIN_ACCESO"
      );
      return false;
    }

    const yaActivo =
      estadoAcceso === "ACTIVO";

    try {
      if (
        !silencioso &&
        !yaActivo
      ) {
        setEstadoAcceso(
          "COMPROBANDO"
        );
      }

      const r =
        await fetchMiembro(
          `/api/acceso?t=${Date.now()}${remoto ? "&remoto=1" : ""}`,
          {
            cache: "no-store",
          }
        );

      const d =
        await r.json();

      if (
        d?.transitorio === true
      ) {
        const local =
          leerAccesoLocal();

        if (
          yaActivo ||
          local
        ) {
          setEstadoAcceso(
            "ACTIVO"
          );
          return true;
        }
      }

      if (
        !r.ok ||
        !d.ok
      ) {
        borrarSesionCliente();

        try {
          window.localStorage.removeItem(
            "mundo_musica_acceso_local"
          );
        } catch {
          // Nada.
        }

        setMiembroActual(null);
        setSesionExpira(null);
        setEstadoAcceso(
          "SIN_ACCESO"
        );

        if (
          d.whatsappAdmin
        ) {
          setWhatsappAdministrador(
            String(
              d.whatsappAdmin
            )
          );
        }

        return false;
      }

      setMiembroActual(
        d.miembro || null
      );

      setSesionExpira(
        Number(
          d.sesionExpira || 0
        ) || null
      );

      setWhatsappAdministrador(
        String(
          d.whatsappAdmin || ""
        )
      );

      setAccesoOffline(false);
      setEstadoAcceso(
        "ACTIVO"
      );

      if (d.miembro) {
        guardarAccesoLocal(
          d.miembro,
          Number(
            d.sesionExpira || 0
          ) || null,
          String(
            d.whatsappAdmin || ""
          )
        );
      }

      return true;

    } catch (e) {
      console.error(
        "Comprobar acceso:",
        e
      );

      const local =
        leerAccesoLocal();

      if (
        yaActivo ||
        local
      ) {
        setEstadoAcceso(
          "ACTIVO"
        );
        return true;
      }

      setEstadoAcceso(
        "SIN_ACCESO"
      );

      return false;
    }
  }

  async function ingresarConWhatsapp() {
    const codigo =
      codigoIngreso
        .trim()
        .toUpperCase();

    if (
      codigo.length < 6
    ) {
      setMensajeIngreso(
        "⚠️ Escribe el token entregado por el administrador."
      );
      return;
    }

    try {
      setIngresando(true);
      setMensajeIngreso("");

      const r =
        await fetch(
          "/api/acceso",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                codigo,
              }),
          }
        );

      const d =
        await r.json();

      if (
        !r.ok ||
        !d.ok ||
        !d.sesionCliente
      ) {
        setEstadoAcceso(
          "SIN_ACCESO"
        );

        setMensajeIngreso(
          d.mensaje ||
          "Token de acceso incorrecto."
        );

        setWhatsappAdministrador(
          String(
            d.whatsappAdmin || ""
          )
        );

        return;
      }

      guardarSesionCliente(
        String(
          d.sesionCliente
        ),
        Number(
          d.sesionExpira || 0
        ) || null
      );

      guardarAccesoRecordado(
        String(
          d?.miembro?.whatsapp || ""
        ),
        String(
          d?.miembro?.nombre || ""
        )
      );

      setMiembroActual(
        d.miembro || null
      );

      setSesionExpira(
        Number(
          d.sesionExpira || 0
        ) || null
      );

      setWhatsappAdministrador(
        String(
          d.whatsappAdmin || ""
        )
      );

      setAccesoOffline(false);
      setEstadoAcceso(
        "ACTIVO"
      );

      if (d.miembro) {
        guardarAccesoLocal(
          d.miembro,
          Number(
            d.sesionExpira || 0
          ) || null,
          String(
            d.whatsappAdmin || ""
          )
        );
      }

      await cargarCanciones();
      await cargarAudiolibros();
      await cargarProgramacionRadio();

    } catch (e) {
      console.error(e);

      setMensajeIngreso(
        "❌ No pudimos comprobar tu token. Inténtalo nuevamente."
      );

    } finally {
      setIngresando(false);
    }
  }

  async function cerrarSesionMiembro() {
    try {
      if (
        audioRef.current
      ) {
        audioRef.current.pause();
      }

      if (
        audioLibroRef.current
      ) {
        audioLibroRef.current.pause();
      }

      await fetchMiembro(
        "/api/acceso",
        {
          method:
            "DELETE",
        }
      );

    } catch {
      // Continuamos limpiando local.
    }

    borrarSesionCliente();
    borrarAccesoRecordado();

    try {
      window.localStorage.removeItem(
        "mundo_musica_acceso_local"
      );

      window.localStorage.removeItem(
        CATALOGO_LOCAL_KEY
      );

      window.localStorage.removeItem(
        CATALOGO_FECHA_KEY
      );

      window.localStorage.removeItem(
        "mundo_musica_audiolibros"
      );

      if (
        "caches" in window
      ) {
        const nombres =
          await caches.keys();

        await Promise.all(
          nombres
            .filter(
              (nombre) =>
                nombre.startsWith(
                  "mundo-musica"
                )
            )
            .map(
              (nombre) =>
                caches.delete(
                  nombre
                )
            )
        );
      }

    } catch {
      // Nada.
    }

    setCanciones([]);
    setAudiolibros([]);
    setMiembroActual(null);
    setSesionExpira(null);
    setEstadoAcceso(
      "SIN_ACCESO"
    );
    setMensajeIngreso("");
    setAccesoOffline(false);
  }

  function enlaceWhatsappAdministrador() {
    const numero =
      String(
        whatsappAdministrador || ""
      )
      .replace(
        /\D/g,
        ""
      );

    if (!numero) {
      return "";
    }

    const texto =
      encodeURIComponent(
        "Hola, quiero activar mi membresía de Mundo Música."
      );

    return `https://wa.me/${numero}?text=${texto}`;
  }

  async function cargarCanciones() {
    try {
      setCargando(true);
      setError("");

      let r =
        await fetchMiembro(
          `/api/musica?t=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

      /*
        Una sesión rechazada no significa que no haya Internet.
        Intentamos refrescar la sesión una vez.
      */
      if (
        r.status === 401
      ) {
        const acceso =
          await comprobarAcceso(
            true
          );

        if (!acceso) {
          throw new Error(
            "SESION_INVALIDA"
          );
        }

        r =
          await fetchMiembro(
            `/api/musica?t=${Date.now()}`,
            {
              cache: "no-store",
            }
          );
      }

      if (!r.ok) {
        throw new Error(
          `Música respondió ${r.status}`
        );
      }

      const respuestaOffline =
        r.headers.get(
          "X-Mundo-Musica-Offline"
        ) === "1";

      const d: ApiRespuesta =
        await r.json();

      if (!d.ok) {
        throw new Error(
          d.mensaje ||
          "No se pudo cargar la música."
        );
      }

      const lista =
        Array.isArray(
          d.canciones
        )
          ? d.canciones
          : [];

      if (
        lista.length === 0 &&
        !window.navigator.onLine
      ) {
        const local =
          await leerCatalogoOffline();

        if (
          local.length > 0
        ) {
          setCanciones(local);
          setOnline(false);
          setCatalogoDesdeCache(true);
          setError("");
          return;
        }
      }

      setCanciones(lista);
      setOnline(
        window.navigator.onLine
      );

      setCatalogoDesdeCache(
        respuestaOffline &&
        !window.navigator.onLine
      );

      setError("");

      if (
        lista.length > 0 &&
        window.navigator.onLine
      ) {
        await guardarCatalogoOffline(
          lista
        );
      }

    } catch (e) {
      console.error(
        "Carga de música:",
        e
      );

      if (
        !window.navigator.onLine
      ) {
        setOnline(false);

        const lista =
          await leerCatalogoOffline();

        if (
          lista.length > 0
        ) {
          setCanciones(lista);
          setCatalogoDesdeCache(true);
          setError("");
        } else {
          setCanciones([]);
          setCatalogoDesdeCache(true);
          setError(
            "No hay conexión y este dispositivo todavía no tiene un catálogo guardado."
          );
        }

        return;
      }

      /*
        Hay Internet. No mostramos un falso MODO SIN CONEXIÓN.
      */
      setOnline(true);
      setCatalogoDesdeCache(false);

      if (
        e instanceof Error &&
        e.message ===
          "SESION_INVALIDA"
      ) {
        setError(
          "Tu sesión necesita volver a iniciarse."
        );
      } else {
        setError(
          "No se pudo actualizar la biblioteca. Pulsa actualizar en unos segundos."
        );
      }

    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    setOnline(window.navigator.onLine);

    (async () => {
      const ok = await comprobarConfig();

      if (ok) {
        await cargarCintillo();

        /*
          ACCESO RECORDADO:
          si este dispositivo ya tiene una sesión firmada
          y vigente, entra automáticamente sin volver a pedir
          WhatsApp ni código.
        */
        const acceso =
          await comprobarAcceso(
            true
          );

        if (acceso) {
          await cargarCanciones();
          await cargarAudiolibros();
          await cargarProgramacionRadio();
        } else {
          /*
            Si ya no existe una sesión válida, recordamos
            únicamente el WhatsApp para facilitar el ingreso.
            El código anterior NO se guarda ni se muestra.
          */

          setEstadoAcceso(
            "SIN_ACCESO"
          );
        }
      } else {
        setEstadoAcceso(
          "SIN_ACCESO"
        );
        setMostrarConfig(true);
      }
    })();

    try {
      const guardados = window.localStorage.getItem("mundo_musica_favoritos");
      if (guardados) {
        const lista = JSON.parse(guardados);
        if (Array.isArray(lista)) {
          setFavoritos(lista.map(String));
        }
      }

      const recientesGuardados = window.localStorage.getItem("mundo_musica_recientes");
      if (recientesGuardados) {
        const lista = JSON.parse(recientesGuardados);
        if (Array.isArray(lista)) {
          setRecientes(lista.map(String));
        }
      }

      const vista = window.localStorage.getItem("mundo_musica_vista");
      if (vista === "LISTA" || vista === "PORTADAS") {
        setVistaBiblioteca(vista);
      }
    } catch (e) {
      console.error("No se pudieron cargar preferencias:", e);
    }

    const alConectar = async () => {
      setOnline(true);

      await cargarCintillo();

      const acceso =
        await comprobarAcceso();

      if (acceso) {
        cargarCanciones();
        cargarAudiolibros();
        cargarProgramacionRadio();
        sincronizarReproduccionesPendientes();
      }
    };

    const alDesconectar = async () => {
      setOnline(false);
      setCatalogoDesdeCache(true);

      const lista = await leerCatalogoOffline();

      if (lista.length > 0) {
        setCanciones(lista);
        setError("");
      }
    };

    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);

    if ("serviceWorker" in navigator) {
      const host =
        window.location.hostname;

      const esLocal =
        host === "localhost" ||
        host === "127.0.0.1";

      if (esLocal) {
        /*
          En desarrollo local desactivamos el Service Worker.
          Evita que versiones viejas de la app interfieran con
          membresías, Radio EN VIVO y estado ONLINE.
          En Vercel se activa normalmente.
        */
        navigator.serviceWorker
          .getRegistrations()
          .then(
            async (registros) => {
              await Promise.all(
                registros.map(
                  (registro) =>
                    registro.unregister()
                )
              );

              if (
                "caches" in window
              ) {
                const nombres =
                  await caches.keys();

                await Promise.all(
                  nombres
                    .filter(
                      (nombre) =>
                        nombre.includes(
                          "shell"
                        ) ||
                        nombre.includes(
                          "api"
                        )
                    )
                    .map(
                      (nombre) =>
                        caches.delete(
                          nombre
                        )
                    )
                );
              }
            }
          )
          .catch(
            (e) =>
              console.error(
                "Limpiar Service Worker:",
                e
              )
          );

      } else {
        navigator.serviceWorker
          .register("/sw.js", {
            updateViaCache: "none",
          })
          .then(
            (registro) =>
              registro.update()
          )
          .catch(
            (e) =>
              console.error(
                "Service Worker:",
                e
              )
          );
      }
    }

    actualizarOfflineIds();

    setTimeout(
      () => {
        sincronizarReproduccionesPendientes();
      },
      1200
    );

    return () => {
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volumen;
  }, [volumen]);

  useEffect(() => {
    if (canciones.length > 0 && !catalogoDesdeCache) {
      guardarCatalogoOffline(canciones);
    }
  }, [canciones, catalogoDesdeCache]);

  async function cargarCintillo() {
    try {
      const r =
        await fetch(
          `/api/cintillo?t=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

      const d =
        await r.json();

      if (
        r.ok &&
        d.ok
      ) {
        setCintilloVisible(
          Boolean(
            d.visible
          )
        );

        setCintilloPublico(
          d.cintillo || null
        );

        return;
      }

      setCintilloVisible(false);

    } catch {
      setCintilloVisible(false);
    }
  }

  async function cargarAudiolibros() {
    try {
      const r =
        await fetchMiembro(
          `/api/audiolibros?t=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

      const d =
        await r.json();

      if (!r.ok || !d.ok) {
        throw new Error(
          d.mensaje ||
          "No se pudieron cargar."
        );
      }

      const lista =
        Array.isArray(d.audiolibros)
          ? d.audiolibros
          : [];

      setAudiolibros(
        lista
      );

      try {
        window.localStorage.setItem(
          "mundo_musica_audiolibros",
          JSON.stringify(
            lista
          )
        );
      } catch {
        // No bloqueamos.
      }

    } catch (e) {
      console.error(
        "Audiolibros:",
        e
      );

      try {
        const raw =
          window.localStorage.getItem(
            "mundo_musica_audiolibros"
          );

        if (raw) {
          setAudiolibros(
            JSON.parse(raw)
          );
        }
      } catch {
        // Nada.
      }
    }
  }

  function claveProgresoAudiolibro(
    id: string
  ) {
    return `mundo_musica_audiolibro_progreso_${id}`;
  }

  async function abrirAudiolibro(
    libro: Audiolibro
  ) {
    if (
      audioRef.current &&
      !audioRef.current.paused
    ) {
      audioRef.current.pause();
    }

    setRadioActiva(false);
    setContenidoRadioActual(null);
    setAudiolibroActual(libro);
    setAudiolibroAbierto(true);

    let progreso = 0;

    try {
      progreso =
        Number(
          window.localStorage.getItem(
            claveProgresoAudiolibro(
              libro.id
            )
          ) || 0
        );
    } catch {
      progreso = 0;
    }

    setAudiolibroSeg(
      progreso
    );

    setTimeout(
      async () => {
        const audio =
          audioLibroRef.current;

        if (!audio) {
          return;
        }

        const preparar =
          async () => {
            if (
              progreso > 0 &&
              Number.isFinite(
                audio.duration
              )
            ) {
              audio.currentTime =
                Math.min(
                  progreso,
                  Math.max(
                    0,
                    audio.duration - 2
                  )
                );
            }

            try {
              await audio.play();
            } catch {
              // El navegador puede pedir toque adicional.
            }
          };

        if (
          audio.readyState >= 1
        ) {
          await preparar();
        } else {
          audio.addEventListener(
            "loadedmetadata",
            preparar,
            {
              once: true,
            }
          );

          audio.load();
        }
      },
      100
    );

    try {
      const r =
        await fetchMiembro(
          "/api/audiolibros",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id:
                  libro.id,
              }),
          }
        );

      const d =
        await r.json();

      if (
        r.ok &&
        d.ok &&
        Number.isFinite(
          Number(
            d.reproducciones
          )
        )
      ) {
        setAudiolibros(
          (items) =>
            items.map(
              (item) =>
                item.id === libro.id
                  ? {
                      ...item,
                      reproducciones:
                        Number(
                          d.reproducciones
                        ),
                    }
                  : item
            )
        );
      }

    } catch {
      // El libro se puede seguir escuchando.
    }
  }

  async function playPauseAudiolibro() {
    const audio =
      audioLibroRef.current;

    if (!audio) {
      return;
    }

    try {
      if (
        audio.paused
      ) {
        if (
          audioRef.current &&
          !audioRef.current.paused
        ) {
          audioRef.current.pause();
        }

        await audio.play();

      } else {
        audio.pause();
      }

    } catch (e) {
      console.error(e);
    }
  }

  async function cargarProgramacionRadio() {
    try {
      setCargandoProgramacionRadio(true);

      const r =
        await fetchMiembro(
          `/api/radio-programacion?t=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

      const d =
        await r.json();

      if (!r.ok || !d.ok) {
        throw new Error(
          d.mensaje ||
          "No se pudo cargar la programación."
        );
      }

      const programas =
        Array.isArray(d.programas)
          ? d.programas
          : [];

      const jingles =
        Array.isArray(d.jingles)
          ? d.jingles
          : [];

      const publicidad =
        Array.isArray(d.publicidad)
          ? d.publicidad
          : [];

      const especiales =
        Array.isArray(d.especiales)
          ? d.especiales
          : [];

      const radioEnVivo: RadioEnVivoConfig = {
        activo:
          String(
            d?.radioEnVivo?.activo || "NO"
          ).toUpperCase() === "SI"
            ? "SI"
            : "NO",
        nombre:
          String(
            d?.radioEnVivo?.nombre ||
            "Música Mezclada en Vivo"
          ),
      };

      setProgramasRadio(programas);
      setJinglesRadio(jingles);
      setPublicidadRadio(publicidad);
      setEspecialesRadio(especiales);
      setRadioEnVivoConfig(radioEnVivo);
      setProgramaActualRadio(
        d.programaActual || null
      );
      setEspecialActualRadio(null);

      const hora =
        d?.servidor?.hora
          ? String(d.servidor.hora)
          : "";

      const dia =
        d?.servidor?.dia
          ? String(d.servidor.dia)
          : "";

      const horaServidor =
        [dia, hora]
          .filter(Boolean)
          .join(" • ");

      setHoraServidorRadio(
        horaServidor
      );

      try {
        window.localStorage.setItem(
          "mundo_musica_programacion_radio",
          JSON.stringify({
            programas,
            jingles,
            publicidad,
            especiales,
            radioEnVivo,
            programaActual:
              d.programaActual || null,
            horaServidor,
          })
        );
      } catch {
        // No bloqueamos.
      }

      if (radioActiva) {
        if (
          radioEnVivo.activo === "SI" &&
          especiales.length > 0 &&
          contenidoRadioActual?.tipo !== "ESPECIAL"
        ) {
          setTimeout(
            () => {
              reproducirPistaRadioEnVivo(
                0,
                especiales,
                radioEnVivo
              );
            },
            50
          );
        }

        if (
          radioEnVivo.activo !== "SI" &&
          contenidoRadioActual?.tipo === "ESPECIAL"
        ) {
          setTimeout(
            () => {
              siguienteRadio();
            },
            50
          );
        }
      }

      return d;

    } catch (e) {
      console.error(
        "Programación Radio:",
        e
      );

      if (
        !window.navigator.onLine
      ) {
        try {
          const raw =
            window.localStorage.getItem(
              "mundo_musica_programacion_radio"
            );

          if (raw) {
            const local =
              JSON.parse(raw);

            setProgramasRadio(
              Array.isArray(local.programas)
                ? local.programas
                : []
            );
            setJinglesRadio(
              Array.isArray(local.jingles)
                ? local.jingles
                : []
            );
            setPublicidadRadio(
              Array.isArray(local.publicidad)
                ? local.publicidad
                : []
            );
            setEspecialesRadio(
              Array.isArray(local.especiales)
                ? local.especiales
                : []
            );
            setRadioEnVivoConfig({
              activo:
                String(
                  local?.radioEnVivo?.activo || "NO"
                ).toUpperCase() === "SI"
                  ? "SI"
                  : "NO",
              nombre:
                String(
                  local?.radioEnVivo?.nombre ||
                  "Música Mezclada en Vivo"
                ),
            });
            setProgramaActualRadio(
              local.programaActual || null
            );
            setEspecialActualRadio(null);
            setHoraServidorRadio(
              String(
                local.horaServidor || ""
              )
            );
          }
        } catch {
          // Nada.
        }
      }

      return null;

    } finally {
      setCargandoProgramacionRadio(false);
    }
  }

  async function guardarConfig() {
    const limpia = urlConfig.trim();
    setMensajeConfig("");

    if (
      !limpia.startsWith("https://script.google.com/macros/s/") ||
      !limpia.endsWith("/exec")
    ) {
      setMensajeConfig("⚠️ La URL debe ser la original de Apps Script y terminar en /exec.");
      return;
    }

    try {
      setGuardandoConfig(true);
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: limpia }),
      });
      const d = await r.json();

      if (!r.ok || !d.ok) throw new Error(d.mensaje || "No se pudo guardar.");

      setConfigurada(true);
      setMensajeConfig("✅ Conexión guardada.");

      const acceso =
        await comprobarAcceso();

      if (acceso) {
        await cargarCanciones();
        await cargarAudiolibros();
        await cargarProgramacionRadio();
      }

      setTimeout(() => {
        setMostrarConfig(false);
        setMensajeConfig("");
      }, 700);
    } catch (e) {
      console.error(e);
      setMensajeConfig("❌ No se pudo guardar la conexión.");
    } finally {
      setGuardandoConfig(false);
    }
  }

  useEffect(() => {
    if (!radioActiva) {
      return;
    }

    const intervalo =
      window.setInterval(
        () => {
          cargarProgramacionRadio();
        },
        15000
      );

    return () => {
      window.clearInterval(
        intervalo
      );
    };
  }, [
    radioActiva,
    contenidoRadioActual?.tipo
  ]);

  useEffect(() => {
    const intervalo =
      window.setInterval(
        () => {
          cargarCintillo();
        },
        30000
      );

    return () => {
      window.clearInterval(
        intervalo
      );
    };
  }, []);

  /*
    La membresía se vuelve a validar periódicamente,
    pero NUNCA durante cada fragmento del MP3.
  */
  useEffect(() => {
    if (
      estadoAcceso !== "ACTIVO" ||
      accesoOffline
    ) {
      return;
    }

    const intervalo =
      window.setInterval(
        async () => {
          const ok =
            await comprobarAcceso(
              true,
              true
            );

          if (!ok) {
            if (
              audioRef.current
            ) {
              audioRef.current.pause();
            }

            if (
              audioLibroRef.current
            ) {
              audioLibroRef.current.pause();
            }
          }
        },
        600000
      );

    return () => {
      window.clearInterval(
        intervalo
      );
    };
  }, [
    estadoAcceso,
    accesoOffline
  ]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return canciones;

    return canciones.filter((c) =>
      [c.titulo, c.artista, c.album, c.genero]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [canciones, busqueda]);

  function elegirAleatorioRadio<T extends { id: string }>(
    lista: T[],
    excluirId = ""
  ): T | null {
    if (!lista.length) {
      return null;
    }

    if (lista.length === 1) {
      return lista[0];
    }

    const disponibles =
      lista.filter(
        (item) =>
          item.id !== excluirId
      );

    const base =
      disponibles.length
        ? disponibles
        : lista;

    return base[
      Math.floor(
        Math.random() *
        base.length
      )
    ] || null;
  }

  function contenidoDesdeCancionRadio(
    c: Cancion
  ): ContenidoRadioActual {
    return {
      tipo: "CANCION",
      id: c.id,
      titulo: c.titulo,
      subtitulo: c.artista,
      portada: c.portada || "",
      driveId: c.driveId,
    };
  }

  async function reproducirExtraRadio(
    contenido: ContenidoRadioActual
  ) {
    if (!contenido.driveId) {
      await siguienteRadio();
      return;
    }

    setContenidoRadioActual(
      contenido
    );

    setActualSeg(0);
    setDuracion(0);
    setModoKaraoke(false);
    setRadioActiva(true);

    setTimeout(
      async () => {
        try {
          if (
            !audioRef.current
          ) {
            return;
          }

          audioRef.current.load();

          await audioRef.current.play();

        } catch (e) {
          console.error(
            "Radio extra:",
            e
          );
        }
      },
      100
    );
  }

  async function reproducirCancionRadio(
    c: Cancion,
    indice?: number
  ) {
    if (
      typeof indice === "number" &&
      indice >= 0
    ) {
      setRadioIndice(
        indice
      );
    }

    setContenidoRadioActual(
      contenidoDesdeCancionRadio(
        c
      )
    );

    setRadioActiva(true);
    setModoKaraoke(false);

    await seleccionar(
      c,
      true
    );
  }

  async function reproducirPistaRadioEnVivo(
    indice: number,
    listaOpcional?: EspecialRadio[],
    configOpcional?: RadioEnVivoConfig
  ) {
    const lista =
      listaOpcional &&
      listaOpcional.length
        ? listaOpcional
        : especialesRadio;

    const config =
      configOpcional ||
      radioEnVivoConfig;

    if (
      config.activo !== "SI" ||
      !lista.length
    ) {
      return false;
    }

    const total =
      lista.length;

    const normalizado =
      (
        (
          indice %
          total
        ) +
        total
      ) %
      total;

    const pista =
      lista[
        normalizado
      ];

    if (
      !pista ||
      !pista.driveId
    ) {
      return false;
    }

    setIndiceRadioEnVivo(
      normalizado
    );

    setContenidoRadioActual({
      tipo: "ESPECIAL",
      id: pista.id,
      titulo:
        pista.nombre ||
        `Pista ${normalizado + 1}`,
      subtitulo:
        `${config.nombre} • ${normalizado + 1}/${total}`,
      portada:
        pista.portada || "",
      driveId:
        pista.driveId,
    });

    setRadioActiva(true);
    setModoKaraoke(false);
    setActualSeg(0);
    setDuracion(0);

    setTimeout(
      async () => {
        try {
          const audio =
            audioRef.current;

          if (!audio) {
            return;
          }

          audio.load();

          await audio.play();

        } catch (e) {
          console.error(
            "Radio en vivo:",
            e
          );
        }
      },
      80
    );

    return true;
  }

  async function reproducirEspecialEnVivoSiCorresponde() {
    if (
      radioEnVivoConfig.activo !== "SI" ||
      !especialesRadio.length
    ) {
      return false;
    }

    return reproducirPistaRadioEnVivo(
      indiceRadioEnVivo
    );
  }

  async function reproducirProgramaEnHorarioSiCorresponde() {
    if (
      !programaActualRadio ||
      !programaActualRadio.driveId ||
      programaActualRadio.id ===
        programaReproducidoId
    ) {
      return false;
    }

    setProgramaReproducidoId(
      programaActualRadio.id
    );

    await reproducirExtraRadio({
      tipo: "PROGRAMA",
      id: programaActualRadio.id,
      titulo: programaActualRadio.nombre,
      subtitulo:
        programaActualRadio.locutor ||
        "Mundo Música",
      portada:
        programaActualRadio.portada || "",
      driveId:
        programaActualRadio.driveId,
    });

    return true;
  }

  async function insertarPublicidadRadio() {
    const seleccion =
      elegirAleatorioRadio(
        publicidadRadio.filter(
          (item) =>
            item.activa === "SI" &&
            Boolean(item.driveId)
        ),
        ultimaPublicidadId
      );

    if (!seleccion) {
      return false;
    }

    setUltimaPublicidadId(
      seleccion.id
    );

    setCancionesDesdePublicidad(
      0
    );

    await reproducirExtraRadio({
      tipo: "PUBLICIDAD",
      id: seleccion.id,
      titulo:
        seleccion.titulo ||
        "Publicidad",
      subtitulo:
        seleccion.cliente ||
        "Mundo Música",
      portada: "",
      driveId:
        seleccion.driveId,
    });

    return true;
  }

  async function insertarJingleRadio() {
    const seleccion =
      elegirAleatorioRadio(
        jinglesRadio.filter(
          (item) =>
            item.activo === "SI" &&
            Boolean(item.driveId)
        ),
        ultimoJingleId
      );

    if (!seleccion) {
      return false;
    }

    setUltimoJingleId(
      seleccion.id
    );

    setCancionesDesdeJingle(
      0
    );

    await reproducirExtraRadio({
      tipo: "JINGLE",
      id: seleccion.id,
      titulo:
        seleccion.nombre ||
        "Mundo Música",
      subtitulo:
        "Identificador de la estación",
      portada: "",
      driveId:
        seleccion.driveId,
    });

    return true;
  }

  async function manejarFinRadio() {
    if (!radioActiva) {
      return;
    }

    const tipo =
      contenidoRadioActual?.tipo ||
      "CANCION";

    /*
      EN VIVO:
      todos los audios de 07 - ESPECIALES RADIO suenan corridos.
      La última pista vuelve automáticamente a la primera.
    */
    if (
      tipo === "ESPECIAL"
    ) {
      if (
        radioEnVivoConfig.activo === "SI" &&
        especialesRadio.length > 0
      ) {
        await reproducirPistaRadioEnVivo(
          (
            indiceRadioEnVivo +
            1
          ) %
          especialesRadio.length
        );
      } else {
        await siguienteRadio();
      }

      return;
    }

    /*
      Cuando termina un programa, jingle o publicidad,
      regresamos directamente a la música.
    */
    if (
      tipo === "PROGRAMA" ||
      tipo === "JINGLE" ||
      tipo === "PUBLICIDAD"
    ) {
      await siguienteRadio();
      return;
    }

    const nuevoJingle =
      cancionesDesdeJingle + 1;

    const nuevaPublicidad =
      cancionesDesdePublicidad + 1;

    setCancionesDesdeJingle(
      nuevoJingle
    );

    setCancionesDesdePublicidad(
      nuevaPublicidad
    );

    /*
      Prioridad 1: especial de música mezclada en vivo.
    */
    const especial =
      await reproducirEspecialEnVivoSiCorresponde();

    if (especial) {
      return;
    }

    /*
      Prioridad 2: programa normal en horario.
    */
    const programa =
      await reproducirProgramaEnHorarioSiCorresponde();

    if (programa) {
      return;
    }

    /*
      Prioridad 3: publicidad cada 4 canciones.
    */
    if (
      nuevaPublicidad >= 4
    ) {
      const publicidad =
        await insertarPublicidadRadio();

      if (publicidad) {
        return;
      }
    }

    /*
      Prioridad 4: jingle cada 2 canciones.
    */
    if (
      nuevoJingle >= 2
    ) {
      const jingle =
        await insertarJingleRadio();

      if (jingle) {
        return;
      }
    }

    await siguienteRadio();
  }

  function indiceAleatorioRadio(excluir = -1) {
    if (!cancionesRadio.length) return -1;
    if (cancionesRadio.length === 1) return 0;

    let nuevo = excluir;
    let intentos = 0;

    while (nuevo === excluir && intentos < 20) {
      nuevo = Math.floor(Math.random() * cancionesRadio.length);
      intentos++;
    }

    return nuevo;
  }

  async function iniciarRadio() {
    setRadioAbierta(true);
    setRadioActiva(true);
    setModoKaraoke(false);

    const programacion =
      await cargarProgramacionRadio();

    const listaEnVivo: EspecialRadio[] =
      Array.isArray(
        programacion?.especiales
      )
        ? programacion.especiales
        : especialesRadio;

    const configEnVivo: RadioEnVivoConfig = {
      activo:
        String(
          programacion?.radioEnVivo?.activo ||
          radioEnVivoConfig.activo ||
          "NO"
        ).toUpperCase() === "SI"
          ? "SI"
          : "NO",
      nombre:
        String(
          programacion?.radioEnVivo?.nombre ||
          radioEnVivoConfig.nombre ||
          "Música Mezclada en Vivo"
        ),
    };

    setEspecialesRadio(
      listaEnVivo
    );

    setRadioEnVivoConfig(
      configEnVivo
    );

    if (
      configEnVivo.activo === "SI" &&
      listaEnVivo.length > 0
    ) {
      await reproducirPistaRadioEnVivo(
        0,
        listaEnVivo,
        configEnVivo
      );

      return;
    }

    if (!cancionesRadio.length) {
      setRadioActiva(false);
      return;
    }

    const programaInicial =
      programacion?.programaActual || null;

    if (
      programaInicial &&
      programaInicial.driveId &&
      programaInicial.id !== programaReproducidoId
    ) {
      setProgramaReproducidoId(
        programaInicial.id
      );

      await reproducirExtraRadio({
        tipo: "PROGRAMA",
        id: programaInicial.id,
        titulo: programaInicial.nombre,
        subtitulo:
          programaInicial.locutor ||
          "Mundo Música",
        portada:
          programaInicial.portada || "",
        driveId:
          programaInicial.driveId,
      });

      return;
    }

    let indice =
      radioIndice;

    if (
      indice < 0 ||
      indice >= cancionesRadio.length
    ) {
      indice = 0;
    }

    if (
      radioAleatoria &&
      cancionesRadio.length > 1
    ) {
      indice =
        indiceAleatorioRadio(
          -1
        );
    }

    await reproducirCancionRadio(
      cancionesRadio[indice],
      indice
    );
  }

  async function siguienteRadio() {
    if (!cancionesRadio.length) {
      return;
    }

    if (
      contenidoRadioActual?.tipo === "CANCION" &&
      actual?.id
    ) {
      setHistorialRadio(
        (items) =>
          [
            actual.id,
            ...items.filter(
              (id) =>
                id !== actual.id
            ),
          ].slice(
            0,
            5
          )
      );
    }

    let siguienteIndice =
      radioAleatoria
        ? indiceAleatorioRadio(
            radioIndice
          )
        : (
            radioIndice + 1
          ) %
          cancionesRadio.length;

    if (
      siguienteIndice < 0
    ) {
      siguienteIndice = 0;
    }

    await reproducirCancionRadio(
      cancionesRadio[
        siguienteIndice
      ],
      siguienteIndice
    );
  }

  async function anteriorRadio() {
    if (
      contenidoRadioActual?.tipo !== "CANCION"
    ) {
      await siguienteRadio();
      return;
    }

    if (!historialRadio.length) {
      return;
    }

    const anteriorId =
      historialRadio[0];

    const cancion =
      cancionesRadio.find(
        (c) =>
          c.id === anteriorId
      );

    if (!cancion) {
      return;
    }

    const indice =
      cancionesRadio.findIndex(
        (c) =>
          c.id === anteriorId
      );

    setHistorialRadio(
      (items) =>
        items.slice(1)
    );

    await reproducirCancionRadio(
      cancion,
      indice >= 0
        ? indice
        : 0
    );
  }

  async function seleccionar(
    c: Cancion,
    desdeRadio = false
  ) {
    if (
      audioLibroRef.current &&
      !audioLibroRef.current.paused
    ) {
      audioLibroRef.current.pause();
    }

    if (
      !desdeRadio
    ) {
      setRadioActiva(false);
      setContenidoRadioActual(null);
    }

    if (
      actual?.id === c.id &&
      reproduciendo &&
      audioRef.current
    ) {
      audioRef.current.pause();
      return;
    }

    setActual(c);
    setActualSeg(0);
    setDuracion(0);
    setModoKaraoke(false);

    registrarReproduccion(c);

    setRecientes((actuales) => {
      const nuevos = [c.id, ...actuales.filter((x) => x !== c.id)].slice(0, 20);

      try {
        window.localStorage.setItem(
          "mundo_musica_recientes",
          JSON.stringify(nuevos)
        );
      } catch (e) {
        console.error("No se pudo guardar recientes:", e);
      }

      return nuevos;
    });

    setTimeout(async () => {
      try {
        if (!audioRef.current) return;
        audioRef.current.load();
        await audioRef.current.play();
      } catch (e) {
        console.error(e);
      }
    }, 80);
  }

  async function playPause() {
    if (
      radioActiva &&
      contenidoRadioActual &&
      audioRef.current
    ) {
      try {
        if (reproduciendo) {
          audioRef.current.pause();
        } else {
          await audioRef.current.play();
        }
      } catch (e) {
        console.error(e);
      }

      return;
    }

    if (!actual) {
      if (canciones.length) {
        await seleccionar(
          canciones[0]
        );
      }
      return;
    }

    if (!audioRef.current) return;

    try {
      if (reproduciendo) audioRef.current.pause();
      else await audioRef.current.play();
    } catch (e) {
      console.error(e);
    }
  }

  function indiceActual() {
    return actual
      ? canciones.findIndex((c) => c.id === actual.id)
      : -1;
  }

  function siguiente() {
    if (!canciones.length) return;
    const i = indiceActual();
    seleccionar(canciones[i < 0 || i >= canciones.length - 1 ? 0 : i + 1]);
  }

  function anterior() {
    if (!canciones.length) return;
    const i = indiceActual();
    seleccionar(canciones[i <= 0 ? canciones.length - 1 : i - 1]);
  }

  function actualizarContadorLocal(
    id: string,
    incremento = 1
  ) {
    setCanciones((actuales) =>
      actuales.map((c) =>
        c.id === id
          ? {
              ...c,
              reproducciones:
                Number(
                  c.reproducciones || 0
                ) + incremento,
            }
          : c
      )
    );
  }

  function guardarReproduccionPendiente(
    id: string,
    cantidad = 1
  ) {
    try {
      const raw =
        window.localStorage.getItem(
          REPRO_PENDIENTES_KEY
        );

      const mapa: Record<string, number> =
        raw
          ? JSON.parse(raw)
          : {};

      mapa[id] =
        Number(
          mapa[id] || 0
        ) + cantidad;

      window.localStorage.setItem(
        REPRO_PENDIENTES_KEY,
        JSON.stringify(mapa)
      );
    } catch (e) {
      console.error(
        "No se pudo guardar reproducción pendiente:",
        e
      );
    }
  }

  async function registrarReproduccion(
    c: Cancion
  ) {
    actualizarContadorLocal(
      c.id,
      1
    );

    try {
      const r =
        await fetchMiembro(
          "/api/reproducciones",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id: c.id,
                cantidad: 1,
              }),
            keepalive: true,
          }
        );

      const d =
        await r.json();

      if (!r.ok || !d.ok) {
        throw new Error(
          d.mensaje ||
          "No se pudo registrar."
        );
      }

      if (
        Number.isFinite(
          Number(
            d.reproducciones
          )
        )
      ) {
        setCanciones(
          (actuales) =>
            actuales.map(
              (item) =>
                item.id === c.id
                  ? {
                      ...item,
                      reproducciones:
                        Number(
                          d.reproducciones
                        ),
                    }
                  : item
            )
        );
      }

    } catch (e) {
      console.error(
        "Reproducción pendiente de sincronizar:",
        e
      );

      guardarReproduccionPendiente(
        c.id,
        1
      );
    }
  }

  async function sincronizarReproduccionesPendientes() {
    try {
      const raw =
        window.localStorage.getItem(
          REPRO_PENDIENTES_KEY
        );

      if (!raw) {
        return;
      }

      const mapa: Record<string, number> =
        JSON.parse(raw);

      const entradas =
        Object.entries(mapa)
          .filter(
            ([id, cantidad]) =>
              Boolean(id) &&
              Number(cantidad) > 0
          );

      if (!entradas.length) {
        window.localStorage.removeItem(
          REPRO_PENDIENTES_KEY
        );
        return;
      }

      const fallidas:
        Record<string, number> = {};

      for (
        const [id, cantidad]
        of entradas
      ) {
        try {
          const r =
            await fetchMiembro(
              "/api/reproducciones",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify({
                    id,
                    cantidad,
                  }),
              }
            );

          const d =
            await r.json();

          if (!r.ok || !d.ok) {
            throw new Error(
              d.mensaje || "Error"
            );
          }

          if (
            Number.isFinite(
              Number(
                d.reproducciones
              )
            )
          ) {
            setCanciones(
              (actuales) =>
                actuales.map(
                  (item) =>
                    item.id === id
                      ? {
                          ...item,
                          reproducciones:
                            Number(
                              d.reproducciones
                            ),
                        }
                      : item
                )
            );
          }

        } catch {
          fallidas[id] =
            Number(cantidad);
        }
      }

      if (
        Object.keys(
          fallidas
        ).length
      ) {
        window.localStorage.setItem(
          REPRO_PENDIENTES_KEY,
          JSON.stringify(
            fallidas
          )
        );
      } else {
        window.localStorage.removeItem(
          REPRO_PENDIENTES_KEY
        );
      }

    } catch (e) {
      console.error(
        "No se pudieron sincronizar reproducciones pendientes:",
        e
      );
    }
  }

  async function enviarSolicitudCancion() {
    const cancion =
      solicitud.cancion.trim();

    const artista =
      solicitud.artista.trim();

    if (!cancion || !artista) {
      setMensajeSolicitud(
        "⚠️ Escribe el nombre de la canción y el artista."
      );
      return;
    }

    try {
      setEnviandoSolicitud(true);
      setMensajeSolicitud("");

      const r = await fetchMiembro(
        "/api/solicitudes",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(
              solicitud
            ),
        }
      );

      const d =
        await r.json();

      if (!r.ok || !d.ok) {
        throw new Error(
          d.mensaje ||
          "No se pudo enviar la solicitud."
        );
      }

      setMensajeSolicitud(
        `✅ Solicitud enviada. Código: ${d?.solicitud?.id || "registrada"}`
      );

      setSolicitud({
        nombreOyente: "",
        cancion: "",
        artista: "",
        dedicatoria: "",
        whatsapp: "",
      });

    } catch (e) {
      console.error(e);

      setMensajeSolicitud(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo enviar la solicitud."
      );

    } finally {
      setEnviandoSolicitud(false);
    }
  }

  function cambiarVista(vista: "PORTADAS" | "LISTA") {
    setVistaBiblioteca(vista);

    try {
      window.localStorage.setItem("mundo_musica_vista", vista);
    } catch (e) {
      console.error("No se pudo guardar vista:", e);
    }
  }

  async function actualizarOfflineIds() {
    if (!("caches" in window)) {
      setOfflineIds([]);
      setOfflinePortadas(0);
      return;
    }

    try {
      const cache = await caches.open("mundo-musica-offline-audio-v1");
      const keys = await cache.keys();

      const ids = keys
        .map((req) => {
          try {
            const url = new URL(req.url);
            const partes = url.pathname.split("/");
            const i = partes.indexOf("audio");
            return i >= 0 ? decodeURIComponent(partes[i + 1] || "") : "";
          } catch {
            return "";
          }
        })
        .filter(Boolean);

      setOfflineIds(Array.from(new Set(ids)));

      const cachePortadas =
        await caches.open(PORTADAS_CACHE_NAME);

      const portadas =
        await cachePortadas.keys();

      setOfflinePortadas(
        portadas.length
      );

    } catch (e) {
      console.error("No se pudo consultar contenido offline:", e);
    }
  }

  async function guardarPortadaOffline(c: Cancion) {
    const url =
      String(c.portada || "")
        .trim();

    if (!url || !("caches" in window)) {
      return;
    }

    try {
      const cache =
        await caches.open(
          PORTADAS_CACHE_NAME
        );

      const existente =
        await cache.match(url);

      if (existente) {
        return;
      }

      let respuesta: Response;

      try {
        respuesta =
          await fetch(url, {
            cache: "no-store",
          });
      } catch {
        respuesta =
          await fetch(url, {
            mode: "no-cors",
            cache: "no-store",
          });
      }

      if (
        respuesta.ok ||
        respuesta.type === "opaque"
      ) {
        await cache.put(
          url,
          respuesta.clone()
        );
      }

    } catch (e) {
      console.error(
        "No se pudo guardar portada offline:",
        c.titulo,
        e
      );
    }
  }

  async function guardarCancionOffline(c: Cancion) {
    if (!c.driveId || !("caches" in window)) {
      throw new Error("El navegador no permite guardar esta canción offline.");
    }

    const url = urlAudioMiembro(c.driveId);
    const cache = await caches.open("mundo-musica-offline-audio-v1");

    const existente = await cache.match(url);

    if (!existente) {
      const respuesta = await fetch(url, { cache: "no-store" });

      if (!respuesta.ok) {
        throw new Error(`No se pudo guardar ${c.titulo}.`);
      }

      await cache.put(url, respuesta.clone());
    }

    await guardarPortadaOffline(c);
    await actualizarOfflineIds();
  }

  async function guardarUnaOffline(c: Cancion) {
    try {
      setMensajeOffline(`⏳ Guardando "${c.titulo}" para escuchar sin internet...`);
      await guardarCancionOffline(c);
      setMensajeOffline(`✅ "${c.titulo}" quedó disponible sin internet.`);
    } catch (e) {
      console.error(e);
      setMensajeOffline(
        e instanceof Error ? `❌ ${e.message}` : "❌ No se pudo guardar la canción."
      );
    }
  }

  async function guardarTodasOffline() {
    const disponibles = canciones.filter((c) => Boolean(c.driveId));

    if (!disponibles.length) {
      setMensajeOffline("⚠️ No hay canciones disponibles para guardar.");
      return;
    }

    try {
      setGuardandoOffline(true);
      setMensajeOffline("");
      setProgresoOffline({ actual: 0, total: disponibles.length });

      for (let i = 0; i < disponibles.length; i++) {
        setProgresoOffline({ actual: i + 1, total: disponibles.length });
        await guardarCancionOffline(disponibles[i]);
      }

      setMensajeOffline(
        `✅ ${disponibles.length} canciones y sus portadas quedaron guardadas para escuchar sin internet en este dispositivo.`
      );
    } catch (e) {
      console.error(e);
      setMensajeOffline(
        e instanceof Error ? `❌ ${e.message}` : "❌ No se pudieron guardar todas."
      );
    } finally {
      setGuardandoOffline(false);
      await actualizarOfflineIds();
    }
  }

  async function borrarOffline() {
    if (!("caches" in window)) return;

    try {
      await caches.delete("mundo-musica-offline-audio-v1");
      await caches.delete(PORTADAS_CACHE_NAME);
      setOfflineIds([]);
      setOfflinePortadas(0);
      setMensajeOffline(
        "✅ Se eliminó la música y las portadas offline de este dispositivo."
      );
    } catch (e) {
      console.error(e);
      setMensajeOffline("❌ No se pudo limpiar el contenido offline.");
    }
  }

  function alternarFavorito(id: string) {
    setFavoritos((actuales) => {
      const existe = actuales.includes(id);

      const nuevos = existe
        ? actuales.filter((x) => x !== id)
        : [...actuales, id];

      try {
        window.localStorage.setItem(
          "mundo_musica_favoritos",
          JSON.stringify(nuevos)
        );
      } catch (e) {
        console.error("No se pudo guardar favorito:", e);
      }

      return nuevos;
    });
  }

  function esFavorito(id?: string) {
    return Boolean(id && favoritos.includes(id));
  }

  function ir(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const cancionesFavoritas = favoritos
    .map((id) => canciones.find((c) => c.id === id))
    .filter(Boolean) as Cancion[];

  const cancionesRecientes = recientes
    .map((id) => canciones.find((c) => c.id === id))
    .filter(Boolean) as Cancion[];

  const artistas = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nombre: string;
        portada: string;
        canciones: number;
      }
    >();

    canciones.forEach((c) => {
      const nombre =
        String(c.artista || "Artista desconocido").trim() ||
        "Artista desconocido";

      const clave =
        nombre.toLowerCase();

      const actualArtista =
        mapa.get(clave);

      if (actualArtista) {
        actualArtista.canciones += 1;

        if (!actualArtista.portada && c.portada) {
          actualArtista.portada = c.portada;
        }
      } else {
        mapa.set(clave, {
          nombre,
          portada: c.portada || "",
          canciones: 1,
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [canciones]);

  const masEscuchadas = useMemo(() => {
    return [...canciones]
      .sort(
        (a, b) =>
          Number(
            b.reproducciones || 0
          ) -
          Number(
            a.reproducciones || 0
          )
      )
      .slice(0, 5);
  }, [canciones]);

  const totalReproducciones = useMemo(() => {
    return canciones.reduce(
      (total, c) =>
        total +
        Number(
          c.reproducciones || 0
        ),
      0
    );
  }, [canciones]);

  const cancionesRadio = useMemo(() => {
    return canciones.filter(
      (c) =>
        String(c.radio || "")
          .trim()
          .toUpperCase() === "SI"
    );
  }, [canciones]);

  const siguientePistaRadioEnVivo = useMemo(() => {
    if (
      radioEnVivoConfig.activo !== "SI" ||
      !especialesRadio.length
    ) {
      return null;
    }

    return especialesRadio[
      (
        indiceRadioEnVivo +
        1
      ) %
      especialesRadio.length
    ] || null;
  }, [
    radioEnVivoConfig.activo,
    especialesRadio,
    indiceRadioEnVivo
  ]);

  const cancionesKaraoke = useMemo(() => {
    return canciones.filter(
      (c) =>
        String(
          c.karaoke || ""
        )
        .trim()
        .toUpperCase() === "SI" &&
        String(
          c.letraLrc || ""
        ).trim()
    );
  }, [canciones]);

  const lineasKaraoke = useMemo(
    () =>
      parsearLrc(
        actual?.letraLrc || ""
      ),
    [
      actual?.id,
      actual?.letraLrc
    ]
  );

  const indiceLineaKaraoke = useMemo(() => {
    if (!lineasKaraoke.length) {
      return -1;
    }

    let indice = 0;

    for (
      let i = 0;
      i < lineasKaraoke.length;
      i++
    ) {
      if (
        lineasKaraoke[i].tiempo <=
        actualSeg + 0.05
      ) {
        indice = i;
      } else {
        break;
      }
    }

    return indice;
  }, [
    lineasKaraoke,
    actualSeg
  ]);

  const albumes = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nombre: string;
        artista: string;
        portada: string;
        canciones: number;
      }
    >();

    canciones.forEach((c) => {
      const nombre =
        String(c.album || "").trim();

      if (!nombre) {
        return;
      }

      const artista =
        String(c.artista || "Artista desconocido").trim() ||
        "Artista desconocido";

      const clave =
        `${artista.toLowerCase()}__${nombre.toLowerCase()}`;

      const actualAlbum =
        mapa.get(clave);

      if (actualAlbum) {
        actualAlbum.canciones += 1;

        if (!actualAlbum.portada && c.portada) {
          actualAlbum.portada = c.portada;
        }
      } else {
        mapa.set(clave, {
          nombre,
          artista,
          portada: c.portada || "",
          canciones: 1,
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [canciones]);

  if (
    configurada === null ||
    (
      configurada === true &&
      estadoAcceso === "COMPROBANDO"
    )
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07070b] p-5 text-white">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-pink-500 text-4xl shadow-2xl">
            🎵
          </div>

          <h1 className="mt-5 text-3xl font-black">
            MUNDO <span className="text-purple-400">MÚSICA</span>
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Comprobando tu acceso...
          </p>

          <div className="mx-auto mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-purple-500" />
          </div>
        </div>
      </main>
    );
  }

  if (
    configurada === true &&
    estadoAcceso !== "ACTIVO"
  ) {
    const enlaceAdmin =
      enlaceWhatsappAdministrador();

    return (
      <main className="min-h-screen bg-[#07070b] text-white">
        {cintilloVisible && cintilloPublico && (
          <div
            className={`sticky top-0 z-[200] border-b px-3 py-2 text-white shadow-lg ${
              cintilloPublico.tipo === "EN_VIVO"
                ? "border-red-400/30 bg-gradient-to-r from-red-700 via-pink-600 to-purple-700"
                : cintilloPublico.tipo === "PUBLICIDAD"
                ? "border-amber-300/30 bg-gradient-to-r from-amber-600 via-orange-600 to-pink-600"
                : "border-purple-300/30 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-pink-600"
            }`}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center">
              <span
                className={`shrink-0 text-xs font-black ${
                  cintilloPublico.tipo === "EN_VIVO"
                    ? "animate-pulse"
                    : ""
                }`}
              >
                {cintilloPublico.tipo === "EN_VIVO"
                  ? "🔴 EN VIVO"
                  : cintilloPublico.tipo === "PUBLICIDAD"
                  ? "📢"
                  : "📣"}
              </span>

              <p className="line-clamp-1 min-w-0 text-[11px] font-black sm:text-xs">
                {cintilloPublico.texto}
              </p>

              {cintilloPublico.enlace && (
                <a
                  href={cintilloPublico.enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-black backdrop-blur"
                >
                  {cintilloPublico.textoBoton || "Ver"}
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-2">
          <div className="hidden lg:block">
            <div className="inline-flex rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-300">
              🎧 Música • Radio • Karaoke • Audiolibros
            </div>

            <h1 className="mt-7 text-6xl font-black leading-[1.05]">
              Bienvenido a
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-orange-300 bg-clip-text text-transparent">
                Mundo Música
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-400">
              Tu biblioteca musical privada para miembros.
              Ingresa con el token personal que recibiste
              al activar tu membresía.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
              {[
                ["🎵", "Música"],
                ["📻", "Radio"],
                ["🎤", "Karaoke"],
                ["📚", "Audiolibros"],
              ].map(([icono, texto]) => (
                <div
                  key={texto}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                >
                  <span className="text-2xl">
                    {icono}
                  </span>
                  <p className="mt-2 font-black">
                    {texto}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-md rounded-[32px] border border-purple-500/20 bg-[#111117] p-6 shadow-2xl md:p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center">
                <img
                  src="/logo-mundo-musica.png"
                  alt="Mundo Música"
                  className="h-auto w-44 drop-shadow-[0_0_28px_rgba(0,174,255,0.20)] md:w-48"
                />
              </div>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-purple-300">
                Acceso de miembros
              </p>

              <h2 className="mt-2 text-3xl font-black">
                MUNDO MÚSICA
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Ingresa tu token personal. Después este dispositivo recordará tu acceso automáticamente.
              </p>
            </div>

            <div className="mt-7">
              <label className="block text-xs font-black uppercase tracking-[0.15em] text-gray-500">
                Token de acceso
              </label>

              <div className="mt-2 flex h-14 items-center rounded-2xl border border-white/10 bg-black/30 px-4">
                <span className="mr-3 text-xl">
                  🔑
                </span>

                <input
                  value={codigoIngreso}
                  onChange={(e) =>
                    setCodigoIngreso(
                      e.target.value.toUpperCase()
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter"
                    ) {
                      ingresarConWhatsapp();
                    }
                  }}
                  autoComplete="one-time-code"
                  placeholder="Ej: MM-8F3A7C21"
                  className="h-full min-w-0 flex-1 bg-transparent text-base font-black uppercase tracking-wider outline-none placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-700"
                />
              </div>

              <p className="mt-2 text-[11px] leading-5 text-gray-600">
                El administrador genera este token al activar tu membresía.
                Después del primer ingreso correcto, este dispositivo recordará tu sesión.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-purple-500/15 bg-purple-500/[0.04] p-3 text-[11px] leading-5 text-purple-100/80">
              🔐 Tu token pertenece únicamente a tu membresía y al número registrado por el administrador.
            </div>

            {mensajeIngreso && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-4">
                <p className="text-sm font-bold leading-6 text-red-200">
                  🚫 {mensajeIngreso}
                </p>
              </div>
            )}

            <button
              onClick={ingresarConWhatsapp}
              disabled={ingresando}
              className="mt-5 h-14 w-full rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-base font-black shadow-xl disabled:opacity-50"
            >
              {ingresando
                ? "⏳ Validando acceso..."
                : "Ingresar con mi token"}
            </button>

            {enlaceAdmin ? (
              <a
                href={enlaceAdmin}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/[0.07] text-sm font-black text-green-300"
              >
                💬 Comunicarme con el administrador
              </a>
            ) : (
              <div className="mt-4 rounded-xl bg-white/[0.03] p-3 text-center text-xs leading-5 text-gray-600">
                Si todavía no tienes acceso, comunícate con el administrador
                para realizar el pago de tu membresía.
              </div>
            )}

            <p className="mt-6 text-center text-[10px] leading-5 text-gray-700">
              El acceso requiere una membresía activa y un token válido.
            </p>
          </div>
        </div>

        {mostrarConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-[#111117] p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-3xl">
                🎵
              </div>
              <h3 className="mt-4 text-xl font-black">
                Servicio temporalmente no disponible
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Mundo Música está terminando de conectarse. Intenta nuevamente en unos segundos o comunícate con el administrador.
              </p>
              <button
                onClick={async () => {
                  const ok = await comprobarConfig();
                  if (ok) {
                    setMostrarConfig(false);
                    const acceso = await comprobarAcceso(true);
                    if (acceso) {
                      await cargarCanciones();
                      await cargarAudiolibros();
                      await cargarProgramacionRadio();
                    }
                  }
                }}
                className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 font-black"
              >
                🔄 Intentar nuevamente
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07070b] pb-36 text-white md:pb-28">
      {cintilloVisible && cintilloPublico && (
        <div
          className={`sticky top-0 z-[10000] border-b px-3 py-2 text-white shadow-lg ${
            cintilloPublico.tipo === "EN_VIVO"
              ? "border-red-400/30 bg-gradient-to-r from-red-700 via-pink-600 to-purple-700"
              : cintilloPublico.tipo === "PUBLICIDAD"
              ? "border-amber-300/30 bg-gradient-to-r from-amber-600 via-orange-600 to-pink-600"
              : "border-purple-300/30 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-pink-600"
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center">
            <span
              className={`shrink-0 text-xs font-black ${
                cintilloPublico.tipo === "EN_VIVO"
                  ? "animate-pulse"
                  : ""
              }`}
            >
              {cintilloPublico.tipo === "EN_VIVO"
                ? "🔴 EN VIVO"
                : cintilloPublico.tipo === "PUBLICIDAD"
                ? "📢"
                : "📣"}
            </span>

            <p className="line-clamp-1 min-w-0 text-[11px] font-black sm:text-xs md:text-sm">
              {cintilloPublico.texto}
            </p>

            {cintilloPublico.enlace && (
              <a
                href={cintilloPublico.enlace}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-black backdrop-blur md:px-3 md:text-xs"
              >
                {cintilloPublico.textoBoton || "Ver"}
              </a>
            )}
          </div>
        </div>
      )}
      {/* DESKTOP HEADER */}
      <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#07070b]/95 backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo-mundo-musica.png"
              alt="Mundo Música"
              className="h-auto w-16 shrink-0"
            />
            <div>
              <h1 className="text-xl font-black">
                MUNDO <span className="text-purple-400">MÚSICA</span>
              </h1>
              <p className="text-xs text-gray-400">Escucha • Descubre • Disfruta</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm font-bold text-gray-300">
            <button onClick={() => ir("inicio")}>Inicio</button>
            <button onClick={() => ir("musica")}>Música</button>
            <button onClick={() => ir("buscar")}>Buscar</button>
            <button onClick={() => ir("solicitar")}>Solicitar canción</button>
            <button onClick={() => ir("audiolibros")}>Audiolibros</button>
            <button onClick={() => ir("radio")}>Radio</button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 lg:block">
              <p className="max-w-[160px] truncate text-xs font-black">
                {miembroActual?.nombre || "Miembro"}
              </p>
              <p className="max-w-[160px] truncate text-[10px] text-purple-300">
                {miembroActual?.plan || "Membresía activa"}
              </p>
            </div>

            <a
              href="/admin"
              className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-300"
              title="Administrador"
            >
              ⚙️
            </a>

            <button
              onClick={cerrarSesionMiembro}
              className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-sm font-black text-red-300"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07070b]/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo-mundo-musica.png"
              alt="Mundo Música"
              className="h-auto w-11 shrink-0"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                  Mundo Música
                </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  online
                    ? "bg-green-500/10 text-green-300"
                    : "bg-yellow-500/10 text-yellow-300"
                }`}
              >
                {online ? "ONLINE" : "SIN INTERNET"}
              </span>
            </div>
            <h1 className="text-xl font-black">
              {seccionMovil === "FAVORITOS"
                ? "Favoritos"
                : seccionMovil === "MIMUSICA"
                ? "Mi música"
                : seccionMovil === "BUSCAR"
                ? "Buscar"
                : "Tu música"}
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/15"
              title="Administrador"
            >
              ⚙️
            </a>

            <button
              onClick={cerrarSesionMiembro}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-sm"
              title="Cerrar sesión"
            >
              ↪
            </button>
          </div>
        </div>
      </header>

      {/* ESTADO OFFLINE / CATALOGO LOCAL */}
      {(!online || catalogoDesdeCache) && (
        <div className="mx-auto max-w-7xl px-4 pt-3 md:px-5">
          <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
            <span className="text-lg">📴</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-yellow-200">
                  Modo sin conexión
                </p>
                <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold text-yellow-300">
                  OFFLINE 4F2
                </span>
              </div>
              <p className="text-xs leading-5 text-yellow-100/70">
                Estás viendo el catálogo guardado en este dispositivo.
                Las canciones marcadas para offline pueden seguir reproduciéndose.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section id="inicio" className={`${seccionMovil === "INICIO" || seccionMovil === "BUSCAR" ? "block" : "hidden"} mx-auto max-w-7xl px-4 pt-6 md:block md:px-5 md:py-20`}>
        <div className="hidden max-w-3xl md:block">
          <div className="mb-5 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
            🎧 Tu música favorita en un solo lugar
          </div>
          <h2 className="text-6xl font-black leading-tight">
            La música que quieres
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-orange-300 bg-clip-text text-transparent">
              escuchar está aquí
            </span>
          </h2>
        </div>

        <div className="md:hidden">
          <h2 className="text-3xl font-black leading-tight">
            ¿Qué quieres escuchar?
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Canciones, artistas y géneros en un solo lugar.
          </p>
        </div>

        <div
          id="buscar"
          className="mt-5 flex max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 md:mt-8"
        >
          <span className="text-xl">🔎</span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar canción, artista o género"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500 md:h-12 md:text-base"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* EXPLORADOR DE BUSQUEDA */}
      <section
        className={`${seccionMovil === "BUSCAR" ? "block" : "hidden"} mx-auto max-w-7xl px-4 pt-5 md:hidden`}
      >
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            ["CANCIONES", "🎵 Canciones"],
            ["ARTISTAS", "🎤 Artistas"],
            ["ALBUMES", "💿 Álbumes"],
            ["SOLICITAR", "➕ Solicitar"],
          ].map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() =>
                setModoBusqueda(
                  valor as "CANCIONES" | "ARTISTAS" | "ALBUMES" | "SOLICITAR"
                )
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
                modoBusqueda === valor
                  ? "bg-purple-500 text-white"
                  : "border border-white/10 bg-white/5 text-gray-300"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        {modoBusqueda === "ARTISTAS" && (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black">🎤 Todos los artistas</h3>
              <span className="text-xs text-gray-500">{artistas.length}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {artistas.map((artista) => (
                <button
                  key={artista.nombre}
                  onClick={() => {
                    setBusqueda(artista.nombre);
                    setModoBusqueda("CANCIONES");
                    setTimeout(() => ir("musica"), 50);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left"
                >
                  <div className="aspect-square overflow-hidden rounded-full bg-gradient-to-br from-purple-700 to-pink-600">
                    {artista.portada ? (
                      <img
                        src={artista.portada}
                        alt={artista.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-4xl">
                        🎤
                      </span>
                    )}
                  </div>

                  <p className="mt-3 truncate text-sm font-black">
                    {artista.nombre}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {artista.canciones} canción
                    {artista.canciones === 1 ? "" : "es"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {modoBusqueda === "ALBUMES" && (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black">💿 Álbumes</h3>
              <span className="text-xs text-gray-500">{albumes.length}</span>
            </div>

            {albumes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-500">
                Todavía no hay álbumes registrados.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {albumes.map((album) => (
                  <button
                    key={`${album.artista}-${album.nombre}`}
                    onClick={() => {
                      setBusqueda(album.nombre);
                      setModoBusqueda("CANCIONES");
                      setTimeout(() => ir("musica"), 50);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left"
                  >
                    <div className="aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                      {album.portada ? (
                        <img
                          src={album.portada}
                          alt={album.nombre}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-4xl">
                          💿
                        </span>
                      )}
                    </div>

                    <p className="mt-3 truncate text-sm font-black">
                      {album.nombre}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-400">
                      {album.artista}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-600">
                      {album.canciones} canción
                      {album.canciones === 1 ? "" : "es"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {modoBusqueda === "SOLICITAR" && (
          <div className="mt-4 rounded-3xl border border-pink-500/20 bg-gradient-to-br from-purple-950/50 to-pink-950/30 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">
              ¿No está la canción?
            </p>

            <h3 className="mt-2 text-2xl font-black">
              ➕ Solicitar canción
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Envíanos el nombre de la canción y el artista. La solicitud llegará
              directamente al administrador de Mundo Música.
            </p>

            <div className="mt-5 space-y-3">
              <input
                value={solicitud.cancion}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    cancion: e.target.value,
                  })
                }
                placeholder="Nombre de la canción *"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />

              <input
                value={solicitud.artista}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    artista: e.target.value,
                  })
                }
                placeholder="Artista *"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />

              <input
                value={solicitud.nombreOyente}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    nombreOyente: e.target.value,
                  })
                }
                placeholder="Tu nombre (opcional)"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />

              <input
                value={solicitud.whatsapp}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    whatsapp: e.target.value,
                  })
                }
                placeholder="WhatsApp (opcional)"
                inputMode="tel"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />

              <textarea
                value={solicitud.dedicatoria}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    dedicatoria: e.target.value,
                  })
                }
                placeholder="Dedicatoria o comentario (opcional)"
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-4 outline-none"
              />

              {mensajeSolicitud && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-yellow-100">
                  {mensajeSolicitud}
                </div>
              )}

              <button
                onClick={enviarSolicitudCancion}
                disabled={enviandoSolicitud}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 font-black disabled:opacity-50"
              >
                {enviandoSolicitud
                  ? "⏳ Enviando..."
                  : "🎵 Enviar solicitud"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* GENRES MOBILE FIRST */}
      <section className={`${seccionMovil === "INICIO" ? "block" : "hidden"} mx-auto max-w-7xl px-4 pt-7 md:block md:px-5 md:pt-2`}>
        <h3 className="mb-3 text-lg font-black md:text-2xl">Explora por género</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {generosBase.map(([icono, nombre]) => (
            <button
              key={nombre}
              onClick={() => {
                setBusqueda(nombre);
                ir("musica");
              }}
              className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold"
            >
              <span>{icono}</span>
              {nombre}
            </button>
          ))}
        </div>
      </section>

      {/* MOBILE FAVORITES */}
      <section
        className={`${seccionMovil === "FAVORITOS" ? "block" : "hidden"} mx-auto max-w-7xl px-4 py-6 md:hidden`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-400">
              Tu colección
            </p>
            <h2 className="mt-1 text-2xl font-black">❤️ Favoritos</h2>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-2 text-xs text-gray-400">
            {cancionesFavoritas.length}
          </span>
        </div>

        {cancionesFavoritas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7 text-center text-sm text-gray-400">
            Todavía no has agregado canciones a favoritos.
          </div>
        ) : (
          <div className="space-y-2">
            {cancionesFavoritas.map((c) => (
              <button
                key={c.id}
                onClick={() => seleccionar(c)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.035] p-3 text-left"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                  {c.portada ? (
                    <img src={c.portada} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xl">🎵</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{c.titulo}</p>
                  <p className="truncate text-xs text-gray-400">{c.artista}</p>
                </div>
                <span className="text-pink-400">♥</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* MOBILE MY MUSIC */}
      <section
        className={`${seccionMovil === "MIMUSICA" ? "block" : "hidden"} mx-auto max-w-7xl px-4 py-6 md:hidden`}
      >
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
            Tu dispositivo
          </p>
          <h2 className="mt-1 text-2xl font-black">🎵 Mi música</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Guarda canciones en este navegador para poder escucharlas después sin conexión.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs text-gray-500">Favoritos</p>
            <p className="mt-1 text-2xl font-black text-pink-400">
              {cancionesFavoritas.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs text-gray-500">Canciones offline</p>
            <p className="mt-1 text-2xl font-black text-purple-300">
              {offlineIds.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs text-gray-500">Portadas offline</p>
            <p className="mt-1 text-2xl font-black text-orange-300">
              {offlinePortadas}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs text-gray-500">Catálogo</p>
            <p className="mt-1 text-2xl font-black text-blue-300">
              {canciones.length}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-purple-500/20 bg-purple-500/5 p-5">
          <p className="font-black text-purple-200">📥 Escuchar sin internet</p>
          <p className="mt-2 text-xs leading-5 text-gray-400">
            La música y sus portadas se guardan dentro de este navegador/dispositivo.
            No ocupa tu carpeta Descargas y puede eliminarse cuando quieras.
          </p>

          <button
            onClick={async () => {
              if (canciones.length > 0) {
                await guardarCatalogoOffline(canciones);

                try {
                  await fetchMiembro(`/api/musica?prepararOffline=${Date.now()}`, {
                    cache: "no-store",
                  });
                } catch (e) {
                  console.error("No se pudo sembrar cache API:", e);
                }

                setMensajeOffline(
                  `✅ Catálogo preparado: ${canciones.length} canciones guardadas en este dispositivo. Offline 4F2 listo.`
                );
              }
            }}
            disabled={canciones.length === 0}
            className="mt-4 h-11 w-full rounded-2xl border border-white/10 bg-white/5 text-sm font-bold disabled:opacity-50"
          >
            💾 Preparar catálogo para offline
          </button>

          <button
            onClick={guardarTodasOffline}
            disabled={guardandoOffline}
            className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 font-bold disabled:opacity-50"
          >
            {guardandoOffline
              ? `⏳ Guardando ${progresoOffline.actual}/${progresoOffline.total}`
              : `📥 Guardar canciones + portadas (${canciones.length})`}
          </button>

          {offlineIds.length > 0 && (
            <button
              onClick={borrarOffline}
              disabled={guardandoOffline}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-gray-300"
            >
              🗑️ Borrar música offline
            </button>
          )}

          {mensajeOffline && (
            <p className="mt-3 text-xs leading-5 text-yellow-200">
              {mensajeOffline}
            </p>
          )}
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black">🕘 Escuchadas recientemente</h3>
            <span className="text-xs text-gray-500">{cancionesRecientes.length}</span>
          </div>

          {cancionesRecientes.length === 0 ? (
            <p className="rounded-2xl bg-white/5 p-5 text-sm text-gray-500">
              Cuando escuches canciones aparecerán aquí.
            </p>
          ) : (
            <div className="space-y-2">
              {cancionesRecientes.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  onClick={() => seleccionar(c)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.03] p-3 text-left"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-purple-700 to-pink-600">
                    {c.portada ? (
                      <img src={c.portada} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center">🎵</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{c.titulo}</p>
                    <p className="truncate text-xs text-gray-500">{c.artista}</p>
                  </div>
                  <span>▶</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AUDIOLIBROS */}
      <section
        id="audiolibros"
        className={`${seccionMovil === "INICIO" ? "block" : "hidden"} mx-auto max-w-7xl px-4 pt-7 md:block md:px-5 md:pt-10`}
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Escucha y aprende
            </p>
            <h3 className="mt-1 text-2xl font-black md:text-3xl">
              📚 Audiolibros
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Continúa automáticamente desde donde dejaste cada libro.
            </p>
          </div>

          <span className="rounded-full bg-amber-500/10 px-3 py-2 text-[11px] font-black text-amber-200">
            {audiolibros.length} disponibles
          </span>
        </div>

        {audiolibros.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7 text-center">
            <div className="text-4xl">📚</div>
            <p className="mt-3 font-black">
              Próximamente audiolibros
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 xl:grid-cols-5 md:overflow-visible">
            {audiolibros.map((libro) => (
              <article
                key={libro.id}
                className="w-[185px] shrink-0 overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.06] to-white/[0.025] p-3 md:w-auto"
              >
                <button
                  onClick={() =>
                    abrirAudiolibro(
                      libro
                    )
                  }
                  className="block w-full text-left"
                >
                  <div className="aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-br from-amber-700 via-orange-700 to-purple-700">
                    {libro.portada ? (
                      <img
                        src={libro.portada}
                        alt={libro.titulo}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-6xl">
                        📖
                      </span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm font-black">
                    {libro.titulo}
                  </p>

                  <p className="mt-1 truncate text-xs text-amber-200/80">
                    {libro.autor ||
                      "Autor no indicado"}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] text-gray-600">
                      {libro.categoria ||
                        "General"}
                    </span>

                    <span className="shrink-0 text-[10px] font-bold text-gray-500">
                      ▶ {Number(libro.reproducciones || 0)}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() =>
                    abrirAudiolibro(
                      libro
                    )
                  }
                  className="mt-3 h-10 w-full rounded-xl bg-amber-500/15 text-xs font-black text-amber-200"
                >
                  🎧 Escuchar
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* KARAOKE */}
      {cancionesKaraoke.length > 0 && (
        <section
          className={`${seccionMovil === "INICIO" ? "block" : "hidden"} mx-auto max-w-7xl px-4 pt-7 md:block md:px-5 md:pt-8`}
        >
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-300">
                Canta con nosotros
              </p>
              <h3 className="mt-1 text-2xl font-black md:text-3xl">
                🎤 Modo Karaoke
              </h3>
            </div>

            <span className="rounded-full bg-pink-500/10 px-3 py-2 text-[11px] font-bold text-pink-300">
              {cancionesKaraoke.length} disponibles
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:overflow-visible">
            {cancionesKaraoke.map((c) => (
              <button
                key={c.id}
                onClick={async () => {
                  await seleccionar(c);
                  setModoKaraoke(true);
                  setPlayerMovilAbierto(true);
                }}
                className="relative w-[175px] shrink-0 overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-b from-pink-500/[0.08] to-white/[0.025] p-3 text-left md:w-auto"
              >
                <div className="absolute right-2 top-2 z-10 rounded-full bg-black/75 px-2 py-1 text-[10px] font-black text-pink-300">
                  🎤 KARAOKE
                </div>

                <div className="aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                  {c.portada ? (
                    <img
                      src={c.portada}
                      alt={c.titulo}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-5xl">
                      🎤
                    </span>
                  )}
                </div>

                <p className="mt-3 truncate text-sm font-black">
                  {c.titulo}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {c.artista}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* MAS ESCUCHADAS */}
      <section
        className={`${seccionMovil === "INICIO" ? "block" : "hidden"} mx-auto max-w-7xl px-4 pt-7 md:block md:px-5 md:pt-8`}
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
              Tendencias
            </p>
            <h3 className="mt-1 text-2xl font-black md:text-3xl">
              🔥 Más escuchadas
            </h3>
          </div>

          <div className="rounded-full bg-white/5 px-3 py-2 text-[11px] text-gray-500">
            ▶ {totalReproducciones} reproducciones
          </div>
        </div>

        {masEscuchadas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-500">
            Cuando comiencen las reproducciones aparecerá aquí el ranking.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-5 md:overflow-visible">
            {masEscuchadas.map((c, index) => (
              <button
                key={c.id}
                onClick={() => seleccionar(c)}
                className="relative w-[150px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left md:w-auto"
              >
                <div className="absolute left-2 top-2 z-10 flex h-8 min-w-8 items-center justify-center rounded-full bg-black/75 px-2 text-sm font-black">
                  #{index + 1}
                </div>

                <div className="aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                  {c.portada ? (
                    <img
                      src={c.portada}
                      alt={c.titulo}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-5xl">
                      🎵
                    </span>
                  )}
                </div>

                <p className="mt-3 truncate text-sm font-black">
                  {c.titulo}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {c.artista}
                </p>

                <p className="mt-2 text-[11px] font-bold text-orange-300">
                  ▶ {Number(c.reproducciones || 0)} escuchas
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* MUSIC */}
      <section
        id="musica"
        className={`${seccionMovil === "INICIO" || (seccionMovil === "BUSCAR" && modoBusqueda === "CANCIONES") ? "block" : "hidden"} mx-auto max-w-7xl px-4 py-8 md:block md:px-5 md:py-14`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-purple-400">
              Para ti
            </p>
            <h3 className="mt-1 text-2xl font-black md:text-4xl">
              Canciones disponibles
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => cambiarVista("PORTADAS")}
                className={`h-8 rounded-lg px-2 text-xs font-bold ${
                  vistaBiblioteca === "PORTADAS"
                    ? "bg-purple-500 text-white"
                    : "text-gray-400"
                }`}
                title="Ver portadas"
              >
                ▦
              </button>
              <button
                onClick={() => cambiarVista("LISTA")}
                className={`h-8 rounded-lg px-2 text-xs font-bold ${
                  vistaBiblioteca === "LISTA"
                    ? "bg-purple-500 text-white"
                    : "text-gray-400"
                }`}
                title="Ver lista"
              >
                ☷
              </button>
            </div>

            <button
              onClick={cargarCanciones}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold md:text-sm"
            >
              🔄
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={guardarTodasOffline}
            disabled={guardandoOffline}
            className="h-11 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 text-sm font-bold text-purple-200 disabled:opacity-50"
          >
            {guardandoOffline
              ? `⏳ Guardando ${progresoOffline.actual}/${progresoOffline.total}`
              : "📥 Guardar todas sin internet"}
          </button>

          {offlineIds.length > 0 && (
            <span className="flex h-11 items-center rounded-xl bg-green-500/10 px-4 text-xs font-bold text-green-300">
              ✓ {offlineIds.length} guardadas offline
            </span>
          )}
        </div>

        {mensajeOffline && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-yellow-200">
            {mensajeOffline}
          </div>
        )}

        {cargando && canciones.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
            🎵 Cargando canciones...
          </div>
        )}

        {error && canciones.length === 0 && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
            ⚠️ {error}
          </div>
        )}

        {!cargando && !error && filtradas.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
            No encontramos canciones.
          </div>
        )}

        {vistaBiblioteca === "PORTADAS" ? (
          <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
            {filtradas.map((c) => (
              <article
                key={c.id}
                className="w-[168px] shrink-0 rounded-2xl bg-white/[0.035] p-3 md:w-auto md:rounded-3xl md:border md:border-white/10 md:p-4"
              >
                <button
                  onClick={() => seleccionar(c)}
                  className="relative block aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-purple-800 to-pink-600 md:rounded-2xl"
                >
                  {c.portada ? (
                    <img
                      src={c.portada}
                      alt={c.titulo}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-5xl">
                      🎵
                    </span>
                  )}

                  <span className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white font-bold text-black shadow-xl">
                    {actual?.id === c.id && reproduciendo ? "⏸" : "▶"}
                  </span>
                </button>

                <div className="pt-3">
                  <h4 className="truncate font-black md:text-lg">{c.titulo}</h4>
                  <p className="mt-1 truncate text-xs text-gray-400 md:text-sm">
                    {c.artista}
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-[11px] font-bold text-gray-600">
                      ▶ {Number(c.reproducciones || 0)} reproducciones
                    </p>

                    {String(c.karaoke || "").toUpperCase() === "SI" &&
                      c.letraLrc && (
                        <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[9px] font-black text-pink-300">
                          🎤 Karaoke
                        </span>
                      )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="truncate rounded-full bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-300">
                      {c.genero || "Variada"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => guardarUnaOffline(c)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                          offlineIds.includes(c.driveId)
                            ? "bg-green-500/10 text-green-300"
                            : "bg-white/5"
                        }`}
                        title="Guardar sin internet"
                      >
                        {offlineIds.includes(c.driveId) ? "✓" : "📥"}
                      </button>

                      {c.descargable === "SI" && c.driveId && (
                        <a
                          href={urlDownloadMiembro(
                            c.driveId,
                            c.archivoNombre || `${c.artista} - ${c.titulo}.mp3`
                          )}
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs"
                          title="Descargar MP3"
                        >
                          ⬇️
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            {filtradas.map((c, index) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border-b border-white/10 p-3 last:border-b-0 md:p-4"
              >
                <button
                  onClick={() => seleccionar(c)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-bold text-gray-400"
                >
                  {actual?.id === c.id && reproduciendo ? "⏸" : index + 1}
                </button>

                <button
                  onClick={() => seleccionar(c)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-black md:text-base">
                    {c.titulo}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {c.artista}
                    {c.album ? ` • ${c.album}` : ""}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-[10px] font-bold text-gray-600">
                      ▶ {Number(c.reproducciones || 0)} reproducciones
                    </p>
                    {String(c.karaoke || "").toUpperCase() === "SI" &&
                      c.letraLrc && (
                        <span className="text-[9px] font-black text-pink-300">
                          🎤 Karaoke
                        </span>
                      )}
                  </div>
                </button>

                <span className="hidden rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold text-purple-300 sm:block">
                  {c.genero || "Variada"}
                </span>

                <button
                  onClick={() => guardarUnaOffline(c)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs ${
                    offlineIds.includes(c.driveId)
                      ? "bg-green-500/10 text-green-300"
                      : "bg-white/5"
                  }`}
                  title="Guardar sin internet"
                >
                  {offlineIds.includes(c.driveId) ? "✓" : "📥"}
                </button>

                {c.descargable === "SI" && c.driveId && (
                  <a
                    href={urlDownloadMiembro(
                      c.driveId,
                      c.archivoNombre || `${c.artista} - ${c.titulo}.mp3`
                    )}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs text-blue-300"
                    title="Descargar MP3"
                  >
                    ⬇
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SOLICITAR CANCION EN DESKTOP */}
      <section id="solicitar" className="mx-auto hidden max-w-7xl px-5 pb-12 md:block">
        <div className="grid gap-8 rounded-3xl border border-pink-500/20 bg-gradient-to-br from-purple-950/40 via-black to-pink-950/30 p-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-300">
              Solicitudes
            </p>
            <h3 className="mt-3 text-4xl font-black">
              ¿No encuentras una canción?
            </h3>
            <p className="mt-4 max-w-xl leading-7 text-gray-400">
              Pídela desde aquí. La solicitud quedará registrada en Mundo Música
              para que el administrador pueda revisarla, aprobarla y agregarla a
              la biblioteca.
            </p>

            <div className="mt-6 rounded-2xl bg-white/[0.04] p-4 text-sm text-gray-400">
              Próxima fase: podremos usar este mismo buscador para consultar
              contenido disponible mediante Deezer.
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={solicitud.cancion}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    cancion: e.target.value,
                  })
                }
                placeholder="Nombre de la canción *"
                className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />

              <input
                value={solicitud.artista}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    artista: e.target.value,
                  })
                }
                placeholder="Artista *"
                className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />

              <input
                value={solicitud.nombreOyente}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    nombreOyente: e.target.value,
                  })
                }
                placeholder="Tu nombre (opcional)"
                className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />

              <input
                value={solicitud.whatsapp}
                onChange={(e) =>
                  setSolicitud({
                    ...solicitud,
                    whatsapp: e.target.value,
                  })
                }
                placeholder="WhatsApp (opcional)"
                className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />
            </div>

            <textarea
              value={solicitud.dedicatoria}
              onChange={(e) =>
                setSolicitud({
                  ...solicitud,
                  dedicatoria: e.target.value,
                })
              }
              placeholder="Dedicatoria o comentario (opcional)"
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-4 outline-none"
            />

            {mensajeSolicitud && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-yellow-100">
                {mensajeSolicitud}
              </div>
            )}

            <button
              onClick={enviarSolicitudCancion}
              disabled={enviandoSolicitud}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 font-black disabled:opacity-50"
            >
              {enviandoSolicitud
                ? "⏳ Enviando..."
                : "🎵 Enviar solicitud"}
            </button>
          </div>
        </div>
      </section>

      {/* DESCUBRIR EN DESKTOP */}
      <section className="mx-auto hidden max-w-7xl px-5 pb-12 md:block">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-black">🎤 Artistas</h3>
              <span className="text-sm text-gray-500">{artistas.length}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {artistas.slice(0, 6).map((artista) => (
                <button
                  key={artista.nombre}
                  onClick={() => {
                    setBusqueda(artista.nombre);
                    ir("musica");
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left"
                >
                  <div className="aspect-square overflow-hidden rounded-full bg-gradient-to-br from-purple-700 to-pink-600">
                    {artista.portada ? (
                      <img
                        src={artista.portada}
                        alt={artista.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-4xl">
                        🎤
                      </span>
                    )}
                  </div>
                  <p className="mt-3 truncate font-black">{artista.nombre}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {artista.canciones} canción
                    {artista.canciones === 1 ? "" : "es"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-black">💿 Álbumes</h3>
              <span className="text-sm text-gray-500">{albumes.length}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {albumes.slice(0, 6).map((album) => (
                <button
                  key={`${album.artista}-${album.nombre}`}
                  onClick={() => {
                    setBusqueda(album.nombre);
                    ir("musica");
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left"
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                    {album.portada ? (
                      <img
                        src={album.portada}
                        alt={album.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-4xl">
                        💿
                      </span>
                    )}
                  </div>
                  <p className="mt-3 truncate font-black">{album.nombre}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {album.artista}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RADIO */}
      <section
        id="radio"
        className={`${seccionMovil === "INICIO" ? "block" : "hidden"} mx-auto max-w-7xl px-4 pb-10 md:block md:px-5`}
      >
        <div className="overflow-hidden rounded-3xl border border-pink-500/20 bg-gradient-to-br from-[#2b0d34] via-[#130a18] to-black">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-400">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                Mundo Música Radio
              </div>

              <h3 className="mt-4 text-3xl font-black md:text-4xl">
                📻 Tu estación continua
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Cuando <b>EN VIVO</b> está encendido, todos los audios de
                <b> 07 - ESPECIALES RADIO</b> suenan corridos uno detrás de otro.
              </p>

              <p className="mt-2 text-xs text-gray-600">
                Al llegar al último vuelve al primero. Al apagar EN VIVO desde el
                administrador, la emisora regresa automáticamente a la radio normal.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/5 px-3 py-2 text-xs font-bold text-gray-300">
                  🎵 {cancionesRadio.length} canciones
                </span>

                <span className="rounded-full bg-white/5 px-3 py-2 text-xs font-bold text-gray-300">
                  🎙️ {programasRadio.length} programas
                </span>

                <span className="rounded-full bg-white/5 px-3 py-2 text-xs font-bold text-gray-300">
                  🔊 {jinglesRadio.length} jingles
                </span>

                <span className="rounded-full bg-white/5 px-3 py-2 text-xs font-bold text-gray-300">
                  📢 {publicidadRadio.length} publicidades
                </span>

                <span className="rounded-full bg-white/5 px-3 py-2 text-xs font-bold text-pink-300">
                  🎧 {especialesRadio.length} pistas en vivo
                </span>

                <span
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    radioEnVivoConfig.activo === "SI"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-white/5 text-gray-500"
                  }`}
                >
                  {radioEnVivoConfig.activo === "SI"
                    ? "🔴 EN VIVO"
                    : "⚫ EN VIVO APAGADO"}
                </span>
              </div>

              {radioEnVivoConfig.activo === "SI" &&
              especialesRadio.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
                    ● Radio en vivo encendida
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {radioEnVivoConfig.nombre}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    🎧 {especialesRadio.length} pistas • reproducción continua
                  </p>
                </div>
              ) : programaActualRadio ? (
                <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                    ● Programa en horario
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {programaActualRadio.nombre}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {programaActualRadio.locutor || "Mundo Música"}
                    {" • "}
                    {programaActualRadio.horaInicio} - {programaActualRadio.horaFin}
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-xs text-gray-600">
                  Programación automática • {horaServidorRadio || "hora del servidor"}
                </p>
              )}
            </div>

            <button
              onClick={iniciarRadio}
              disabled={!cancionesRadio.length}
              className="h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-7 text-base font-black shadow-xl disabled:opacity-40"
            >
              {radioActiva ? "📻 Abrir Radio" : "▶ Escuchar Radio"}
            </button>
          </div>

          {radioActiva && contenidoRadioActual && (
            <div className="border-t border-white/10 bg-black/20 px-6 py-4 md:px-8">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                  {contenidoRadioActual.portada ? (
                    <img
                      src={contenidoRadioActual.portada}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-2xl">
                      {contenidoRadioActual.tipo === "PUBLICIDAD"
                        ? "📢"
                        : contenidoRadioActual.tipo === "JINGLE"
                        ? "🔊"
                        : contenidoRadioActual.tipo === "PROGRAMA"
                        ? "🎙️"
                        : contenidoRadioActual.tipo === "ESPECIAL"
                        ? "🎧"
                        : "🎵"}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-300">
                    {contenidoRadioActual.tipo === "CANCION"
                      ? "Ahora suena"
                      : contenidoRadioActual.tipo === "JINGLE"
                      ? "Identificador"
                      : contenidoRadioActual.tipo === "PUBLICIDAD"
                      ? "Espacio publicitario"
                      : contenidoRadioActual.tipo === "ESPECIAL"
                      ? "Radio en vivo"
                      : "Programa especial"}
                  </p>
                  <p className="mt-1 truncate font-black">
                    {contenidoRadioActual.titulo}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {contenidoRadioActual.subtitulo}
                  </p>
                </div>

                <button
                  onClick={() => setRadioAbierta(true)}
                  className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black"
                >
                  Abrir
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {radioActiva &&
        contenidoRadioActual?.tipo === "ESPECIAL" &&
        siguientePistaRadioEnVivo?.driveId && (
          <audio
            src={urlAudioMiembro(
              siguientePistaRadioEnVivo.driveId
            )}
            preload="auto"
            className="hidden"
          />
        )}

      {(radioActiva
        ? contenidoRadioActual?.driveId
        : actual?.driveId) && (
        <audio
          ref={audioRef}
          src={urlAudioMiembro(
            radioActiva
              ? contenidoRadioActual?.driveId || ""
              : actual?.driveId || ""
          )}
          preload="metadata"
          onPlay={() => setReproduciendo(true)}
          onPause={() => setReproduciendo(false)}
          onEnded={() => {
            if (radioActiva) {
              manejarFinRadio();
            } else {
              siguiente();
            }
          }}
          onTimeUpdate={(e) => setActualSeg(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuracion(e.currentTarget.duration || 0)}
          onDurationChange={(e) => setDuracion(e.currentTarget.duration || 0)}
        />
      )}

      {/* DESKTOP PLAYER */}
      <div className="fixed bottom-0 left-0 right-0 z-50 hidden border-t border-white/10 bg-[#0c0c12]/95 backdrop-blur-xl md:block">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-4 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-pink-500">
              {actual?.portada ? (
                <img src={actual.portada} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl">🎵</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {actual?.titulo || "Selecciona una canción"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {actual?.artista || "Mundo Música"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={anterior}>⏮</button>
            <button
              onClick={playPause}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-bold text-black"
            >
              {reproduciendo ? "⏸" : "▶"}
            </button>
            <button onClick={siguiente}>⏭</button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <span className="text-xs text-gray-500">{tiempo(actualSeg)}</span>
            <input
              type="range"
              min={0}
              max={duracion || 0}
              step={0.1}
              value={Math.min(actualSeg, duracion || 0)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (audioRef.current) audioRef.current.currentTime = v;
                setActualSeg(v);
              }}
              className="w-40"
            />
            <span className="text-xs text-gray-500">{tiempo(duracion)}</span>
            <span>🔊</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volumen}
              onChange={(e) => setVolumen(Number(e.target.value))}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* MOBILE MINI PLAYER - TODA LA BARRA ABRE EL PLAYER */}
      <div
        onClick={() => {
          if (actual) {
            setPlayerMovilAbierto(true);
          } else {
            playPause();
          }
        }}
        className={`fixed bottom-[66px] left-2 right-2 z-50 cursor-pointer rounded-2xl border border-white/10 bg-[#18181f]/95 p-2 shadow-2xl backdrop-blur-xl md:hidden ${
          playerMovilAbierto ? "hidden" : ""
        }`}
        role="button"
        aria-label="Abrir reproductor completo"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-pink-500">
            {actual?.portada ? (
              <img
                src={actual.portada}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-xl">
                🎵
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">
                  {actual?.titulo || "Selecciona una canción"}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {actual?.artista || "Mundo Música"}
                </p>
              </div>

              {actual && (
                <span className="shrink-0 text-xs text-purple-300">
                  ABRIR ↑
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              playPause();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-bold text-black"
            aria-label={reproduciendo ? "Pausar" : "Reproducir"}
          >
            {reproduciendo ? "⏸" : "▶"}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              siguiente();
            }}
            className="flex h-10 w-8 shrink-0 items-center justify-center"
            aria-label="Siguiente canción"
          >
            ⏭
          </button>
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-purple-500"
            style={{
              width: `${duracion ? Math.min(100, (actualSeg / duracion) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* REPRODUCTOR DE AUDIOLIBROS */}
      {audiolibroAbierto && audiolibroActual && (
        <div className="fixed inset-0 z-[10001] overflow-y-auto bg-[#080705]">
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_40%),linear-gradient(to_bottom,#151008,#080705)] px-4 pb-10 pt-4 md:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setAudiolibroAbierto(false);

                    if (
                      audioLibroRef.current
                    ) {
                      audioLibroRef.current.pause();
                    }
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-xl"
                >
                  ↓
                </button>

                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
                    Mundo Música
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    📚 Audiolibro
                  </p>
                </div>

                <div className="h-11 w-11" />
              </div>

              <audio
                ref={audioLibroRef}
                src={urlAudioMiembro(audiolibroActual.driveId)}
                preload="metadata"
                onLoadedMetadata={(e) => {
                  setAudiolibroDuracion(
                    e.currentTarget.duration || 0
                  );
                }}
                onTimeUpdate={(e) => {
                  const actual =
                    e.currentTarget.currentTime;

                  setAudiolibroSeg(
                    actual
                  );

                  try {
                    window.localStorage.setItem(
                      claveProgresoAudiolibro(
                        audiolibroActual.id
                      ),
                      String(actual)
                    );
                  } catch {
                    // Nada.
                  }
                }}
                onPlay={() =>
                  setAudiolibroReproduciendo(true)
                }
                onPause={() =>
                  setAudiolibroReproduciendo(false)
                }
                onEnded={() => {
                  setAudiolibroReproduciendo(false);

                  try {
                    window.localStorage.removeItem(
                      claveProgresoAudiolibro(
                        audiolibroActual.id
                      )
                    );
                  } catch {
                    // Nada.
                  }
                }}
                className="hidden"
              />

              <div className="mx-auto mt-8 aspect-[4/5] w-full max-w-[310px] overflow-hidden rounded-[28px] bg-gradient-to-br from-amber-700 via-orange-700 to-purple-700 shadow-2xl">
                {audiolibroActual.portada ? (
                  <img
                    src={audiolibroActual.portada}
                    alt={audiolibroActual.titulo}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-8xl">
                    📖
                  </span>
                )}
              </div>

              <div className="mx-auto mt-7 max-w-[620px] text-center">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                  {audiolibroActual.categoria || "Audiolibro"}
                </p>

                <h2 className="mt-3 text-3xl font-black md:text-4xl">
                  {audiolibroActual.titulo}
                </h2>

                <p className="mt-2 text-base text-amber-100/70">
                  {audiolibroActual.autor ||
                    "Autor no indicado"}
                </p>

                {audiolibroActual.descripcion && (
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-400">
                    {audiolibroActual.descripcion}
                  </p>
                )}
              </div>

              <div className="mx-auto mt-7 max-w-[620px]">
                <input
                  type="range"
                  min={0}
                  max={audiolibroDuracion || 0}
                  step={0.5}
                  value={Math.min(
                    audiolibroSeg,
                    audiolibroDuracion || 0
                  )}
                  onChange={(e) => {
                    const valor =
                      Number(
                        e.target.value
                      );

                    if (
                      audioLibroRef.current
                    ) {
                      audioLibroRef.current.currentTime =
                        valor;
                    }

                    setAudiolibroSeg(
                      valor
                    );
                  }}
                  className="w-full"
                />

                <div className="mt-2 flex justify-between text-xs text-gray-600">
                  <span>
                    {tiempo(
                      audiolibroSeg
                    )}
                  </span>

                  <span>
                    {tiempo(
                      audiolibroDuracion
                    )}
                  </span>
                </div>

                <div className="mt-7 flex items-center justify-center gap-6">
                  <button
                    onClick={() => {
                      if (
                        audioLibroRef.current
                      ) {
                        audioLibroRef.current.currentTime =
                          Math.max(
                            0,
                            audioLibroRef.current.currentTime - 30
                          );
                      }
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-xs font-black"
                  >
                    ↶30
                  </button>

                  <button
                    onClick={playPauseAudiolibro}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-3xl font-black text-black shadow-xl"
                  >
                    {audiolibroReproduciendo
                      ? "⏸"
                      : "▶"}
                  </button>

                  <button
                    onClick={() => {
                      if (
                        audioLibroRef.current
                      ) {
                        audioLibroRef.current.currentTime =
                          Math.min(
                            audiolibroDuracion,
                            audioLibroRef.current.currentTime + 30
                          );
                      }
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-xs font-black"
                  >
                    30↷
                  </button>
                </div>

                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600">
                      Reproducciones
                    </p>
                    <p className="mt-1 font-black text-amber-200">
                      ▶ {Number(audiolibroActual.reproducciones || 0)}
                    </p>
                  </div>

                  {audiolibroActual.descargable === "SI" &&
                  audiolibroActual.driveId ? (
                    <a
                      href={urlDownloadMiembro(audiolibroActual.driveId, audiolibroActual.titulo + ".mp3")}
                      className="flex min-h-[68px] items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-black text-amber-200"
                    >
                      ⬇ Descargar audiolibro
                    </a>
                  ) : (
                    <div className="flex min-h-[68px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-xs text-gray-600">
                      Solo disponible para escuchar
                    </div>
                  )}
                </div>

                <p className="mt-5 text-center text-[11px] leading-5 text-gray-600">
                  Tu progreso se guarda en este dispositivo para continuar después
                  desde el mismo punto.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MUNDO MUSICA RADIO */}
      {radioAbierta && (
        <div className="fixed inset-0 z-[9998] overflow-y-auto bg-[#07070b]">
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(219,39,119,0.22),_transparent_38%),linear-gradient(to_bottom,#140a18,#07070b)] px-4 pb-10 pt-4 md:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setRadioAbierta(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-xl"
                >
                  ↓
                </button>

                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-pink-300">
                    Mundo Música Radio
                  </p>
                  <p className="mt-1 text-xs text-gray-500">📻 En vivo</p>
                </div>

                <button
                  onClick={() => setRadioAleatoria((v) => !v)}
                  className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm ${
                    radioAleatoria
                      ? "bg-purple-500 text-white"
                      : "bg-white/5 text-gray-300"
                  }`}
                >
                  🔀
                </button>
              </div>

              {!cancionesRadio.length ? (
                <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                  <div className="text-5xl">📻</div>
                  <h2 className="mt-4 text-2xl font-black">Radio sin programación</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    El administrador todavía no ha marcado canciones con <b>Radio = SI</b>.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mx-auto mt-8 aspect-square w-full max-w-[380px] overflow-hidden rounded-[32px] bg-gradient-to-br from-purple-700 to-pink-600 shadow-2xl">
                    {contenidoRadioActual?.portada ? (
                      <img
                        src={contenidoRadioActual.portada}
                        alt={contenidoRadioActual.titulo}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-8xl">
                        {contenidoRadioActual?.tipo === "PUBLICIDAD"
                          ? "📢"
                          : contenidoRadioActual?.tipo === "JINGLE"
                          ? "🔊"
                          : contenidoRadioActual?.tipo === "PROGRAMA"
                          ? "🎙️"
                          : contenidoRadioActual?.tipo === "ESPECIAL"
                          ? "🎧"
                          : "📻"}
                      </span>
                    )}
                  </div>

                  <div className="mx-auto mt-7 max-w-[520px] text-center">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
                      {contenidoRadioActual?.tipo === "PUBLICIDAD"
                        ? "● Espacio publicitario"
                        : contenidoRadioActual?.tipo === "JINGLE"
                        ? "● Identificador de estación"
                        : contenidoRadioActual?.tipo === "PROGRAMA"
                        ? "● Programa en horario"
                        : contenidoRadioActual?.tipo === "ESPECIAL"
                        ? "● Radio en vivo continua"
                        : "● Ahora suena"}
                    </p>

                    <h2 className="mt-3 text-3xl font-black">
                      {contenidoRadioActual?.titulo ||
                        "Mundo Música Radio"}
                    </h2>

                    <p className="mt-2 text-base text-gray-400">
                      {contenidoRadioActual?.subtitulo ||
                        "Seleccionando contenido..."}
                    </p>

                    {contenidoRadioActual?.tipo === "CANCION" &&
                      actual?.album && (
                        <p className="mt-1 text-xs text-gray-600">
                          {actual.album}
                        </p>
                      )}
                  </div>

                  <div className="mx-auto mt-6 max-w-[520px]">
                    <input
                      type="range"
                      min={0}
                      max={duracion || 0}
                      step={0.1}
                      value={Math.min(actualSeg, duracion || 0)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (audioRef.current) {
                          audioRef.current.currentTime = v;
                        }
                        setActualSeg(v);
                      }}
                      className="w-full"
                    />

                    <div className="mt-1 flex justify-between text-[11px] text-gray-600">
                      <span>{tiempo(actualSeg)}</span>
                      <span>{tiempo(duracion)}</span>
                    </div>
                  </div>

                  <div className="mt-7 flex items-center justify-center gap-7">
                    <button
                      onClick={anteriorRadio}
                      disabled={!historialRadio.length}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl disabled:opacity-30"
                    >
                      ⏮
                    </button>

                    <button
                      onClick={() => {
                        if (!radioActiva) {
                          iniciarRadio();
                        } else {
                          playPause();
                        }
                      }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl font-black text-black shadow-xl"
                    >
                      {reproduciendo ? "⏸" : "▶"}
                    </button>

                    <button
                      onClick={siguienteRadio}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl"
                    >
                      ⏭
                    </button>
                  </div>

                  <div className="mx-auto mt-7 max-w-[520px] rounded-2xl border border-green-500/15 bg-green-500/[0.035] p-4">
                    {radioEnVivoConfig.activo === "SI" &&
                    contenidoRadioActual?.tipo === "ESPECIAL" && (
                      <div className="mb-4 rounded-xl border border-red-500/15 bg-red-500/[0.06] p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-red-300">
                          Playlist EN VIVO
                        </p>
                        <p className="mt-2 text-lg font-black">
                          Pista {indiceRadioEnVivo + 1} / {especialesRadio.length}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          La siguiente pista ya se está precargando.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
                          🤖 Radio automática
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          La estación decide el siguiente contenido.
                        </p>
                      </div>

                      <span className="rounded-full bg-green-500/10 px-3 py-2 text-[10px] font-black text-green-300">
                        ACTIVA
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-black/20 p-3">
                        <p className="text-[10px] text-gray-600">
                          Próximo jingle
                        </p>
                        <p className="mt-1 text-sm font-black text-purple-200">
                          {Math.max(0, 2 - cancionesDesdeJingle)} canción(es)
                        </p>
                      </div>

                      <div className="rounded-xl bg-black/20 p-3">
                        <p className="text-[10px] text-gray-600">
                          Próxima publicidad
                        </p>
                        <p className="mt-1 text-sm font-black text-red-200">
                          {Math.max(0, 4 - cancionesDesdePublicidad)} canción(es)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto mt-4 max-w-[520px] rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
                          Programación
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {radioAleatoria ? "Orden aleatorio" : "Orden de biblioteca"}
                        </p>
                      </div>

                      <button
                        onClick={() => setRadioAleatoria((v) => !v)}
                        className={`rounded-full px-4 py-2 text-xs font-black ${
                          radioAleatoria
                            ? "bg-purple-500 text-white"
                            : "bg-white/5 text-gray-300"
                        }`}
                      >
                        🔀 Aleatorio
                      </button>
                    </div>
                  </div>

                  <div className="mx-auto mt-4 max-w-[520px] rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-300">
                          🎙️ Programación
                        </p>
                        <p className="mt-1 text-[11px] text-gray-600">
                          {horaServidorRadio || "Horario del servidor"}
                        </p>
                      </div>

                      <button
                        onClick={cargarProgramacionRadio}
                        disabled={cargandoProgramacionRadio}
                        className="rounded-full bg-white/5 px-3 py-2 text-[10px] font-black disabled:opacity-40"
                      >
                        {cargandoProgramacionRadio ? "..." : "↻ Actualizar"}
                      </button>
                    </div>

                    {radioEnVivoConfig.activo === "SI" &&
                    especialesRadio.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-red-300">
                          ● EN VIVO
                        </p>
                        <p className="mt-1 font-black">
                          {radioEnVivoConfig.nombre}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {especialesRadio.length} pistas corridas • bucle continuo
                        </p>
                      </div>
                    ) : programaActualRadio ? (
                      <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400">
                          ● En horario ahora
                        </p>
                        <p className="mt-1 font-black">
                          {programaActualRadio.nombre}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {programaActualRadio.locutor || "Sin locutor"} • {programaActualRadio.horaInicio} - {programaActualRadio.horaFin}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-gray-500">
                        No hay un programa especial en horario ahora. Continúa la música de la estación.
                      </p>
                    )}

                    {programasRadio.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {programasRadio.slice(0, 4).map((programa) => (
                          <div
                            key={programa.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">
                                {programa.nombre}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-600">
                                {programa.dia} • {programa.horaInicio || "--:--"} - {programa.horaFin || "--:--"}
                              </p>
                            </div>

                            <span className="shrink-0 text-lg">
                              🎙️
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mx-auto mt-4 max-w-[520px] rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-300">
                      Próximas canciones
                    </p>

                    <div className="mt-3 space-y-2">
                      {Array.from({
                        length: Math.min(3, cancionesRadio.length),
                      }).map((_, pos) => {
                        const indice =
                          (radioIndice + pos + 1) % cancionesRadio.length;

                        const c = cancionesRadio[indice];

                        return (
                          <button
                            key={`${c.id}-${pos}`}
                            onClick={async () => {
                              setRadioIndice(indice);
                              setRadioActiva(true);
                              await reproducirCancionRadio(
                                c,
                                indice
                              );
                            }}
                            className="flex w-full items-center gap-3 rounded-xl bg-black/20 p-3 text-left"
                          >
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-purple-700">
                              {c.portada ? (
                                <img
                                  src={c.portada}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center">
                                  🎵
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black">{c.titulo}</p>
                              <p className="truncate text-xs text-gray-500">{c.artista}</p>
                            </div>

                            <span className="text-xs text-gray-600">#{pos + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FULL PLAYER */}
      {playerMovilAbierto && actual && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#08080d]">
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.28),_transparent_42%),linear-gradient(to_bottom,#111117,#07070b)] px-5 pb-10 pt-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPlayerMovilAbierto(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl"
                aria-label="Cerrar reproductor"
                title="Volver"
              >
                ↓
              </button>

              <div className="min-w-0 px-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-purple-300">
                  Reproduciendo ahora
                </p>
                <p className="mt-1 truncate text-xs text-gray-400">
                  Mundo Música
                </p>
              </div>

              {String(actual.karaoke || "").toUpperCase() === "SI" &&
              lineasKaraoke.length > 0 ? (
                <button
                  onClick={() => setModoKaraoke((v) => !v)}
                  className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-black ${
                    modoKaraoke
                      ? "bg-pink-500 text-white"
                      : "bg-white/5 text-pink-300"
                  }`}
                  aria-label="Modo karaoke"
                >
                  🎤
                </button>
              ) : (
                <button
                  onClick={() => alternarFavorito(actual.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-xl"
                  aria-label="Favorito"
                >
                  {esFavorito(actual.id) ? "♥" : "♡"}
                </button>
              )}
            </div>

            {modoKaraoke &&
            String(actual.karaoke || "").toUpperCase() === "SI" &&
            lineasKaraoke.length > 0 ? (
              <div className="mx-auto mt-8 flex aspect-square w-full max-w-[360px] flex-col justify-center overflow-hidden rounded-[28px] border border-pink-500/20 bg-gradient-to-br from-[#240b2e] via-[#100813] to-black px-6 text-center shadow-2xl">
                <p className="mb-6 text-[10px] font-black uppercase tracking-[0.28em] text-pink-300">
                  🎤 Karaoke
                </p>

                {indiceLineaKaraoke > 0 && (
                  <p className="mb-5 line-clamp-2 text-base font-bold text-white/25">
                    {lineasKaraoke[indiceLineaKaraoke - 1]?.texto}
                  </p>
                )}

                <p className="text-2xl font-black leading-snug text-white drop-shadow-lg">
                  {lineasKaraoke[indiceLineaKaraoke]?.texto ||
                    lineasKaraoke[0]?.texto ||
                    "♪"}
                </p>

                {lineasKaraoke[indiceLineaKaraoke + 1] && (
                  <p className="mt-6 line-clamp-2 text-base font-bold text-white/35">
                    {lineasKaraoke[indiceLineaKaraoke + 1]?.texto}
                  </p>
                )}

                <div className="mt-7">
                  <span className="rounded-full bg-pink-500/10 px-3 py-2 text-[10px] font-bold text-pink-200">
                    Línea {Math.max(indiceLineaKaraoke + 1, 1)} / {lineasKaraoke.length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-auto mt-8 aspect-square w-full max-w-[360px] overflow-hidden rounded-[28px] bg-gradient-to-br from-purple-700 to-pink-600 shadow-2xl">
                {actual.portada ? (
                  <img
                    src={actual.portada}
                    alt={actual.titulo}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-8xl">
                    🎵
                  </span>
                )}
              </div>
            )}

            <div className="mx-auto mt-7 max-w-[360px]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black">
                    {actual.titulo}
                  </h2>
                  <p className="mt-1 truncate text-base text-gray-400">
                    {actual.artista}
                  </p>
                  {(actual.album || actual.genero) && (
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {[actual.album, actual.genero].filter(Boolean).join(" • ")}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-bold text-orange-300">
                    ▶ {Number(actual.reproducciones || 0)} reproducciones
                  </p>
                </div>

                <button
                  onClick={() => alternarFavorito(actual.id)}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl ${
                    esFavorito(actual.id)
                      ? "bg-pink-500/15 text-pink-400"
                      : "bg-white/5 text-gray-300"
                  }`}
                >
                  {esFavorito(actual.id) ? "♥" : "♡"}
                </button>
              </div>

              <div className="mt-7">
                <input
                  type="range"
                  min={0}
                  max={duracion || 0}
                  step={0.1}
                  value={Math.min(actualSeg, duracion || 0)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (audioRef.current) {
                      audioRef.current.currentTime = v;
                    }
                    setActualSeg(v);
                  }}
                  className="w-full"
                />

                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{tiempo(actualSeg)}</span>
                  <span>{tiempo(duracion)}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-7">
                <button
                  onClick={anterior}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl"
                >
                  ⏮
                </button>

                <button
                  onClick={playPause}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl font-black text-black shadow-xl"
                >
                  {reproduciendo ? "⏸" : "▶"}
                </button>

                <button
                  onClick={siguiente}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl"
                >
                  ⏭
                </button>
              </div>

              <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-4">
                <span className="text-lg">🔈</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volumen}
                  onChange={(e) => setVolumen(Number(e.target.value))}
                  className="min-w-0 flex-1"
                />
                <span className="text-lg">🔊</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => alternarFavorito(actual.id)}
                  className={`h-12 rounded-2xl border font-bold ${
                    esFavorito(actual.id)
                      ? "border-pink-500/30 bg-pink-500/10 text-pink-300"
                      : "border-white/10 bg-white/5 text-gray-200"
                  }`}
                >
                  {esFavorito(actual.id) ? "♥ Favorito" : "♡ Favorito"}
                </button>

                <button
                  onClick={() => guardarUnaOffline(actual)}
                  className={`h-12 rounded-2xl border font-bold ${
                    offlineIds.includes(actual.driveId)
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : "border-purple-500/20 bg-purple-500/10 text-purple-200"
                  }`}
                >
                  {offlineIds.includes(actual.driveId)
                    ? "✓ Sin internet"
                    : "📥 Guardar offline"}
                </button>

                {String(actual.karaoke || "").toUpperCase() === "SI" &&
                  lineasKaraoke.length > 0 && (
                    <button
                      onClick={() => setModoKaraoke((v) => !v)}
                      className={`h-12 rounded-2xl border font-bold ${
                        modoKaraoke
                          ? "border-pink-500/40 bg-pink-500/20 text-pink-200"
                          : "border-pink-500/20 bg-pink-500/10 text-pink-300"
                      }`}
                    >
                      {modoKaraoke
                        ? "🖼️ Ver portada"
                        : "🎤 Karaoke"}
                    </button>
                  )}

                {actual.descargable === "SI" && actual.driveId ? (
                  <a
                    href={urlDownloadMiembro(
                      actual.driveId,
                      actual.archivoNombre ||
                        `${actual.artista} - ${actual.titulo}.mp3`
                    )}
                    className="flex h-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 font-bold text-blue-300"
                  >
                    ⬇ Descargar
                  </a>
                ) : (
                  <div className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-gray-500">
                    🔒 Sin descarga
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
                  Siguiente
                </p>

                <button
                  onClick={siguiente}
                  className="mt-3 flex w-full items-center gap-3 text-left"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                    {canciones.length > 1 ? (() => {
                      const i = indiceActual();
                      const prox = canciones[
                        i < 0 || i >= canciones.length - 1 ? 0 : i + 1
                      ];

                      return prox?.portada ? (
                        <img
                          src={prox.portada}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xl">
                          🎵
                        </span>
                      );
                    })() : (
                      <span className="flex h-full items-center justify-center text-xl">
                        🎵
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {canciones.length > 1 ? (() => {
                      const i = indiceActual();
                      const prox = canciones[
                        i < 0 || i >= canciones.length - 1 ? 0 : i + 1
                      ];

                      return (
                        <>
                          <p className="truncate text-sm font-black">
                            {prox?.titulo || "Siguiente canción"}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {prox?.artista || "Mundo Música"}
                          </p>
                        </>
                      );
                    })() : (
                      <>
                        <p className="truncate text-sm font-black">
                          No hay más canciones
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          Mundo Música
                        </p>
                      </>
                    )}
                  </div>

                  <span className="text-lg">›</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 h-[66px] grid-cols-4 border-t border-white/10 bg-[#09090d]/95 backdrop-blur-xl md:hidden ${
        playerMovilAbierto ? "hidden" : "grid"
      }`}>
        <button
          onClick={() => {
            setSeccionMovil("INICIO");
            setBusqueda("");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
            seccionMovil === "INICIO" ? "text-purple-300" : "text-gray-400"
          }`}
        >
          <span className="text-xl">🏠</span>
          Inicio
        </button>

        <button
          onClick={() => {
            setSeccionMovil("BUSCAR");
            setModoBusqueda("CANCIONES");
            setTimeout(() => ir("buscar"), 50);
          }}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
            seccionMovil === "BUSCAR" ? "text-purple-300" : "text-gray-400"
          }`}
        >
          <span className="text-xl">🔎</span>
          Buscar
        </button>

        <button
          onClick={() => {
            setSeccionMovil("FAVORITOS");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
            seccionMovil === "FAVORITOS" ? "text-pink-300" : "text-gray-400"
          }`}
        >
          <span className="text-xl">❤️</span>
          Favoritos
        </button>

        <button
          onClick={() => {
            setSeccionMovil("MIMUSICA");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
            seccionMovil === "MIMUSICA" ? "text-purple-300" : "text-gray-400"
          }`}
        >
          <span className="text-xl">🎵</span>
          Mi música
        </button>
      </nav>

      {/* CONFIG MODAL */}
      {mostrarConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-[#111117] p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-3xl">
                🎵
              </div>
              <h3 className="mt-4 text-xl font-black">
                Servicio temporalmente no disponible
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Mundo Música está terminando de conectarse. Intenta nuevamente en unos segundos o comunícate con el administrador.
              </p>
              <button
                onClick={async () => {
                  const ok = await comprobarConfig();
                  if (ok) {
                    setMostrarConfig(false);
                    const acceso = await comprobarAcceso(true);
                    if (acceso) {
                      await cargarCanciones();
                      await cargarAudiolibros();
                      await cargarProgramacionRadio();
                    }
                  }
                }}
                className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 font-black"
              >
                🔄 Intentar nuevamente
              </button>
            </div>
          </div>
        )}
    </main>
  );
}
