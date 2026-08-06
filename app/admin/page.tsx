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

type FormEdicion = {
  id: string;
  titulo: string;
  artista: string;
  album: string;
  genero: string;
  portada: string;
  publicada: string;
  descargable: string;
  radio: string;
  karaoke: string;
  letraLrc: string;
};

type LineaEditorKaraoke = {
  texto: string;
  tiempo: number | null;
};

function formatoTiempoLrc(segundos: number) {
  const seguro =
    Math.max(
      0,
      Number(segundos || 0)
    );

  const minutos =
    Math.floor(
      seguro / 60
    );

  const resto =
    seguro -
    minutos * 60;

  const segundosEnteros =
    Math.floor(
      resto
    );

  const centesimas =
    Math.floor(
      (resto - segundosEnteros) *
      100
    );

  return `[${String(minutos).padStart(2, "0")}:${String(segundosEnteros).padStart(2, "0")}.${String(centesimas).padStart(2, "0")}]`;
}

function parsearLrcAdmin(texto: string) {
  return String(texto || "")
    .split(/\r?\n/)
    .map((linea) => {
      const match =
        linea.match(
          /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/
        );

      if (!match) {
        return null;
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

      return {
        texto:
          String(match[4] || "")
            .trim(),
        tiempo:
          minutos * 60 +
          segundos +
          fraccion,
      };
    })
    .filter(Boolean) as {
      texto: string;
      tiempo: number;
    }[];
}

type FiltroEstado =
  | "TODAS"
  | "POR_COMPLETAR"
  | "PUBLICADAS"
  | "OCULTAS";

type ProgramaRadioAdmin = {
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

type JingleRadioAdmin = {
  id: string;
  nombre: string;
  driveId: string;
  archivoUrl: string;
  duracion: string;
  activo: string;
  fecha: string;
};

type PublicidadRadioAdmin = {
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

type RadioEnVivoConfigAdmin = {
  activo: string;
  nombre: string;
};

type EspecialRadioAdmin = {
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

type AudiolibroAdmin = {
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

type CintilloAdmin = {
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

type MembresiaAdmin = {
  id: string;
  nombre: string;
  whatsapp: string;
  plan: string;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: string;
  estadoAcceso: string;
  ultimoAcceso: string;
  accesos: number;
  observacion: string;
  codigoAcceso: string;
  codigoVersion: number;
  codigoCreado: string;
};

type SolicitudCancion = {
  id: string;
  fecha: string;
  nombreOyente: string;
  cancion: string;
  artista: string;
  dedicatoria: string;
  whatsapp: string;
  estado: string;
  origen: string;
  observacion: string;
};

function estaPorCompletar(c: Cancion) {
  const publicada = String(c.publicada || "").trim().toUpperCase();
  const artista = String(c.artista || "").trim().toLowerCase();
  const album = String(c.album || "").trim();
  const genero = String(c.genero || "").trim().toLowerCase();
  const portada = String(c.portada || "").trim();

  return (
    publicada !== "SI" &&
    (
      !album ||
      !portada ||
      genero === "" ||
      genero === "variada" ||
      artista === "" ||
      artista.includes("desconocido")
    )
  );
}

function leerCookie(nombre: string) {
  if (typeof document === "undefined") return "";
  const partes = document.cookie.split(";").map((x) => x.trim());
  const prefijo = `${nombre}=`;
  const item = partes.find((x) => x.startsWith(prefijo));
  return item ? decodeURIComponent(item.slice(prefijo.length)) : "";
}

function guardarClaveLocal(clave: string) {
  localStorage.setItem("mundo_musica_admin_token", clave);
  document.cookie =
    `mundo_musica_admin_token=${encodeURIComponent(clave)}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax`;
}

export default function AdminPage() {
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODAS");
  const [vistaAdmin, setVistaAdmin] = useState<"BIBLIOTECA" | "SOLICITUDES" | "RADIO" | "AUDIOLIBROS" | "MEMBRESIAS" | "CINTILLO">("BIBLIOTECA");
  const [solicitudes, setSolicitudes] = useState<SolicitudCancion[]>([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [mensajeSolicitudes, setMensajeSolicitudes] = useState("");

  const [cintilloAdmin, setCintilloAdmin] = useState<CintilloAdmin>({
    id: "CINTILLO-1",
    tipo: "EN_VIVO",
    texto: "Estamos EN VIVO en Mundo Música",
    activo: "NO",
    dia: "TODOS",
    horaInicio: "",
    horaFin: "",
    enlace: "",
    textoBoton: "Escuchar ahora",
    fecha: "",
  });
  const [cargandoCintilloAdmin, setCargandoCintilloAdmin] = useState(false);
  const [mensajeCintilloAdmin, setMensajeCintilloAdmin] = useState("");
  const [cintilloVisibleAdmin, setCintilloVisibleAdmin] = useState(false);

  const [membresiasAdmin, setMembresiasAdmin] = useState<MembresiaAdmin[]>([]);
  const [cargandoMembresiasAdmin, setCargandoMembresiasAdmin] = useState(false);
  const [mensajeMembresiasAdmin, setMensajeMembresiasAdmin] = useState("");
  const [whatsappAdminMembresia, setWhatsappAdminMembresia] = useState("");
  const [nuevaMembresia, setNuevaMembresia] = useState({
    nombre: "",
    whatsapp: "",
    plan: "Mensual",
    fechaInicio: "",
    fechaVencimiento: "",
    estado: "ACTIVO",
    observacion: "",
  });

  const [audiolibrosAdmin, setAudiolibrosAdmin] = useState<AudiolibroAdmin[]>([]);
  const [cargandoAudiolibrosAdmin, setCargandoAudiolibrosAdmin] = useState(false);
  const [sincronizandoAudiolibrosAdmin, setSincronizandoAudiolibrosAdmin] = useState(false);
  const [mensajeAudiolibrosAdmin, setMensajeAudiolibrosAdmin] = useState("");

  const [programasRadioAdmin, setProgramasRadioAdmin] = useState<ProgramaRadioAdmin[]>([]);
  const [jinglesRadioAdmin, setJinglesRadioAdmin] = useState<JingleRadioAdmin[]>([]);
  const [publicidadRadioAdmin, setPublicidadRadioAdmin] = useState<PublicidadRadioAdmin[]>([]);
  const [especialesRadioAdmin, setEspecialesRadioAdmin] = useState<EspecialRadioAdmin[]>([]);
  const [radioEnVivoAdmin, setRadioEnVivoAdmin] = useState<RadioEnVivoConfigAdmin>({
    activo: "NO",
    nombre: "Música Mezclada en Vivo",
  });
  const [programaActualAdmin, setProgramaActualAdmin] = useState<ProgramaRadioAdmin | null>(null);
  const [especialActualAdmin, setEspecialActualAdmin] = useState<EspecialRadioAdmin | null>(null);
  const [cargandoRadioAdmin, setCargandoRadioAdmin] = useState(false);
  const [sincronizandoRadioAdmin, setSincronizandoRadioAdmin] = useState(false);
  const [mensajeRadioAdmin, setMensajeRadioAdmin] = useState("");

  const [token, setToken] = useState("");
  const [conectado, setConectado] = useState(false);
  const [mostrandoClave, setMostrandoClave] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [estadoClave, setEstadoClave] = useState("");
  const [probandoClave, setProbandoClave] = useState(false);

  const [editando, setEditando] = useState<FormEdicion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEdicion, setMensajeEdicion] = useState("");

  const [editorKaraokeAbierto, setEditorKaraokeAbierto] = useState(false);
  const [textoKaraokePlano, setTextoKaraokePlano] = useState("");
  const [lineasEditorKaraoke, setLineasEditorKaraoke] = useState<LineaEditorKaraoke[]>([]);
  const [indiceEditorKaraoke, setIndiceEditorKaraoke] = useState(0);
  const [tiempoEditorKaraoke, setTiempoEditorKaraoke] = useState(0);
  const [duracionEditorKaraoke, setDuracionEditorKaraoke] = useState(0);
  const [reproduciendoEditorKaraoke, setReproduciendoEditorKaraoke] = useState(false);
  const [mensajeEditorKaraoke, setMensajeEditorKaraoke] = useState("");
  const audioEditorKaraokeRef = useRef<HTMLAudioElement | null>(null);

  const [subiendoPortada, setSubiendoPortada] = useState(false);
  const inputPortadaRef = useRef<HTMLInputElement | null>(null);

  const [sincronizandoDrive, setSincronizandoDrive] = useState(false);
  const [mensajeDrive, setMensajeDrive] = useState("");
  const [resumenDrive, setResumenDrive] = useState<{
    nuevas: number;
    actualizadas: number;
    ignoradas: number;
    preparadasWeb: number;
    erroresPermiso: number;
  } | null>(null);

  useEffect(() => {
    const local =
      localStorage.getItem("mundo_musica_admin_token") || "";
    const cookie = leerCookie("mundo_musica_admin_token");
    const guardada = (local || cookie).trim();

    if (guardada) {
      setToken(guardada);
      validarAutomaticamente(guardada);
    } else {
      setCargando(false);
      setMostrarLogin(true);
    }
  }, []);

  function urlAudioAdmin(
    driveId: string
  ) {
    const base =
      `/api/audio/${encodeURIComponent(driveId)}`;

    try {
      const raw =
        window.localStorage.getItem(
          "mundo_musica_token_acceso"
        );

      if (!raw) {
        return base;
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

    } catch {
      return base;
    }
  }

  async function apiAdmin(payload: Record<string, unknown>) {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const d = await r.json();

    if (!r.ok || !d.ok) {
      throw new Error(d.mensaje || `Error ${r.status}`);
    }

    return d;
  }

  async function validarAutomaticamente(clave: string) {
    try {
      setCargando(true);

      await apiAdmin({
        accion: "probaradmin",
        token: clave,
      });

      guardarClaveLocal(clave);
      setConectado(true);
      setMostrarLogin(false);
      setEstadoClave("");
      await cargarCancionesAdmin(clave);
      await cargarSolicitudes(clave);
      await cargarCintilloAdmin(clave);
      await cargarMembresiasAdmin(clave);
      await cargarAudiolibrosAdmin(clave);
      await cargarProgramacionRadioAdmin(clave);
    } catch (e) {
      console.error(e);
      setConectado(false);
      setMostrarLogin(true);
      setEstadoClave("La clave guardada ya no es válida. Escríbela nuevamente.");
      setCargando(false);
    }
  }

  async function probarClave() {
    const limpia = token.trim();

    if (!limpia) {
      setEstadoClave("⚠️ Escribe la clave del panel.");
      return;
    }

    try {
      setProbandoClave(true);
      setEstadoClave("");

      await apiAdmin({
        accion: "probaradmin",
        token: limpia,
      });

      guardarClaveLocal(limpia);
      setConectado(true);
      setMostrarLogin(false);
      setEstadoClave("✅ Clave guardada en este dispositivo.");

      await cargarCancionesAdmin(limpia);
      await cargarSolicitudes(limpia);
      await cargarCintilloAdmin(limpia);
      await cargarMembresiasAdmin(limpia);
      await cargarAudiolibrosAdmin(limpia);
      await cargarProgramacionRadioAdmin(limpia);
    } catch (e) {
      console.error(e);
      setConectado(false);
      setEstadoClave(
        e instanceof Error ? `❌ ${e.message}` : "❌ Clave incorrecta."
      );
    } finally {
      setProbandoClave(false);
    }
  }

  async function cargarCancionesAdmin(claveOpcional?: string) {
    const clave = (claveOpcional || token).trim();

    if (!clave) {
      setMostrarLogin(true);
      return;
    }

    try {
      setCargando(true);
      setError("");

      const d = await apiAdmin({
        accion: "listarcancionesadmin",
        token: clave,
      });

      setCanciones(Array.isArray(d.canciones) ? d.canciones : []);
      setConectado(true);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo cargar la biblioteca."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarCintilloAdmin(
    claveOpcional?: string
  ) {
    const clave =
      (claveOpcional || token).trim();

    if (!clave) {
      return;
    }

    try {
      setCargandoCintilloAdmin(true);
      setMensajeCintilloAdmin("");

      const d =
        await apiAdmin({
          accion:
            "obtenercintilloadmin",
          token:
            clave,
        });

      if (d.cintillo) {
        setCintilloAdmin(
          d.cintillo
        );
      }

      setCintilloVisibleAdmin(
        Boolean(
          d?.estadoPublico?.visible
        )
      );

    } catch (e) {
      setMensajeCintilloAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo cargar el cintillo."
      );

    } finally {
      setCargandoCintilloAdmin(false);
    }
  }

  async function guardarCintilloAdmin() {
    try {
      setMensajeCintilloAdmin(
        "⏳ Guardando cintillo..."
      );

      const d =
        await apiAdmin({
          accion:
            "actualizarcintillo",
          token:
            token.trim(),
          datos:
            cintilloAdmin,
        });

      if (d.cintillo) {
        setCintilloAdmin(
          d.cintillo
        );
      }

      setCintilloVisibleAdmin(
        Boolean(
          d?.estadoPublico?.visible
        )
      );

      setMensajeCintilloAdmin(
        `✅ ${d.mensaje || "Cintillo actualizado."}`
      );

    } catch (e) {
      setMensajeCintilloAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo guardar."
      );
    }
  }

  async function cargarMembresiasAdmin(
    claveOpcional?: string
  ) {
    const clave =
      (claveOpcional || token).trim();

    if (!clave) {
      return;
    }

    try {
      setCargandoMembresiasAdmin(true);
      setMensajeMembresiasAdmin("");

      const d =
        await apiAdmin({
          accion:
            "listarmembresiasadmin",
          token:
            clave,
        });

      setMembresiasAdmin(
        Array.isArray(
          d.membresias
        )
          ? d.membresias
          : []
      );

      setWhatsappAdminMembresia(
        String(
          d.whatsappAdmin || ""
        )
      );

    } catch (e) {
      setMensajeMembresiasAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudieron cargar las membresías."
      );

    } finally {
      setCargandoMembresiasAdmin(false);
    }
  }

  async function crearMembresiaAdmin() {
    if (
      !nuevaMembresia.nombre.trim() ||
      nuevaMembresia.whatsapp.replace(/\D/g, "").length < 8
    ) {
      setMensajeMembresiasAdmin(
        "⚠️ Nombre y WhatsApp son obligatorios."
      );
      return;
    }

    try {
      setMensajeMembresiasAdmin(
        "⏳ Creando membresía..."
      );

      const d =
        await apiAdmin({
          accion:
            "crearmembresia",
          token:
            token.trim(),
          datos: {
            ...nuevaMembresia,
            whatsapp:
              nuevaMembresia.whatsapp.replace(/\D/g, ""),
          },
        });

      setMembresiasAdmin(
        Array.isArray(d.membresias)
          ? d.membresias
          : []
      );

      setWhatsappAdminMembresia(
        String(
          d.whatsappAdmin ||
          whatsappAdminMembresia
        )
      );

      setNuevaMembresia({
        nombre: "",
        whatsapp: "",
        plan: "Mensual",
        fechaInicio: "",
        fechaVencimiento: "",
        estado: "ACTIVO",
        observacion: "",
      });

      setMensajeMembresiasAdmin(
        `✅ ${d.mensaje || "Membresía creada."} Código: ${d.codigoAcceso || "generado"}`
      );

    } catch (e) {
      setMensajeMembresiasAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo crear."
      );
    }
  }

  async function guardarMembresiaAdmin(
    miembro: MembresiaAdmin
  ) {
    try {
      setMensajeMembresiasAdmin(
        `⏳ Guardando ${miembro.nombre}...`
      );

      const d =
        await apiAdmin({
          accion:
            "actualizarmembresia",
          token:
            token.trim(),
          id:
            miembro.id,
          datos: {
            ...miembro,
            whatsapp:
              String(
                miembro.whatsapp || ""
              ).replace(/\D/g, ""),
          },
        });

      setMembresiasAdmin(
        Array.isArray(d.membresias)
          ? d.membresias
          : membresiasAdmin
      );

      setMensajeMembresiasAdmin(
        `✅ ${d.mensaje || "Membresía actualizada."}`
      );

    } catch (e) {
      setMensajeMembresiasAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo guardar."
      );
    }
  }
  async function regenerarCodigoMembresiaAdmin(
    miembro: MembresiaAdmin
  ) {
    try {
      setMensajeMembresiasAdmin(
        `⏳ Generando nuevo código para ${miembro.nombre}...`
      );

      const d =
        await apiAdmin({
          accion:
            "regenerarcodigoacceso",
          token:
            token.trim(),
          id:
            miembro.id,
        });

      setMembresiasAdmin(
        Array.isArray(
          d.membresias
        )
          ? d.membresias
          : membresiasAdmin
      );

      setMensajeMembresiasAdmin(
        `✅ Nuevo código: ${d.codigoAcceso || "generado"}. El anterior ya no funciona.`
      );

    } catch (e) {
      setMensajeMembresiasAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo generar el código."
      );
    }
  }


  async function guardarWhatsappAdminMembresia() {
    try {
      const d =
        await apiAdmin({
          accion:
            "configurarmembresia",
          token:
            token.trim(),
          whatsappAdmin:
            whatsappAdminMembresia.replace(/\D/g, ""),
        });

      setWhatsappAdminMembresia(
        String(
          d.whatsappAdmin || ""
        )
      );

      if (
        Array.isArray(
          d.membresias
        )
      ) {
        setMembresiasAdmin(
          d.membresias
        );
      }

      setMensajeMembresiasAdmin(
        `✅ ${d.mensaje || "WhatsApp actualizado."}`
      );

    } catch (e) {
      setMensajeMembresiasAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo guardar el WhatsApp."
      );
    }
  }

  async function cargarAudiolibrosAdmin(
    claveOpcional?: string
  ) {
    const clave =
      (claveOpcional || token).trim();

    if (!clave) {
      return;
    }

    try {
      setCargandoAudiolibrosAdmin(true);
      setMensajeAudiolibrosAdmin("");

      const d =
        await apiAdmin({
          accion:
            "listaraudiolibrosadmin",
          token:
            clave,
        });

      setAudiolibrosAdmin(
        Array.isArray(d.audiolibros)
          ? d.audiolibros
          : []
      );

    } catch (e) {
      console.error(e);

      setMensajeAudiolibrosAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudieron cargar."
      );

    } finally {
      setCargandoAudiolibrosAdmin(false);
    }
  }

  async function sincronizarAudiolibrosAdmin() {
    try {
      setSincronizandoAudiolibrosAdmin(true);
      setMensajeAudiolibrosAdmin(
        "⏳ Sincronizando 08 - AUDIOLIBROS..."
      );

      const d =
        await apiAdmin({
          accion:
            "sincronizaraudiolibros",
          token:
            token.trim(),
        });

      setAudiolibrosAdmin(
        Array.isArray(d.audiolibros)
          ? d.audiolibros
          : []
      );

      setMensajeAudiolibrosAdmin(
        `✅ ${d.mensaje || "Audiolibros sincronizados."} Nuevos: ${Number(d.nuevas || 0)}`
      );

    } catch (e) {
      setMensajeAudiolibrosAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ Error al sincronizar."
      );

    } finally {
      setSincronizandoAudiolibrosAdmin(false);
    }
  }

  async function guardarAudiolibroAdmin(
    libro: AudiolibroAdmin
  ) {
    try {
      setMensajeAudiolibrosAdmin(
        `⏳ Guardando ${libro.titulo}...`
      );

      const d =
        await apiAdmin({
          accion:
            "actualizaraudiolibro",
          token:
            token.trim(),
          id:
            libro.id,
          datos:
            libro,
        });

      setAudiolibrosAdmin(
        Array.isArray(d.audiolibros)
          ? d.audiolibros
          : audiolibrosAdmin
      );

      setMensajeAudiolibrosAdmin(
        `✅ ${d.mensaje || "Audiolibro guardado."}`
      );

    } catch (e) {
      setMensajeAudiolibrosAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo guardar."
      );
    }
  }

  function aplicarDatosRadioAdmin(d: any) {
    setProgramasRadioAdmin(
      Array.isArray(d?.programas)
        ? d.programas
        : []
    );

    setJinglesRadioAdmin(
      Array.isArray(d?.jingles)
        ? d.jingles
        : []
    );

    setPublicidadRadioAdmin(
      Array.isArray(d?.publicidad)
        ? d.publicidad
        : []
    );

    setEspecialesRadioAdmin(
      Array.isArray(d?.especiales)
        ? d.especiales
        : []
    );

    setRadioEnVivoAdmin({
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
    });

    setProgramaActualAdmin(
      d?.programaActual || null
    );

    setEspecialActualAdmin(null);
  }

  async function cargarProgramacionRadioAdmin(
    claveOpcional?: string
  ) {
    const clave =
      (claveOpcional || token).trim();

    if (!clave) {
      return;
    }

    try {
      setCargandoRadioAdmin(true);
      setMensajeRadioAdmin("");

      const d =
        await apiAdmin({
          accion:
            "listarprogramacionradioadmin",
          token:
            clave,
        });

      aplicarDatosRadioAdmin(d);

    } catch (e) {
      console.error(e);

      setMensajeRadioAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo cargar Radio."
      );

    } finally {
      setCargandoRadioAdmin(false);
    }
  }

  async function sincronizarRadioDriveAdmin() {
    try {
      setSincronizandoRadioAdmin(true);
      setMensajeRadioAdmin(
        "⏳ Sincronizando PROGRAMAS, JINGLES y PUBLICIDAD..."
      );

      const d =
        await apiAdmin({
          accion:
            "sincronizarradiodrive",
          token:
            token.trim(),
        });

      aplicarDatosRadioAdmin(d);

      const resumen =
        Array.isArray(d.resumen)
          ? d.resumen
          : [];

      const totalNuevos =
        resumen.reduce(
          (
            total: number,
            item: any
          ) =>
            total +
            Number(
              item?.nuevas || 0
            ),
          0
        );

      setMensajeRadioAdmin(
        `✅ Radio sincronizada. ${totalNuevos} archivos nuevos encontrados.`
      );

    } catch (e) {
      console.error(e);

      setMensajeRadioAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo sincronizar Radio."
      );

    } finally {
      setSincronizandoRadioAdmin(false);
    }
  }

  async function guardarElementoRadioAdmin(
    tipo: "PROGRAMA" | "JINGLE" | "PUBLICIDAD" | "ESPECIAL",
    id: string,
    datos: Record<string, unknown>
  ) {
    try {
      setMensajeRadioAdmin(
        `⏳ Guardando ${id}...`
      );

      const d =
        await apiAdmin({
          accion:
            "actualizarprogramacionradio",
          token:
            token.trim(),
          tipo,
          id,
          datos,
        });

      aplicarDatosRadioAdmin(d);

      setMensajeRadioAdmin(
        `✅ ${d.mensaje || "Radio actualizada."}`
      );

    } catch (e) {
      console.error(e);

      setMensajeRadioAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo guardar."
      );
    }
  }

  async function guardarRadioEnVivoAdmin() {
    try {
      setMensajeRadioAdmin(
        radioEnVivoAdmin.activo === "SI"
          ? "⏳ Encendiendo Radio en Vivo..."
          : "⏳ Apagando Radio en Vivo..."
      );

      const d =
        await apiAdmin({
          accion:
            "actualizarradioenvivo",
          token:
            token.trim(),
          datos:
            radioEnVivoAdmin,
        });

      aplicarDatosRadioAdmin(d);

      setMensajeRadioAdmin(
        `✅ ${d.mensaje || "Radio en Vivo actualizada."}`
      );

    } catch (e) {
      setMensajeRadioAdmin(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo cambiar Radio en Vivo."
      );
    }
  }

  async function cargarSolicitudes(
    claveOpcional?: string
  ) {
    const clave =
      (claveOpcional || token).trim();

    if (!clave) {
      setMostrarLogin(true);
      return;
    }

    try {
      setCargandoSolicitudes(true);
      setMensajeSolicitudes("");

      const d = await apiAdmin({
        accion: "listarsolicitudesadmin",
        token: clave,
      });

      setSolicitudes(
        Array.isArray(d.solicitudes)
          ? d.solicitudes
          : []
      );

    } catch (e) {
      console.error(e);

      setMensajeSolicitudes(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudieron cargar las solicitudes."
      );

    } finally {
      setCargandoSolicitudes(false);
    }
  }

  async function cambiarEstadoSolicitud(
    solicitud: SolicitudCancion,
    estado: string
  ) {
    try {
      setMensajeSolicitudes(
        `⏳ Actualizando ${solicitud.id}...`
      );

      const d = await apiAdmin({
        accion: "actualizarsolicitud",
        token: token.trim(),
        id: solicitud.id,
        estado,
        observacion:
          solicitud.observacion || "",
      });

      setSolicitudes(
        Array.isArray(d.solicitudes)
          ? d.solicitudes
          : solicitudes
      );

      setMensajeSolicitudes(
        `✅ ${d.mensaje || "Solicitud actualizada."}`
      );

    } catch (e) {
      console.error(e);

      setMensajeSolicitudes(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ No se pudo actualizar."
      );
    }
  }

  async function sincronizarDrive() {
    const clave = token.trim();

    if (!clave) {
      setMostrarLogin(true);
      return;
    }

    try {
      setSincronizandoDrive(true);
      setMensajeDrive("");
      setResumenDrive(null);

      const d = await apiAdmin({
        accion: "sincronizardrive",
        token: clave,
      });

      const r = d.resumen || {};

      setResumenDrive({
        nuevas: Number(r.nuevas || 0),
        actualizadas: Number(r.actualizadas || 0),
        ignoradas: Number(r.ignoradas || 0),
        preparadasWeb: Number(r.preparadasWeb || 0),
        erroresPermiso: Number(r.erroresPermiso || 0),
      });

      setMensajeDrive(
        d.mensaje || "✅ Google Drive sincronizado correctamente."
      );

      if (Array.isArray(d.canciones)) setCanciones(d.canciones);
      else await cargarCancionesAdmin(clave);
    } catch (e) {
      console.error(e);
      setMensajeDrive(
        e instanceof Error ? `❌ ${e.message}` : "❌ No se pudo sincronizar."
      );
    } finally {
      setSincronizandoDrive(false);
    }
  }

  function prepararLineasDesdeTexto(
    texto: string
  ) {
    const lineas =
      String(texto || "")
        .split(/\r?\n/)
        .map((linea) =>
          linea.trim()
        )
        .filter(Boolean)
        .map((textoLinea) => ({
          texto: textoLinea,
          tiempo: null,
        })) as LineaEditorKaraoke[];

    setLineasEditorKaraoke(lineas);
    setIndiceEditorKaraoke(0);
    setMensajeEditorKaraoke(
      lineas.length
        ? `✅ ${lineas.length} líneas preparadas. Reproduce la canción y pulsa “Marcar línea”.`
        : "⚠️ Pega primero la letra línea por línea."
    );
  }

  function abrirEditorKaraoke() {
    if (!editando) {
      return;
    }

    let textoPlano =
      textoKaraokePlano;

    let lineas:
      LineaEditorKaraoke[] = [];

    const existentes =
      parsearLrcAdmin(
        editando.letraLrc || ""
      );

    if (
      existentes.length > 0
    ) {
      textoPlano =
        existentes
          .map(
            (linea) =>
              linea.texto
          )
          .join("\\n");

      lineas =
        existentes.map(
          (linea) => ({
            texto:
              linea.texto,
            tiempo:
              linea.tiempo,
          })
        );
    } else if (
      textoPlano.trim()
    ) {
      lineas =
        textoPlano
          .split(/\\r?\\n/)
          .map(
            (linea) =>
              linea.trim()
          )
          .filter(Boolean)
          .map(
            (texto) => ({
              texto,
              tiempo: null,
            })
          );
    }

    setTextoKaraokePlano(
      textoPlano
    );
    setLineasEditorKaraoke(
      lineas
    );

    const siguiente =
      lineas.findIndex(
        (linea) =>
          linea.tiempo === null
      );

    setIndiceEditorKaraoke(
      siguiente === -1
        ? lineas.length
        : siguiente
    );

    setTiempoEditorKaraoke(0);
    setDuracionEditorKaraoke(0);
    setReproduciendoEditorKaraoke(false);
    setMensajeEditorKaraoke(
      lineas.length
        ? "Editor listo."
        : "Pega la letra sin tiempos, una línea debajo de otra."
    );
    setEditorKaraokeAbierto(true);

    setTimeout(() => {
      if (
        audioEditorKaraokeRef.current
      ) {
        audioEditorKaraokeRef.current.currentTime = 0;
      }
    }, 50);
  }

  function reproducirPausarEditorKaraoke() {
    const audio =
      audioEditorKaraokeRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      audio
        .play()
        .catch((e) => {
          console.error(e);
          setMensajeEditorKaraoke(
            "❌ No se pudo reproducir la canción."
          );
        });
    } else {
      audio.pause();
    }
  }

  function marcarLineaKaraoke() {
    const audio =
      audioEditorKaraokeRef.current;

    if (
      !audio ||
      !lineasEditorKaraoke.length
    ) {
      setMensajeEditorKaraoke(
        "⚠️ Prepara primero las líneas."
      );
      return;
    }

    if (
      indiceEditorKaraoke >=
      lineasEditorKaraoke.length
    ) {
      setMensajeEditorKaraoke(
        "✅ Todas las líneas ya tienen tiempo."
      );
      return;
    }

    const tiempoActual =
      audio.currentTime;

    setLineasEditorKaraoke(
      (actuales) =>
        actuales.map(
          (linea, indice) =>
            indice ===
            indiceEditorKaraoke
              ? {
                  ...linea,
                  tiempo:
                    tiempoActual,
                }
              : linea
        )
    );

    const siguiente =
      indiceEditorKaraoke + 1;

    setIndiceEditorKaraoke(
      siguiente
    );

    setMensajeEditorKaraoke(
      siguiente >=
      lineasEditorKaraoke.length
        ? "✅ Marcaste la última línea. Ya puedes aplicar el LRC."
        : `✅ Línea ${indiceEditorKaraoke + 1} marcada en ${tiempo(tiempoActual)}.`
    );
  }

  function deshacerMarcaKaraoke() {
    if (
      !lineasEditorKaraoke.length
    ) {
      return;
    }

    const objetivo =
      Math.max(
        0,
        indiceEditorKaraoke - 1
      );

    setLineasEditorKaraoke(
      (actuales) =>
        actuales.map(
          (linea, indice) =>
            indice === objetivo
              ? {
                  ...linea,
                  tiempo: null,
                }
              : linea
        )
    );

    setIndiceEditorKaraoke(
      objetivo
    );

    const tiempo =
      lineasEditorKaraoke[
        objetivo
      ]?.tiempo;

    if (
      audioEditorKaraokeRef.current &&
      typeof tiempo === "number"
    ) {
      audioEditorKaraokeRef.current.currentTime =
        Math.max(
          0,
          tiempo - 1
        );
    }

    setMensajeEditorKaraoke(
      "↶ Se eliminó la última marca."
    );
  }

  function reiniciarMarcasKaraoke() {
    setLineasEditorKaraoke(
      (actuales) =>
        actuales.map(
          (linea) => ({
            ...linea,
            tiempo: null,
          })
        )
    );

    setIndiceEditorKaraoke(0);

    if (
      audioEditorKaraokeRef.current
    ) {
      audioEditorKaraokeRef.current.pause();
      audioEditorKaraokeRef.current.currentTime = 0;
    }

    setMensajeEditorKaraoke(
      "🔄 Marcas reiniciadas."
    );
  }

  function lrcGeneradoEditor() {
    return lineasEditorKaraoke
      .filter(
        (linea) =>
          typeof linea.tiempo === "number"
      )
      .map(
        (linea) =>
          `${formatoTiempoLrc(
            Number(
              linea.tiempo || 0
            )
          )}${linea.texto}`
      )
      .join("\\n");
  }

  function aplicarLrcGenerado() {
    if (!editando) {
      return;
    }

    const incompletas =
      lineasEditorKaraoke.filter(
        (linea) =>
          linea.tiempo === null
      ).length;

    if (
      !lineasEditorKaraoke.length
    ) {
      setMensajeEditorKaraoke(
        "⚠️ No hay líneas para aplicar."
      );
      return;
    }

    if (
      incompletas > 0
    ) {
      setMensajeEditorKaraoke(
        `⚠️ Faltan ${incompletas} líneas por marcar.`
      );
      return;
    }

    const lrc =
      lrcGeneradoEditor();

    setEditando({
      ...editando,
      karaoke: "SI",
      letraLrc: lrc,
    });

    setMensajeEdicion(
      "✅ LRC generado. Pulsa Guardar cambios para enviarlo a Google Sheets."
    );

    setEditorKaraokeAbierto(false);

    if (
      audioEditorKaraokeRef.current
    ) {
      audioEditorKaraokeRef.current.pause();
    }
  }

  function abrirEdicion(c: Cancion) {
    setMensajeEdicion("");

    setEditando({
      id: c.id,
      titulo: c.titulo || "",
      artista: c.artista || "",
      album: c.album || "",
      genero: c.genero || "",
      portada: c.portada || "",
      publicada: String(c.publicada).toUpperCase() === "SI" ? "SI" : "NO",
      descargable: String(c.descargable).toUpperCase() === "SI" ? "SI" : "NO",
      radio: String(c.radio).toUpperCase() === "SI" ? "SI" : "NO",
      karaoke: String(c.karaoke).toUpperCase() === "SI" ? "SI" : "NO",
      letraLrc: c.letraLrc || "",
    });
  }

  async function archivoABase64(archivo: File) {
    return await new Promise<string>((resolve, reject) => {
      const lector = new FileReader();

      lector.onload = () => {
        const resultado = String(lector.result || "");
        const coma = resultado.indexOf(",");
        resolve(coma >= 0 ? resultado.slice(coma + 1) : resultado);
      };

      lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
      lector.readAsDataURL(archivo);
    });
  }

  async function seleccionarPortadaDesdePC(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const archivo = e.target.files?.[0];

    if (!archivo || !editando) return;

    const permitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!permitidos.includes(archivo.type)) {
      setMensajeEdicion("⚠️ Usa una imagen JPG, PNG o WEBP.");
      e.target.value = "";
      return;
    }

    if (archivo.size > 2.5 * 1024 * 1024) {
      setMensajeEdicion("⚠️ La imagen debe pesar máximo 2.5 MB.");
      e.target.value = "";
      return;
    }

    try {
      setSubiendoPortada(true);
      setMensajeEdicion("⏳ Subiendo portada a Google Drive...");

      const base64 = await archivoABase64(archivo);

      const d = await apiAdmin({
        accion: "subirportada",
        token: token.trim(),
        cancionId: editando.id,
        nombreArchivo: archivo.name,
        mimeType: archivo.type,
        base64,
      });

      const url = String(d?.portada?.url || "");

      if (!url) {
        throw new Error("Apps Script no devolvió la URL de la portada.");
      }

      setEditando({
        ...editando,
        portada: url,
      });

      setMensajeEdicion(
        "✅ Portada subida. Ahora pulsa Guardar cambios para vincularla a la canción."
      );
    } catch (err) {
      console.error(err);
      setMensajeEdicion(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ No se pudo subir la portada."
      );
    } finally {
      setSubiendoPortada(false);
      e.target.value = "";
    }
  }

  async function guardarCambios() {
    if (!editando) return;

    if (!editando.titulo.trim() || !editando.artista.trim()) {
      setMensajeEdicion("⚠️ Título y artista son obligatorios.");
      return;
    }

    try {
      setGuardando(true);
      setMensajeEdicion("");

      const d = await apiAdmin({
        accion: "editarcancion",
        token: token.trim(),
        id: editando.id,
        datos: {
          titulo: editando.titulo,
          artista: editando.artista,
          album: editando.album,
          genero: editando.genero,
          portada: editando.portada,
          publicada: editando.publicada,
          descargable: editando.descargable,
          radio: editando.radio,
          karaoke: editando.karaoke,
          letraLrc: editando.letraLrc,
        },
      });

      setMensajeEdicion(`✅ ${d.mensaje || "Cambios guardados."}`);
      await cargarCancionesAdmin();

      setTimeout(() => {
        setEditando(null);
        setMensajeEdicion("");
      }, 800);
    } catch (e) {
      console.error(e);
      setMensajeEdicion(
        e instanceof Error ? `❌ ${e.message}` : "❌ No se pudo guardar."
      );
    } finally {
      setGuardando(false);
    }
  }

  const publicadas = canciones.filter(
    (c) => String(c.publicada).toUpperCase() === "SI"
  ).length;
  const ocultas = canciones.length - publicadas;
  const porCompletar = canciones.filter(estaPorCompletar).length;
  const descargables = canciones.filter(
    (c) => String(c.descargable).toUpperCase() === "SI"
  ).length;
  const paraRadio = canciones.filter(
    (c) => String(c.radio).toUpperCase() === "SI"
  ).length;

  const conKaraoke = canciones.filter(
    (c) =>
      String(c.karaoke).toUpperCase() === "SI" &&
      String(c.letraLrc || "").trim()
  ).length;

  const totalReproducciones =
    canciones.reduce(
      (total, c) =>
        total +
        Number(
          c.reproducciones || 0
        ),
      0
    );

  const topCanciones =
    [...canciones]
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

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return canciones.filter((c) => {
      const publicada = String(c.publicada).toUpperCase() === "SI";

      if (filtroEstado === "POR_COMPLETAR" && !estaPorCompletar(c)) return false;
      if (filtroEstado === "PUBLICADAS" && !publicada) return false;
      if (filtroEstado === "OCULTAS" && publicada) return false;

      if (!q) return true;

      return [c.titulo, c.artista, c.album, c.genero, c.id]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [canciones, busqueda, filtroEstado]);

  return (
    <main className="min-h-screen bg-[#07070b] pb-24 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07070b]/95 px-4 py-3 backdrop-blur-xl md:px-5 md:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-purple-400 md:text-xs">
              Administración
            </p>
            <h1 className="text-lg font-black md:text-xl">MUNDO MÚSICA</h1>
          </div>

          <div className="flex items-center gap-2">
            {conectado && (
              <div className="hidden rounded-full bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300 sm:block">
                ● Admin conectado
              </div>
            )}

            <button
              onClick={() => setMostrarLogin(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold md:text-sm"
            >
              🔐
              <span className="hidden sm:inline"> Clave</span>
            </button>

            <a
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold md:text-sm"
            >
              ← <span className="hidden sm:inline">Página</span>
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-5 md:px-5">
        <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setVistaAdmin("BIBLIOTECA")}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              vistaAdmin === "BIBLIOTECA"
                ? "bg-purple-500 text-white"
                : "text-gray-400"
            }`}
          >
            🎵 Biblioteca
          </button>

          <button
            onClick={() => {
              setVistaAdmin("SOLICITUDES");
              cargarSolicitudes();
            }}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              vistaAdmin === "SOLICITUDES"
                ? "bg-pink-500 text-white"
                : "text-gray-400"
            }`}
          >
            📩 Solicitudes ({solicitudes.length})
          </button>

          <button
            onClick={() => {
              setVistaAdmin("CINTILLO");
              cargarCintilloAdmin();
            }}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              vistaAdmin === "CINTILLO"
                ? "bg-fuchsia-500 text-white"
                : "text-gray-400"
            }`}
          >
            📣 Cintillo
          </button>

          <button
            onClick={() => {
              setVistaAdmin("MEMBRESIAS");
              cargarMembresiasAdmin();
            }}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              vistaAdmin === "MEMBRESIAS"
                ? "bg-green-500 text-black"
                : "text-gray-400"
            }`}
          >
            👥 Membresías ({membresiasAdmin.length})
          </button>

          <button
            onClick={() => {
              setVistaAdmin("AUDIOLIBROS");
              cargarAudiolibrosAdmin();
            }}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              vistaAdmin === "AUDIOLIBROS"
                ? "bg-amber-500 text-black"
                : "text-gray-400"
            }`}
          >
            📚 Audiolibros ({audiolibrosAdmin.length})
          </button>

          <button
            onClick={() => {
              setVistaAdmin("RADIO");
              cargarProgramacionRadioAdmin();
            }}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              vistaAdmin === "RADIO"
                ? "bg-red-500 text-white"
                : "text-gray-400"
            }`}
          >
            📻 Radio
          </button>
        </div>
      </div>

      {vistaAdmin === "BIBLIOTECA" && (
      <section className="mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-10">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
            Panel administrador
          </p>
          <h2 className="mt-1 text-3xl font-black md:text-5xl">
            Biblioteca
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Gestiona música, portadas, publicación y sincronización.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {[
            ["Canciones", canciones.length, "text-white"],
            ["Por completar", porCompletar, "text-yellow-300"],
            ["Publicadas", publicadas, "text-green-400"],
            ["Ocultas", ocultas, "text-red-400"],
            ["Descargables", descargables, "text-blue-400"],
            ["Para radio", paraRadio, "text-pink-400"],
            ["Reproducciones", totalReproducciones, "text-orange-300"],
            ["Karaoke", conKaraoke, "text-pink-300"],
          ].map(([label, valor, color]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
            >
              <p className="text-xs text-gray-400 md:text-sm">{label}</p>
              <p className={`mt-1 text-2xl font-black md:text-3xl ${color}`}>
                {valor}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 rounded-3xl border border-orange-500/15 bg-orange-500/[0.035] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Estadísticas
              </p>
              <h3 className="mt-1 text-xl font-black">
                🔥 Más escuchadas
              </h3>
            </div>

            <span className="rounded-full bg-black/20 px-3 py-2 text-xs font-bold text-orange-200">
              ▶ {totalReproducciones} total
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {topCanciones.map((c, index) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-sm font-black text-orange-300">
                  #{index + 1}
                </span>

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
                  <p className="truncate text-sm font-black">
                    {c.titulo}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {c.artista}
                  </p>
                </div>

                <span className="shrink-0 text-sm font-black text-orange-300">
                  ▶ {Number(c.reproducciones || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-400">
              Catálogo administrativo
            </p>
            <h3 className="mt-1 text-2xl font-black">Canciones</h3>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar canción, artista..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none sm:min-w-[260px]"
            />

            <button
              onClick={sincronizarDrive}
              disabled={sincronizandoDrive || !conectado}
              className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 text-sm font-bold disabled:opacity-50"
            >
              {sincronizandoDrive ? "⏳ Sincronizando..." : "🎵 Sincronizar Drive"}
            </button>

            <button
              onClick={() => cargarCancionesAdmin()}
              disabled={cargando || !conectado}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold disabled:opacity-50"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            ["TODAS", `Todas (${canciones.length})`],
            ["POR_COMPLETAR", `📝 Por completar (${porCompletar})`],
            ["PUBLICADAS", `✅ Publicadas (${publicadas})`],
            ["OCULTAS", `🚫 Ocultas (${ocultas})`],
          ].map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => setFiltroEstado(valor as FiltroEstado)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                filtroEstado === valor
                  ? "bg-purple-500 text-white"
                  : "border border-white/10 bg-white/5 text-gray-300"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        {mensajeDrive && (
          <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 text-sm">
            <p>{mensajeDrive}</p>

            {resumenDrive && (
              <div className="mt-3 grid grid-cols-5 gap-2 text-center text-[10px] md:text-xs">
                {[
                  ["Nuevas", resumenDrive.nuevas],
                  ["Actual.", resumenDrive.actualizadas],
                  ["Ignor.", resumenDrive.ignoradas],
                  ["Web", resumenDrive.preparadasWeb],
                  ["Perm.", resumenDrive.erroresPermiso],
                ].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl bg-black/20 p-2">
                    <span className="block text-gray-500">{l}</span>
                    <b className="text-base">{v}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {cargando && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
            🎵 Cargando biblioteca...
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* MOBILE CARDS */}
        <div className="mt-5 grid gap-3 md:hidden">
          {filtradas.map((c) => {
            const pendiente = estaPorCompletar(c);
            const visible = String(c.publicada).toUpperCase() === "SI";

            return (
              <article
                key={c.id}
                className={`rounded-2xl border p-3 ${
                  pendiente
                    ? "border-yellow-500/20 bg-yellow-500/[0.035]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                    {c.portada ? (
                      <img src={c.portada} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-3xl">🎵</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-black">{c.titulo}</h4>
                    <p className="mt-1 truncate text-sm text-gray-400">{c.artista}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {c.album || "Sin álbum"} • {c.genero || "Sin género"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-[10px] font-bold text-orange-300">
                        ▶ {Number(c.reproducciones || 0)} reproducciones
                      </p>

                      {String(c.karaoke || "").toUpperCase() === "SI" &&
                        c.letraLrc && (
                          <span className="text-[9px] font-black text-pink-300">
                            🎤 Karaoke
                          </span>
                        )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          visible
                            ? "bg-green-500/10 text-green-300"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {visible ? "Visible" : "Oculta"}
                      </span>

                      {pendiente && (
                        <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-[10px] font-bold text-yellow-300">
                          📝 Por completar
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => abrirEdicion(c)}
                  className="mt-3 h-11 w-full rounded-xl bg-purple-500/15 text-sm font-bold text-purple-300"
                >
                  {pendiente ? "📝 Completar ficha" : "✏️ Editar canción"}
                </button>
              </article>
            );
          })}
        </div>

        {/* DESKTOP TABLE */}
        <div className="mt-5 hidden overflow-hidden rounded-3xl border border-white/10 md:block">
          <div className="grid grid-cols-[70px_1.2fr_.9fr_.8fr_.7fr_90px_90px_80px_110px] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-4 text-xs font-black uppercase text-gray-400">
            <div>Portada</div>
            <div>Canción</div>
            <div>Artista</div>
            <div>Álbum</div>
            <div>Género</div>
            <div>Publicada</div>
            <div>Descarga</div>
            <div>Radio</div>
            <div>Acción</div>
          </div>

          <div className="divide-y divide-white/10">
            {filtradas.map((c) => {
              const pendiente = estaPorCompletar(c);
              const visible = String(c.publicada).toUpperCase() === "SI";

              return (
                <article
                  key={c.id}
                  className={`grid grid-cols-[70px_1.2fr_.9fr_.8fr_.7fr_90px_90px_80px_110px] items-center gap-3 px-4 py-4 ${
                    pendiente ? "bg-yellow-500/[0.03]" : ""
                  }`}
                >
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-gradient-to-br from-purple-700 to-pink-600">
                    {c.portada ? (
                      <img src={c.portada} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-2xl">🎵</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-black">{c.titulo}</p>
                    <p className="truncate text-xs text-gray-500">{c.id}</p>
                    {pendiente && (
                      <span className="mt-1 inline-flex rounded-full bg-yellow-500/10 px-2 py-1 text-[10px] font-bold text-yellow-300">
                        📝 Por completar
                      </span>
                    )}
                  </div>

                  <div className="truncate text-sm">{c.artista}</div>
                  <div className="truncate text-sm">{c.album || "—"}</div>
                  <div className="truncate text-sm">{c.genero || "—"}</div>

                  <span className={visible ? "text-green-300" : "text-red-300"}>
                    {visible ? "Visible" : "Oculta"}
                  </span>

                  <span className="text-blue-300">
                    {String(c.descargable).toUpperCase() === "SI" ? "Permitida" : "No"}
                  </span>

                  <span className="text-pink-300">
                    {String(c.radio).toUpperCase() === "SI" ? "Sí" : "No"}
                  </span>

                  <button
                    onClick={() => abrirEdicion(c)}
                    className="rounded-xl bg-purple-500/15 px-3 py-2 text-sm font-bold text-purple-300"
                  >
                    {pendiente ? "📝 Completar" : "✏️ Editar"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {vistaAdmin === "SOLICITUDES" && (
        <section className="mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-400">
                Peticiones de usuarios
              </p>
              <h2 className="mt-1 text-3xl font-black md:text-5xl">
                Solicitudes de canciones
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Revisa las canciones solicitadas y cambia su estado.
              </p>
            </div>

            <button
              onClick={() => cargarSolicitudes()}
              disabled={cargandoSolicitudes}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold disabled:opacity-50"
            >
              {cargandoSolicitudes
                ? "⏳ Cargando..."
                : "🔄 Actualizar solicitudes"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Total", solicitudes.length],
              ["Nuevas", solicitudes.filter((s) => s.estado === "NUEVA").length],
              ["Aprobadas", solicitudes.filter((s) => s.estado === "APROBADA").length],
              ["Reproducidas", solicitudes.filter((s) => s.estado === "REPRODUCIDA").length],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>

          {mensajeSolicitudes && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-yellow-100">
              {mensajeSolicitudes}
            </div>
          )}

          <div className="mt-5 space-y-3">
            {solicitudes.length === 0 && !cargandoSolicitudes ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-500">
                No hay solicitudes registradas todavía.
              </div>
            ) : (
              solicitudes.map((s) => (
                <article
                  key={s.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-pink-500/10 px-2.5 py-1 text-[10px] font-black text-pink-300">
                          {s.estado}
                        </span>
                        <span className="text-xs text-gray-600">
                          {s.fecha}
                        </span>
                        <span className="text-xs text-gray-600">
                          {s.id}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black">
                        {s.cancion}
                      </h3>
                      <p className="text-sm text-purple-300">
                        {s.artista}
                      </p>

                      {(s.nombreOyente || s.whatsapp) && (
                        <p className="mt-2 text-xs text-gray-500">
                          Oyente: {s.nombreOyente || "Sin nombre"}
                          {s.whatsapp ? ` • WhatsApp: ${s.whatsapp}` : ""}
                        </p>
                      )}

                      {s.dedicatoria && (
                        <p className="mt-2 rounded-xl bg-black/20 p-3 text-sm text-gray-400">
                          “{s.dedicatoria}”
                        </p>
                      )}
                    </div>

                    <div className="w-full lg:w-[220px]">
                      <label className="text-xs font-bold text-gray-500">
                        Estado
                      </label>
                      <select
                        value={s.estado}
                        onChange={(e) =>
                          cambiarEstadoSolicitud(
                            s,
                            e.target.value
                          )
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                      >
                        <option value="NUEVA">NUEVA</option>
                        <option value="REVISANDO">REVISANDO</option>
                        <option value="APROBADA">APROBADA</option>
                        <option value="PROGRAMADA">PROGRAMADA</option>
                        <option value="REPRODUCIDA">REPRODUCIDA</option>
                        <option value="RECHAZADA">RECHAZADA</option>
                      </select>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}



      {vistaAdmin === "CINTILLO" && (
        <section className="mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-300">
                Comunicación destacada
              </p>
              <h2 className="mt-1 text-3xl font-black md:text-5xl">
                📣 Cintillo superior
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                Aparece arriba de la página y también en celular. Puedes usarlo
                para EN VIVO, publicidad o avisos y programar cuándo se enciende
                y se apaga.
              </p>
            </div>

            <button
              onClick={() =>
                cargarCintilloAdmin()
              }
              disabled={cargandoCintilloAdmin}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold disabled:opacity-40"
            >
              {cargandoCintilloAdmin
                ? "⏳ Cargando..."
                : "🔄 Actualizar"}
            </button>
          </div>

          <div className="mt-5 rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/[0.03] p-4 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-300">
                  Estado actual
                </p>
                <p className="mt-2 text-xl font-black">
                  {cintilloVisibleAdmin
                    ? "🟢 Visible ahora"
                    : cintilloAdmin.activo === "SI"
                    ? "🕒 Programado / fuera de horario"
                    : "⚫ Apagado"}
                </p>
              </div>

              <div
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  cintilloAdmin.activo === "SI"
                    ? "bg-green-500/10 text-green-300"
                    : "bg-white/5 text-gray-500"
                }`}
              >
                {cintilloAdmin.activo === "SI"
                  ? "ENCENDIDO"
                  : "APAGADO"}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Tipo
                </label>
                <select
                  value={cintilloAdmin.tipo}
                  onChange={(e) =>
                    setCintilloAdmin({
                      ...cintilloAdmin,
                      tipo:
                        e.target.value,
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                >
                  <option value="EN_VIVO">🔴 EN VIVO</option>
                  <option value="PUBLICIDAD">📢 PUBLICIDAD</option>
                  <option value="AVISO">📣 AVISO</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Encendido
                </label>
                <select
                  value={cintilloAdmin.activo}
                  onChange={(e) =>
                    setCintilloAdmin({
                      ...cintilloAdmin,
                      activo:
                        e.target.value,
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                >
                  <option value="NO">⚫ APAGADO</option>
                  <option value="SI">🟢 ENCENDIDO</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Día
                </label>
                <select
                  value={cintilloAdmin.dia || "TODOS"}
                  onChange={(e) =>
                    setCintilloAdmin({
                      ...cintilloAdmin,
                      dia:
                        e.target.value,
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                >
                  {[
                    "TODOS",
                    "LUNES",
                    "MARTES",
                    "MIERCOLES",
                    "JUEVES",
                    "VIERNES",
                    "SABADO",
                    "DOMINGO",
                  ].map((dia) => (
                    <option
                      key={dia}
                      value={dia}
                    >
                      {dia}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-600">
                    Desde
                  </label>
                  <input
                    type="time"
                    value={cintilloAdmin.horaInicio || ""}
                    onChange={(e) =>
                      setCintilloAdmin({
                        ...cintilloAdmin,
                        horaInicio:
                          e.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-600">
                    Hasta
                  </label>
                  <input
                    type="time"
                    value={cintilloAdmin.horaFin || ""}
                    onChange={(e) =>
                      setCintilloAdmin({
                        ...cintilloAdmin,
                        horaFin:
                          e.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-bold uppercase text-gray-600">
                Texto del cintillo
              </label>
              <input
                value={cintilloAdmin.texto}
                onChange={(e) =>
                  setCintilloAdmin({
                    ...cintilloAdmin,
                    texto:
                      e.target.value,
                  })
                }
                placeholder="Ej: 🔴 Estamos EN VIVO - Noche de Mezclas"
                className="mt-1 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm font-bold"
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Enlace opcional
                </label>
                <input
                  value={cintilloAdmin.enlace}
                  onChange={(e) =>
                    setCintilloAdmin({
                      ...cintilloAdmin,
                      enlace:
                        e.target.value,
                    })
                  }
                  placeholder="https://..."
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Texto del botón
                </label>
                <input
                  value={cintilloAdmin.textoBoton}
                  onChange={(e) =>
                    setCintilloAdmin({
                      ...cintilloAdmin,
                      textoBoton:
                        e.target.value,
                    })
                  }
                  placeholder="Escuchar ahora"
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                Vista previa
              </p>

              <div
                className={`mt-3 rounded-xl px-3 py-2 text-white ${
                  cintilloAdmin.tipo === "EN_VIVO"
                    ? "bg-gradient-to-r from-red-700 via-pink-600 to-purple-700"
                    : cintilloAdmin.tipo === "PUBLICIDAD"
                    ? "bg-gradient-to-r from-amber-600 via-orange-600 to-pink-600"
                    : "bg-gradient-to-r from-purple-700 via-fuchsia-600 to-pink-600"
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-center">
                  <span className="shrink-0 text-xs font-black">
                    {cintilloAdmin.tipo === "EN_VIVO"
                      ? "🔴 EN VIVO"
                      : cintilloAdmin.tipo === "PUBLICIDAD"
                      ? "📢"
                      : "📣"}
                  </span>

                  <p className="line-clamp-1 min-w-0 text-xs font-black">
                    {cintilloAdmin.texto || "Tu mensaje aparecerá aquí"}
                  </p>

                  {cintilloAdmin.enlace && (
                    <span className="shrink-0 rounded-full bg-black/20 px-2 py-1 text-[10px] font-black">
                      {cintilloAdmin.textoBoton || "Ver"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={guardarCintilloAdmin}
              className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 text-sm font-black md:w-auto md:px-8"
            >
              💾 Guardar cintillo
            </button>

            {mensajeCintilloAdmin && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-yellow-100">
                {mensajeCintilloAdmin}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-3 text-xs leading-5 text-blue-100/80">
              ℹ️ Si eliges <b>EN VIVO</b>, el cintillo solo se mostrará
              cuando la sección Radio en Vivo también esté encendida.
              Si dejas las horas vacías, funciona durante todo el día seleccionado.
            </div>
          </div>
        </section>
      )}

      {vistaAdmin === "MEMBRESIAS" && (
        <section className="mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">
                Control de acceso
              </p>
              <h2 className="mt-1 text-3xl font-black md:text-5xl">
                👥 Membresías
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                Cada cliente entra con su número de WhatsApp y un código personal
                generado desde este panel.
              </p>
            </div>

            <button
              onClick={() =>
                cargarMembresiasAdmin()
              }
              disabled={cargandoMembresiasAdmin}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold disabled:opacity-40"
            >
              {cargandoMembresiasAdmin
                ? "⏳ Cargando..."
                : "🔄 Actualizar"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Total", membresiasAdmin.length],
              [
                "Activas",
                membresiasAdmin.filter(
                  (m) =>
                    m.estadoAcceso === "ACTIVO"
                ).length,
              ],
              [
                "Vencidas",
                membresiasAdmin.filter(
                  (m) =>
                    m.estadoAcceso === "VENCIDO"
                ).length,
              ],
              [
                "Accesos",
                membresiasAdmin.reduce(
                  (total, m) =>
                    total +
                    Number(
                      m.accesos || 0
                    ),
                  0
                ),
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <p className="text-xs text-gray-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-black">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-green-500/15 bg-green-500/[0.035] p-4 md:p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
              WhatsApp para pagos
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Este número aparecerá en el botón “Comunicarme con el administrador”
              cuando una persona intente entrar sin membresía.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={whatsappAdminMembresia}
                onChange={(e) =>
                  setWhatsappAdminMembresia(
                    e.target.value
                  )
                }
                placeholder="Ej: 584121234567"
                className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
              />

              <button
                onClick={guardarWhatsappAdminMembresia}
                className="h-11 rounded-xl bg-green-500/15 px-5 text-sm font-black text-green-300"
              >
                💾 Guardar WhatsApp
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-purple-500/15 bg-purple-500/[0.025] p-4 md:p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
              Nueva membresía
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Al crear el cliente, Mundo Música generará automáticamente su código de acceso.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={nuevaMembresia.nombre}
                onChange={(e) =>
                  setNuevaMembresia({
                    ...nuevaMembresia,
                    nombre:
                      e.target.value,
                  })
                }
                placeholder="Nombre del cliente"
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
              />

              <input
                value={nuevaMembresia.whatsapp}
                onChange={(e) =>
                  setNuevaMembresia({
                    ...nuevaMembresia,
                    whatsapp:
                      e.target.value,
                  })
                }
                placeholder="WhatsApp con código de país"
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
              />

              <input
                value={nuevaMembresia.plan}
                onChange={(e) =>
                  setNuevaMembresia({
                    ...nuevaMembresia,
                    plan:
                      e.target.value,
                  })
                }
                placeholder="Plan: Mensual"
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
              />

              <select
                value={nuevaMembresia.estado}
                onChange={(e) =>
                  setNuevaMembresia({
                    ...nuevaMembresia,
                    estado:
                      e.target.value,
                  })
                }
                className="h-11 rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
              >
                <option value="ACTIVO">🟢 ACTIVO</option>
                <option value="INACTIVO">⚫ INACTIVO</option>
              </select>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Inicio
                </label>
                <input
                  type="date"
                  value={nuevaMembresia.fechaInicio}
                  onChange={(e) =>
                    setNuevaMembresia({
                      ...nuevaMembresia,
                      fechaInicio:
                        e.target.value,
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Vencimiento
                </label>
                <input
                  type="date"
                  value={nuevaMembresia.fechaVencimiento}
                  onChange={(e) =>
                    setNuevaMembresia({
                      ...nuevaMembresia,
                      fechaVencimiento:
                        e.target.value,
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                />
              </div>

              <input
                value={nuevaMembresia.observacion}
                onChange={(e) =>
                  setNuevaMembresia({
                    ...nuevaMembresia,
                    observacion:
                      e.target.value,
                  })
                }
                placeholder="Observación opcional"
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm xl:col-span-1"
              />

              <button
                onClick={crearMembresiaAdmin}
                className="h-11 self-end rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 px-5 text-sm font-black text-black"
              >
                ➕ Crear membresía
              </button>
            </div>
          </div>

          {mensajeMembresiasAdmin && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-yellow-100">
              {mensajeMembresiasAdmin}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {membresiasAdmin.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-4xl">
                  👥
                </div>
                <p className="mt-3 font-black">
                  No hay membresías registradas
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Crea arriba el primer cliente autorizado.
                </p>
              </div>
            ) : (
              membresiasAdmin.map((m) => (
                <article
                  key={m.id}
                  className={`rounded-3xl border p-4 md:p-5 ${
                    m.estadoAcceso === "ACTIVO"
                      ? "border-green-500/15 bg-green-500/[0.025]"
                      : m.estadoAcceso === "VENCIDO"
                      ? "border-orange-500/15 bg-orange-500/[0.025]"
                      : "border-red-500/15 bg-red-500/[0.025]"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">
                          {m.nombre || "Sin nombre"}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${
                            m.estadoAcceso === "ACTIVO"
                              ? "bg-green-500/10 text-green-300"
                              : m.estadoAcceso === "VENCIDO"
                              ? "bg-orange-500/10 text-orange-300"
                              : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {m.estadoAcceso}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-gray-600">
                        {m.id} • {Number(m.accesos || 0)} accesos
                      </p>

                      {m.ultimoAcceso && (
                        <p className="mt-1 text-[10px] text-gray-600">
                          Último acceso: {String(m.ultimoAcceso)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-300">
                          🔑 Código / Token de acceso
                        </p>

                        <p className="mt-2 font-mono text-xl font-black tracking-wider text-white">
                          {m.codigoAcceso || "SIN CÓDIGO"}
                        </p>

                        <p className="mt-1 text-[10px] text-gray-600">
                          Versión {Number(m.codigoVersion || 0)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                m.codigoAcceso || ""
                              );

                              setMensajeMembresiasAdmin(
                                "✅ Código copiado."
                              );
                            } catch {
                              setMensajeMembresiasAdmin(
                                "⚠️ No se pudo copiar automáticamente."
                              );
                            }
                          }}
                          disabled={!m.codigoAcceso}
                          className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black disabled:opacity-40"
                        >
                          📋 Copiar
                        </button>

                        <button
                          onClick={() =>
                            regenerarCodigoMembresiaAdmin(
                              m
                            )
                          }
                          className="h-10 rounded-xl bg-purple-500/15 px-4 text-xs font-black text-purple-200"
                        >
                          🔄 Generar nuevo código
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-gray-500">
                      Si generas uno nuevo, el código anterior y las sesiones asociadas dejarán de funcionar.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-600">
                        Nombre
                      </label>
                      <input
                        value={m.nombre}
                        onChange={(e) =>
                          setMembresiasAdmin((items) =>
                            items.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    nombre:
                                      e.target.value,
                                  }
                                : x
                            )
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-600">
                        WhatsApp
                      </label>
                      <input
                        value={m.whatsapp}
                        onChange={(e) =>
                          setMembresiasAdmin((items) =>
                            items.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    whatsapp:
                                      e.target.value,
                                  }
                                : x
                            )
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-600">
                        Plan
                      </label>
                      <input
                        value={m.plan}
                        onChange={(e) =>
                          setMembresiasAdmin((items) =>
                            items.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    plan:
                                      e.target.value,
                                  }
                                : x
                            )
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-600">
                        Estado
                      </label>
                      <select
                        value={m.estado}
                        onChange={(e) =>
                          setMembresiasAdmin((items) =>
                            items.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    estado:
                                      e.target.value,
                                  }
                                : x
                            )
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                      >
                        <option value="ACTIVO">🟢 ACTIVO</option>
                        <option value="INACTIVO">⚫ INACTIVO</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-600">
                        Fecha inicio
                      </label>
                      <input
                        type="date"
                        value={m.fechaInicio || ""}
                        onChange={(e) =>
                          setMembresiasAdmin((items) =>
                            items.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    fechaInicio:
                                      e.target.value,
                                  }
                                : x
                            )
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-600">
                        Vencimiento
                      </label>
                      <input
                        type="date"
                        value={m.fechaVencimiento || ""}
                        onChange={(e) =>
                          setMembresiasAdmin((items) =>
                            items.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    fechaVencimiento:
                                      e.target.value,
                                  }
                                : x
                            )
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase text-gray-600">
                        Observación
                      </label>
                      <input
                        value={m.observacion || ""}
                        onChange={(e) =>
                          setMembresiasAdmin((items) =>
                            items.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    observacion:
                                      e.target.value,
                                  }
                                : x
                            )
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      guardarMembresiaAdmin(
                        m
                      )
                    }
                    className="mt-4 h-11 w-full rounded-xl bg-green-500/10 text-sm font-black text-green-300 md:w-auto md:px-6"
                  >
                    💾 Guardar membresía
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {vistaAdmin === "AUDIOLIBROS" && (
        <section className="mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                Biblioteca hablada
              </p>
              <h2 className="mt-1 text-3xl font-black md:text-5xl">
                📚 Audiolibros
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                Sube archivos MP3 a <b>08 - AUDIOLIBROS</b>, sincroniza y completa
                la ficha antes de publicarlos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  cargarAudiolibrosAdmin()
                }
                disabled={cargandoAudiolibrosAdmin}
                className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold disabled:opacity-40"
              >
                {cargandoAudiolibrosAdmin
                  ? "⏳ Cargando..."
                  : "🔄 Actualizar"}
              </button>

              <button
                onClick={sincronizarAudiolibrosAdmin}
                disabled={sincronizandoAudiolibrosAdmin}
                className="h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-sm font-black text-black disabled:opacity-40"
              >
                {sincronizandoAudiolibrosAdmin
                  ? "⏳ Sincronizando..."
                  : "📂 Sincronizar Audiolibros"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Total", audiolibrosAdmin.length],
              [
                "Publicados",
                audiolibrosAdmin.filter((x) => x.publicado === "SI").length,
              ],
              [
                "Ocultos",
                audiolibrosAdmin.filter((x) => x.publicado !== "SI").length,
              ],
              [
                "Reproducciones",
                audiolibrosAdmin.reduce(
                  (total, x) =>
                    total + Number(x.reproducciones || 0),
                  0
                ),
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <p className="text-xs text-gray-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-black">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {mensajeAudiolibrosAdmin && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-yellow-100">
              {mensajeAudiolibrosAdmin}
            </div>
          )}

          <div className="mt-6 space-y-4">
            {audiolibrosAdmin.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-500">
                Pulsa <b>Sincronizar Audiolibros</b>. Se creará automáticamente
                la carpeta <b>08 - AUDIOLIBROS</b> en Google Drive.
              </div>
            ) : (
              audiolibrosAdmin.map((libro) => (
                <article
                  key={libro.id}
                  className="rounded-3xl border border-amber-500/15 bg-amber-500/[0.025] p-4 md:p-5"
                >
                  <div className="grid gap-4 lg:grid-cols-[150px_1fr]">
                    <div>
                      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-amber-700 via-orange-700 to-purple-700">
                        {libro.portada ? (
                          <img
                            src={libro.portada}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-5xl">
                            📖
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-center text-[10px] font-bold text-amber-300">
                        ▶ {Number(libro.reproducciones || 0)}
                      </p>
                    </div>

                    <div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-600">
                            Título
                          </label>
                          <input
                            value={libro.titulo}
                            onChange={(e) =>
                              setAudiolibrosAdmin((items) =>
                                items.map((x) =>
                                  x.id === libro.id
                                    ? { ...x, titulo: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-600">
                            Autor
                          </label>
                          <input
                            value={libro.autor}
                            onChange={(e) =>
                              setAudiolibrosAdmin((items) =>
                                items.map((x) =>
                                  x.id === libro.id
                                    ? { ...x, autor: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Autor del libro"
                            className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-600">
                            Categoría
                          </label>
                          <input
                            value={libro.categoria}
                            onChange={(e) =>
                              setAudiolibrosAdmin((items) =>
                                items.map((x) =>
                                  x.id === libro.id
                                    ? { ...x, categoria: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Desarrollo personal"
                            className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-600">
                            Duración visible
                          </label>
                          <input
                            value={libro.duracion}
                            onChange={(e) =>
                              setAudiolibrosAdmin((items) =>
                                items.map((x) =>
                                  x.id === libro.id
                                    ? { ...x, duracion: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Ej: 5 h 30 min"
                            className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          URL de portada
                        </label>
                        <input
                          value={libro.portada}
                          onChange={(e) =>
                            setAudiolibrosAdmin((items) =>
                              items.map((x) =>
                                x.id === libro.id
                                  ? { ...x, portada: e.target.value }
                                  : x
                              )
                            )
                          }
                          placeholder="https://..."
                          className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                        />
                      </div>

                      <div className="mt-3">
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          Descripción
                        </label>
                        <textarea
                          value={libro.descripcion}
                          onChange={(e) =>
                            setAudiolibrosAdmin((items) =>
                              items.map((x) =>
                                x.id === libro.id
                                  ? { ...x, descripcion: e.target.value }
                                  : x
                              )
                            )
                          }
                          rows={3}
                          placeholder="Descripción del audiolibro"
                          className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
                        />
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-[150px_150px_1fr_auto]">
                        <select
                          value={libro.publicado}
                          onChange={(e) =>
                            setAudiolibrosAdmin((items) =>
                              items.map((x) =>
                                x.id === libro.id
                                  ? { ...x, publicado: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="h-11 rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                        >
                          <option value="NO">Oculto</option>
                          <option value="SI">🟢 Publicado</option>
                        </select>

                        <select
                          value={libro.descargable}
                          onChange={(e) =>
                            setAudiolibrosAdmin((items) =>
                              items.map((x) =>
                                x.id === libro.id
                                  ? { ...x, descargable: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="h-11 rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                        >
                          <option value="NO">No descargar</option>
                          <option value="SI">⬇ Descargable</option>
                        </select>

                        {libro.driveId ? (
                          <audio
                            controls
                            preload="none"
                            src={urlAudioAdmin(libro.driveId)}
                            className="h-11 w-full"
                          />
                        ) : (
                          <div />
                        )}

                        <button
                          onClick={() =>
                            guardarAudiolibroAdmin(
                              libro
                            )
                          }
                          className="h-11 rounded-xl bg-amber-500/15 px-4 text-sm font-black text-amber-200"
                        >
                          💾 Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {vistaAdmin === "RADIO" && (
        <section className="mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400">
                Mundo Música Radio
              </p>
              <h2 className="mt-1 text-3xl font-black md:text-5xl">
                Programación
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                Sincroniza los audios de las carpetas de Radio y decide cuáles
                programas, jingles y publicidades estarán activos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  cargarProgramacionRadioAdmin()
                }
                disabled={cargandoRadioAdmin}
                className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold disabled:opacity-40"
              >
                {cargandoRadioAdmin
                  ? "⏳ Cargando..."
                  : "🔄 Actualizar"}
              </button>

              <button
                onClick={sincronizarRadioDriveAdmin}
                disabled={sincronizandoRadioAdmin}
                className="h-11 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-4 text-sm font-black disabled:opacity-40"
              >
                {sincronizandoRadioAdmin
                  ? "⏳ Sincronizando..."
                  : "📂 Sincronizar carpetas Radio"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Programas", programasRadioAdmin.length, "🎙️"],
              ["Jingles", jinglesRadioAdmin.length, "🔊"],
              ["Publicidad", publicidadRadioAdmin.length, "📢"],
              ["Especiales", especialesRadioAdmin.length, "🎧"],
              [
                "Activos",
                programasRadioAdmin.filter((x) => x.activo === "SI").length +
                  jinglesRadioAdmin.filter((x) => x.activo === "SI").length +
                  publicidadRadioAdmin.filter((x) => x.activa === "SI").length +
                  (radioEnVivoAdmin.activo === "SI" ? 1 : 0),
                "🟢",
              ],
            ].map(([nombre, valor, icono]) => (
              <div
                key={String(nombre)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <p className="text-xs text-gray-500">
                  {icono} {nombre}
                </p>
                <p className="mt-1 text-2xl font-black">
                  {valor}
                </p>
              </div>
            ))}
          </div>

          {radioEnVivoAdmin.activo === "SI" && (
            <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
                ● RADIO EN VIVO ENCENDIDA
              </p>
              <p className="mt-2 text-xl font-black">
                {radioEnVivoAdmin.nombre}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                🎧 {especialesRadioAdmin.length} pistas de la carpeta 07 en reproducción continua.
              </p>
            </div>
          )}

          {programaActualAdmin && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                ● Programa actualmente en horario
              </p>
              <p className="mt-2 text-xl font-black">
                {programaActualAdmin.nombre}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {programaActualAdmin.locutor || "Sin locutor"} •{" "}
                {programaActualAdmin.dia} •{" "}
                {programaActualAdmin.horaInicio} - {programaActualAdmin.horaFin}
              </p>
            </div>
          )}

          {mensajeRadioAdmin && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-yellow-100">
              {mensajeRadioAdmin}
            </div>
          )}

          <div className="mt-7 rounded-3xl border border-red-500/20 bg-red-500/[0.025] p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
                  Radio en vivo continua
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  🔴 Programa en Vivo
                </h3>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-gray-500">
                  Todos los audios de <b>07 - ESPECIALES RADIO</b> se reproducen
                  automáticamente en orden. Al terminar el último, vuelve al primero.
                  No tienes que configurar pista por pista.
                </p>
              </div>

              <div
                className={`rounded-2xl border px-5 py-4 text-center ${
                  radioEnVivoAdmin.activo === "SI"
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                  Estado
                </p>
                <p
                  className={`mt-1 text-lg font-black ${
                    radioEnVivoAdmin.activo === "SI"
                      ? "text-red-300"
                      : "text-gray-500"
                  }`}
                >
                  {radioEnVivoAdmin.activo === "SI"
                    ? "🔴 EN VIVO"
                    : "⚫ APAGADO"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_200px_auto]">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Nombre del programa
                </label>
                <input
                  value={radioEnVivoAdmin.nombre}
                  onChange={(e) =>
                    setRadioEnVivoAdmin({
                      ...radioEnVivoAdmin,
                      nombre:
                        e.target.value,
                    })
                  }
                  placeholder="Ej: Noche de Mezclas"
                  className="mt-1 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600">
                  Encender / Apagar
                </label>
                <select
                  value={radioEnVivoAdmin.activo}
                  onChange={(e) =>
                    setRadioEnVivoAdmin({
                      ...radioEnVivoAdmin,
                      activo:
                        e.target.value,
                    })
                  }
                  className="mt-1 h-12 w-full rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm font-black"
                >
                  <option value="NO">⚫ APAGADO</option>
                  <option value="SI">🔴 EN VIVO</option>
                </select>
              </div>

              <button
                onClick={guardarRadioEnVivoAdmin}
                className={`h-12 self-end rounded-xl px-5 text-sm font-black ${
                  radioEnVivoAdmin.activo === "SI"
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                💾 Guardar estado
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black">
                    🎧 Playlist automática de la carpeta 07
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {especialesRadioAdmin.length} archivo(s) encontrados.
                  </p>
                </div>

                <button
                  onClick={sincronizarRadioDriveAdmin}
                  disabled={sincronizandoRadioAdmin}
                  className="h-10 rounded-xl bg-purple-500/15 px-4 text-xs font-black text-purple-200 disabled:opacity-40"
                >
                  {sincronizandoRadioAdmin
                    ? "⏳ Sincronizando..."
                    : "🔄 Actualizar carpeta 07"}
                </button>
              </div>

              {especialesRadioAdmin.length === 0 ? (
                <div className="mt-4 rounded-xl bg-white/[0.03] p-5 text-center text-sm text-gray-500">
                  Sube tus canciones o mezclas MP3 a <b>07 - ESPECIALES RADIO</b>
                  y pulsa Actualizar carpeta 07.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {especialesRadioAdmin.map((pista, index) => (
                    <div
                      key={pista.id}
                      className="flex flex-col gap-3 rounded-xl bg-white/[0.035] p-3 sm:flex-row sm:items-center"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-black text-red-300">
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">
                          {pista.nombre || `Pista ${index + 1}`}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-gray-600">
                          Se reproducirá automáticamente después de la pista anterior.
                        </p>
                      </div>

                      {pista.driveId && (
                        <audio
                          controls
                          preload="none"
                          src={urlAudioAdmin(pista.driveId)}
                          className="h-10 w-full sm:w-[280px]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-xl border border-green-500/15 bg-green-500/[0.04] p-3 text-xs leading-5 text-green-100/80">
                ✅ Al llegar a la última pista, Mundo Música vuelve a la pista 1.
                Mientras EN VIVO esté encendido, esta playlist tiene prioridad.
                Para detenerla solo cambia el selector a APAGADO y guarda.
              </div>
            </div>
          </div>

          <div className="mt-7">
            <div className="mb-3">
              <h3 className="text-2xl font-black">
                🎙️ Programas
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Archivos de Drive: 03 - PROGRAMAS
              </p>
            </div>

            {programasRadioAdmin.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-7 text-center text-sm text-gray-500">
                Sube un audio a 03 - PROGRAMAS y pulsa Sincronizar carpetas Radio.
              </div>
            ) : (
              <div className="space-y-3">
                {programasRadioAdmin.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <div className="xl:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          Programa
                        </label>
                        <input
                          value={p.nombre}
                          onChange={(e) =>
                            setProgramasRadioAdmin((items) =>
                              items.map((x) =>
                                x.id === p.id
                                  ? { ...x, nombre: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          Locutor
                        </label>
                        <input
                          value={p.locutor}
                          onChange={(e) =>
                            setProgramasRadioAdmin((items) =>
                              items.map((x) =>
                                x.id === p.id
                                  ? { ...x, locutor: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          Día
                        </label>
                        <select
                          value={p.dia || "TODOS"}
                          onChange={(e) =>
                            setProgramasRadioAdmin((items) =>
                              items.map((x) =>
                                x.id === p.id
                                  ? { ...x, dia: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                        >
                          {[
                            "TODOS",
                            "LUNES",
                            "MARTES",
                            "MIERCOLES",
                            "JUEVES",
                            "VIERNES",
                            "SABADO",
                            "DOMINGO",
                          ].map((dia) => (
                            <option key={dia} value={dia}>
                              {dia}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          Inicio
                        </label>
                        <input
                          type="time"
                          value={p.horaInicio || ""}
                          onChange={(e) =>
                            setProgramasRadioAdmin((items) =>
                              items.map((x) =>
                                x.id === p.id
                                  ? { ...x, horaInicio: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          Fin
                        </label>
                        <input
                          type="time"
                          value={p.horaFin || ""}
                          onChange={(e) =>
                            setProgramasRadioAdmin((items) =>
                              items.map((x) =>
                                x.id === p.id
                                  ? { ...x, horaFin: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                      <textarea
                        value={p.descripcion}
                        onChange={(e) =>
                          setProgramasRadioAdmin((items) =>
                            items.map((x) =>
                              x.id === p.id
                                ? { ...x, descripcion: e.target.value }
                                : x
                            )
                          )
                        }
                        rows={2}
                        placeholder="Descripción del programa"
                        className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
                      />

                      <select
                        value={p.activo}
                        onChange={(e) =>
                          setProgramasRadioAdmin((items) =>
                            items.map((x) =>
                              x.id === p.id
                                ? { ...x, activo: e.target.value }
                                : x
                            )
                          )
                        }
                        className="h-11 rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                      >
                        <option value="NO">Inactivo</option>
                        <option value="SI">Activo</option>
                      </select>

                      <button
                        onClick={() =>
                          guardarElementoRadioAdmin(
                            "PROGRAMA",
                            p.id,
                            p
                          )
                        }
                        className="h-11 rounded-xl bg-purple-500/15 px-4 text-sm font-black text-purple-300"
                      >
                        💾 Guardar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mt-9">
            <div className="mb-3">
              <h3 className="text-2xl font-black">
                🔊 Jingles
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Archivos de Drive: 04 - JINGLES
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {jinglesRadioAdmin.map((j) => (
                <article
                  key={j.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-2xl">
                      🔊
                    </div>

                    <input
                      value={j.nombre}
                      onChange={(e) =>
                        setJinglesRadioAdmin((items) =>
                          items.map((x) =>
                            x.id === j.id
                              ? { ...x, nombre: e.target.value }
                              : x
                          )
                        )
                      }
                      className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-bold"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <select
                      value={j.activo}
                      onChange={(e) =>
                        setJinglesRadioAdmin((items) =>
                          items.map((x) =>
                            x.id === j.id
                              ? { ...x, activo: e.target.value }
                              : x
                          )
                        )
                      }
                      className="h-11 rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                    >
                      <option value="NO">Inactivo</option>
                      <option value="SI">Activo</option>
                    </select>

                    <button
                      onClick={() =>
                        guardarElementoRadioAdmin(
                          "JINGLE",
                          j.id,
                          j
                        )
                      }
                      className="h-11 rounded-xl bg-purple-500/15 text-sm font-black text-purple-300"
                    >
                      💾 Guardar
                    </button>
                  </div>

                  {j.driveId && (
                    <audio
                      controls
                      preload="none"
                      src={urlAudioAdmin(j.driveId)}
                      className="mt-3 h-10 w-full"
                    />
                  )}
                </article>
              ))}

              {jinglesRadioAdmin.length === 0 && (
                <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-7 text-center text-sm text-gray-500">
                  Sube MP3 a 04 - JINGLES y sincroniza.
                </div>
              )}
            </div>
          </div>

          <div className="mt-9">
            <div className="mb-3">
              <h3 className="text-2xl font-black">
                📢 Publicidad
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Archivos de Drive: 05 - PUBLICIDAD
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {publicidadRadioAdmin.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={p.titulo}
                      onChange={(e) =>
                        setPublicidadRadioAdmin((items) =>
                          items.map((x) =>
                            x.id === p.id
                              ? { ...x, titulo: e.target.value }
                              : x
                          )
                        )
                      }
                      placeholder="Título"
                      className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-bold"
                    />

                    <input
                      value={p.cliente}
                      onChange={(e) =>
                        setPublicidadRadioAdmin((items) =>
                          items.map((x) =>
                            x.id === p.id
                              ? { ...x, cliente: e.target.value }
                              : x
                          )
                        )
                      }
                      placeholder="Cliente"
                      className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                    />

                    <input
                      type="date"
                      value={p.fechaInicio || ""}
                      onChange={(e) =>
                        setPublicidadRadioAdmin((items) =>
                          items.map((x) =>
                            x.id === p.id
                              ? { ...x, fechaInicio: e.target.value }
                              : x
                          )
                        )
                      }
                      className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                    />

                    <input
                      type="date"
                      value={p.fechaFin || ""}
                      onChange={(e) =>
                        setPublicidadRadioAdmin((items) =>
                          items.map((x) =>
                            x.id === p.id
                              ? { ...x, fechaFin: e.target.value }
                              : x
                          )
                        )
                      }
                      className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm"
                    />
                  </div>

                  <textarea
                    value={p.descripcion}
                    onChange={(e) =>
                      setPublicidadRadioAdmin((items) =>
                        items.map((x) =>
                          x.id === p.id
                            ? { ...x, descripcion: e.target.value }
                            : x
                        )
                      )
                    }
                    rows={2}
                    placeholder="Descripción"
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
                  />

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      value={p.activa}
                      onChange={(e) =>
                        setPublicidadRadioAdmin((items) =>
                          items.map((x) =>
                            x.id === p.id
                              ? { ...x, activa: e.target.value }
                              : x
                          )
                        )
                      }
                      className="h-11 rounded-xl border border-white/10 bg-[#17171d] px-3 text-sm"
                    >
                      <option value="NO">Inactiva</option>
                      <option value="SI">Activa</option>
                    </select>

                    <button
                      onClick={() =>
                        guardarElementoRadioAdmin(
                          "PUBLICIDAD",
                          p.id,
                          p
                        )
                      }
                      className="h-11 rounded-xl bg-red-500/10 text-sm font-black text-red-300"
                    >
                      💾 Guardar
                    </button>
                  </div>

                  {p.driveId && (
                    <audio
                      controls
                      preload="none"
                      src={urlAudioAdmin(p.driveId)}
                      className="mt-3 h-10 w-full"
                    />
                  )}
                </article>
              ))}

              {publicidadRadioAdmin.length === 0 && (
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-7 text-center text-sm text-gray-500">
                  Sube MP3 a 05 - PUBLICIDAD y sincroniza.
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-4 text-sm leading-6 text-blue-100/80">
            ℹ️ En esta fase configuramos y mostramos toda la programación.
            La siguiente fase insertará automáticamente jingles y publicidad
            entre canciones y dará prioridad al programa que esté en su horario.
          </div>
        </section>
      )}

      {/* EDITOR KARAOKE SINCRONIZADO */}
      {editorKaraokeAbierto && editando && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/90 p-3 backdrop-blur-md md:p-6">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-pink-500/20 bg-[#0d0d13] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d0d13]/95 px-4 py-4 backdrop-blur md:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-pink-300">
                  Editor Karaoke
                </p>
                <h3 className="truncate text-xl font-black md:text-2xl">
                  🎤 {editando.titulo}
                </h3>
                <p className="truncate text-xs text-gray-500">
                  {editando.artista}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditorKaraokeAbierto(false);

                  if (
                    audioEditorKaraokeRef.current
                  ) {
                    audioEditorKaraokeRef.current.pause();
                  }
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-5 p-4 md:p-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
                    1. Letra sin tiempos
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Pega una línea debajo de otra. Usa únicamente letras propias,
                    autorizadas o de dominio público.
                  </p>

                  <textarea
                    value={textoKaraokePlano}
                    onChange={(e) =>
                      setTextoKaraokePlano(
                        e.target.value
                      )
                    }
                    rows={13}
                    placeholder={"Primera línea\\nSegunda línea\\nTercera línea"}
                    className="mt-4 w-full resize-y rounded-2xl border border-white/10 bg-[#08080c] p-4 text-sm leading-6 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      prepararLineasDesdeTexto(
                        textoKaraokePlano
                      )
                    }
                    className="mt-3 h-11 w-full rounded-xl bg-purple-500/15 text-sm font-black text-purple-200"
                  >
                    📄 Preparar líneas
                  </button>
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
                    2. Reproductor
                  </p>

                  <audio
                    ref={audioEditorKaraokeRef}
                    src={
                      editando.driveId
                        ? urlAudioAdmin(editando.driveId)
                        : undefined
                    }
                    preload="metadata"
                    onTimeUpdate={(e) =>
                      setTiempoEditorKaraoke(
                        e.currentTarget.currentTime
                      )
                    }
                    onLoadedMetadata={(e) =>
                      setDuracionEditorKaraoke(
                        e.currentTarget.duration || 0
                      )
                    }
                    onPlay={() =>
                      setReproduciendoEditorKaraoke(true)
                    }
                    onPause={() =>
                      setReproduciendoEditorKaraoke(false)
                    }
                    onEnded={() =>
                      setReproduciendoEditorKaraoke(false)
                    }
                    className="hidden"
                  />

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={reproducirPausarEditorKaraoke}
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-black text-black"
                    >
                      {reproduciendoEditorKaraoke
                        ? "⏸"
                        : "▶"}
                    </button>

                    <div className="min-w-0 flex-1">
                      <input
                        type="range"
                        min={0}
                        max={duracionEditorKaraoke || 0}
                        step={0.05}
                        value={Math.min(
                          tiempoEditorKaraoke,
                          duracionEditorKaraoke || 0
                        )}
                        onChange={(e) => {
                          const valor =
                            Number(
                              e.target.value
                            );

                          if (
                            audioEditorKaraokeRef.current
                          ) {
                            audioEditorKaraokeRef.current.currentTime =
                              valor;
                          }

                          setTiempoEditorKaraoke(
                            valor
                          );
                        }}
                        className="w-full"
                      />

                      <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span>
                          {tiempo(
                            tiempoEditorKaraoke
                          )}
                        </span>
                        <span>
                          {tiempo(
                            duracionEditorKaraoke
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          audioEditorKaraokeRef.current
                        ) {
                          audioEditorKaraokeRef.current.currentTime =
                            Math.max(
                              0,
                              audioEditorKaraokeRef.current.currentTime - 3
                            );
                        }
                      }}
                      className="h-10 rounded-xl border border-white/10 bg-white/5 text-xs font-bold"
                    >
                      ↶ 3 s
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          audioEditorKaraokeRef.current
                        ) {
                          audioEditorKaraokeRef.current.currentTime =
                            Math.min(
                              duracionEditorKaraoke,
                              audioEditorKaraokeRef.current.currentTime + 3
                            );
                        }
                      }}
                      className="h-10 rounded-xl border border-white/10 bg-white/5 text-xs font-bold"
                    >
                      3 s ↷
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          audioEditorKaraokeRef.current
                        ) {
                          audioEditorKaraokeRef.current.playbackRate =
                            audioEditorKaraokeRef.current.playbackRate === 1
                              ? 0.75
                              : 1;

                          setMensajeEditorKaraoke(
                            `Velocidad: ${
                              audioEditorKaraokeRef.current.playbackRate
                            }x`
                          );
                        }
                      }}
                      className="h-10 rounded-xl border border-white/10 bg-white/5 text-xs font-bold"
                    >
                      🐢 0.75x
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="rounded-3xl border border-pink-500/20 bg-gradient-to-b from-pink-500/[0.05] to-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-300">
                        3. Sincronización
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Línea {Math.min(indiceEditorKaraoke + 1, lineasEditorKaraoke.length)} de {lineasEditorKaraoke.length}
                      </p>
                    </div>

                    <span className="rounded-full bg-black/30 px-3 py-2 font-mono text-xs text-purple-200">
                      {formatoTiempoLrc(
                        tiempoEditorKaraoke
                      )}
                    </span>
                  </div>

                  <div className="mt-5 min-h-[170px] rounded-2xl bg-black/30 p-5 text-center">
                    {indiceEditorKaraoke > 0 && (
                      <p className="line-clamp-2 text-sm font-bold text-white/25">
                        {lineasEditorKaraoke[indiceEditorKaraoke - 1]?.texto}
                      </p>
                    )}

                    <p className="my-5 text-xl font-black leading-snug text-white md:text-2xl">
                      {lineasEditorKaraoke[indiceEditorKaraoke]?.texto ||
                        (lineasEditorKaraoke.length
                          ? "✅ Todas las líneas están marcadas."
                          : "Prepara las líneas para comenzar.")}
                    </p>

                    {lineasEditorKaraoke[indiceEditorKaraoke + 1] && (
                      <p className="line-clamp-2 text-sm font-bold text-white/30">
                        {lineasEditorKaraoke[indiceEditorKaraoke + 1]?.texto}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={marcarLineaKaraoke}
                    disabled={
                      !lineasEditorKaraoke.length ||
                      indiceEditorKaraoke >= lineasEditorKaraoke.length
                    }
                    className="mt-4 h-16 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-lg font-black shadow-xl disabled:opacity-40"
                  >
                    ⏱️ Marcar línea ahora
                  </button>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={deshacerMarcaKaraoke}
                      disabled={indiceEditorKaraoke === 0}
                      className="h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-bold disabled:opacity-40"
                    >
                      ↶ Deshacer
                    </button>

                    <button
                      type="button"
                      onClick={reiniciarMarcasKaraoke}
                      disabled={!lineasEditorKaraoke.length}
                      className="h-11 rounded-xl border border-red-500/20 bg-red-500/5 text-sm font-bold text-red-300 disabled:opacity-40"
                    >
                      🔄 Reiniciar
                    </button>
                  </div>

                  {mensajeEditorKaraoke && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-yellow-100">
                      {mensajeEditorKaraoke}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
                      4. Resultado LRC
                    </p>

                    <span className="text-[10px] text-gray-600">
                      {lineasEditorKaraoke.filter(
                        (linea) =>
                          typeof linea.tiempo === "number"
                      ).length}/{lineasEditorKaraoke.length}
                    </span>
                  </div>

                  <textarea
                    readOnly
                    value={lrcGeneradoEditor()}
                    rows={10}
                    placeholder="El LRC aparecerá aquí mientras marcas líneas..."
                    className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-[#08080c] p-4 font-mono text-xs leading-6 text-purple-200 outline-none"
                  />

                  <button
                    type="button"
                    onClick={aplicarLrcGenerado}
                    disabled={
                      !lineasEditorKaraoke.length ||
                      lineasEditorKaraoke.some(
                        (linea) =>
                          linea.tiempo === null
                      )
                    }
                    className="mt-3 h-12 w-full rounded-xl bg-green-500/15 font-black text-green-300 disabled:opacity-40"
                  >
                    ✅ Aplicar LRC a la canción
                  </button>

                  <p className="mt-2 text-[11px] leading-5 text-gray-600">
                    Después de aplicar, vuelve a la ficha y pulsa <b>Guardar cambios</b>
                    para enviarlo a Google Sheets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN / CLAVE */}
      {mostrarLogin && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-purple-500/30 bg-[#111117] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
                  Seguridad
                </p>
                <h3 className="mt-2 text-2xl font-black">Clave del administrador</h3>
              </div>

              {conectado && (
                <button onClick={() => setMostrarLogin(false)} className="h-10 w-10 rounded-full bg-white/5">
                  ✕
                </button>
              )}
            </div>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Solo se solicita la primera vez. Después el navegador la recuerda
              y el panel se conecta automáticamente.
            </p>

            <div className="mt-5 flex gap-2">
              <input
                type={mostrandoClave ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Clave del panel"
                className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 outline-none"
              />
              <button
                onClick={() => setMostrandoClave((v) => !v)}
                className="h-12 w-12 rounded-xl bg-white/5"
              >
                {mostrandoClave ? "🙈" : "👁️"}
              </button>
            </div>

            {estadoClave && (
              <p className="mt-3 text-sm text-yellow-200">{estadoClave}</p>
            )}

            <button
              onClick={probarClave}
              disabled={probandoClave}
              className="mt-4 h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 font-bold disabled:opacity-50"
            >
              {probandoClave ? "Conectando..." : "🔐 Guardar y conectar"}
            </button>

            <p className="mt-4 text-xs leading-5 text-gray-500">
              Nota: si usas Chrome en modo incógnito, Chrome elimina esta clave
              guardada cuando cierras todas las ventanas incógnitas.
            </p>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editando && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/85 p-3 backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4">
          <div className="mx-auto my-4 w-full max-w-3xl rounded-3xl border border-purple-500/30 bg-[#111117] p-5 md:p-8">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
                  {estaPorCompletar({
                    ...canciones.find((x) => x.id === editando.id)!,
                    ...editando,
                  } as Cancion)
                    ? "Completar ficha"
                    : "Editar canción"}
                </p>
                <h3 className="mt-2 truncate text-2xl font-black">{editando.titulo}</h3>
                <p className="text-xs text-gray-500">{editando.id}</p>
              </div>

              <button
                onClick={() => !guardando && setEditando(null)}
                className="h-10 w-10 shrink-0 rounded-full bg-white/5"
              >
                ✕
              </button>
            </div>

            {/* PORTADA PREVIEW + UPLOAD */}
            <div className="mt-6 grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-purple-800 to-pink-600">
                {editando.portada ? (
                  <img
                    src={editando.portada}
                    alt="Portada"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-6xl">🎵</span>
                )}
              </div>

              <div>
                <p className="text-sm font-bold">Portada</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Puedes pegar una URL o elegir una imagen directamente desde tu PC.
                </p>

                <input
                  value={editando.portada}
                  onChange={(e) =>
                    setEditando({ ...editando, portada: e.target.value })
                  }
                  placeholder="https://..."
                  className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none"
                />

                <input
                  ref={inputPortadaRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={seleccionarPortadaDesdePC}
                  className="hidden"
                />

                <button
                  onClick={() => inputPortadaRef.current?.click()}
                  disabled={subiendoPortada}
                  className="mt-3 h-11 w-full rounded-xl border border-purple-500/30 bg-purple-500/10 text-sm font-bold text-purple-300 disabled:opacity-50"
                >
                  {subiendoPortada ? "⏳ Subiendo..." : "🖼️ Elegir imagen desde mi PC"}
                </button>

                <p className="mt-2 text-[11px] text-gray-500">
                  JPG, PNG o WEBP • máximo 2.5 MB
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ["Título", "titulo"],
                ["Artista", "artista"],
                ["Álbum", "album"],
                ["Género", "genero"],
              ].map(([label, key]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm font-bold text-gray-300">
                    {label}
                  </span>
                  <input
                    value={String(editando[key as keyof FormEdicion])}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        [key]: e.target.value,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 outline-none"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
              {[
                ["Publicada", "publicada"],
                ["Descargable", "descargable"],
                ["Para radio", "radio"],
                ["Karaoke", "karaoke"],
              ].map(([label, key]) => (
                <label
                  key={key}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <span className="mb-2 block text-sm font-bold">{label}</span>
                  <select
                    value={String(editando[key as keyof FormEdicion])}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        [key]: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#17171d] px-3"
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </label>
              ))}
            </div>

            {editando.karaoke === "SI" && (
              <div className="mt-5 rounded-2xl border border-pink-500/20 bg-pink-500/[0.04] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-pink-200">
                      🎤 Letra sincronizada para Karaoke
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Pega aquí únicamente una letra propia, autorizada o de dominio público.
                      Cada línea debe comenzar con su tiempo.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-white/5 px-3 py-2 text-[10px] font-bold text-gray-400">
                    Formato LRC
                  </span>
                </div>

                <div className="mt-3 rounded-xl bg-black/30 p-3 font-mono text-[11px] leading-5 text-purple-200">
                  [00:05.00]Primera línea<br />
                  [00:10.50]Segunda línea<br />
                  [00:16.20]Tercera línea
                </div>

                <textarea
                  value={editando.letraLrc}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      letraLrc: e.target.value,
                    })
                  }
                  rows={8}
                  placeholder={"[00:05.00]Primera línea\n[00:10.50]Segunda línea"}
                  className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-sm leading-6 outline-none"
                />

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={abrirEditorKaraoke}
                    disabled={!editando.driveId}
                    className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-sm font-black disabled:opacity-40"
                  >
                    🎚️ Abrir editor sincronizado
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const existentes =
                        parsearLrcAdmin(
                          editando.letraLrc || ""
                        );

                      setTextoKaraokePlano(
                        existentes
                          .map(
                            (linea) =>
                              linea.texto
                          )
                          .join("\n")
                      );

                      setMensajeEdicion(
                        "✅ La letra se preparó para editar sus tiempos."
                      );
                    }}
                    disabled={!editando.letraLrc}
                    className="h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-bold disabled:opacity-40"
                  >
                    📝 Extraer letra del LRC
                  </button>
                </div>

                <p className="mt-2 text-[11px] leading-5 text-gray-600">
                  El editor sincronizado reproduce tu MP3 y te permite marcar cada línea
                  con un toque. Después genera automáticamente el formato LRC.
                </p>
              </div>
            )}

            {mensajeEdicion && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                {mensajeEdicion}
              </div>
            )}

            <div className="sticky bottom-0 mt-5 flex gap-2 bg-[#111117] pt-3">
              <button
                onClick={() => setEditando(null)}
                disabled={guardando}
                className="h-12 flex-1 rounded-xl border border-white/10 bg-white/5 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambios}
                disabled={guardando || subiendoPortada}
                className="h-12 flex-[1.4] rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 font-bold disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "💾 Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
