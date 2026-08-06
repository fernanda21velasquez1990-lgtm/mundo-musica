const SHELL_CACHE = "mundo-musica-shell-v10";
const AUDIO_CACHE = "mundo-musica-offline-audio-v1";
const API_CACHE = "mundo-musica-api-v1";
const IMAGE_CACHE = "mundo-musica-offline-portadas-v1";

const API_MUSICA_KEY = "/api/musica";
const API_CONFIG_KEY = "/api/config";

function canonicalRequest(pathname) {
  return new Request(self.location.origin + pathname, {
    method: "GET",
  });
}

async function respuestaOffline(cached) {
  if (!cached) {
    return null;
  }

  const headers =
    new Headers(cached.headers);

  headers.set(
    "X-Mundo-Musica-Offline",
    "1"
  );

  return new Response(
    await cached.blob(),
    {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    }
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      try {
        const cache =
          await caches.open(SHELL_CACHE);

        const response =
          await fetch("/", {
            cache: "reload",
          });

        if (response.ok) {
          await cache.put(
            "/",
            response.clone()
          );
        }
      } catch (e) {
        // No bloqueamos instalación.
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres =
        await caches.keys();

      const viejos =
        nombres.filter(
          (nombre) =>
            nombre.startsWith("mundo-musica-shell-") &&
            nombre !== SHELL_CACHE
        );

      await Promise.all(
        viejos.map(
          (nombre) =>
            caches.delete(nombre)
        )
      );

      /*
        Limpiamos respuestas API antiguas para que la sesión,
        el estado EN VIVO y la programación nunca provengan
        de un usuario/estado anterior.
      */
      try {
        await caches.delete(
          API_CACHE
        );
      } catch (e) {
        // Nada.
      }

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request =
    event.request;

  if (request.method !== "GET") {
    return;
  }

  const url =
    new URL(request.url);

  // ==========================================
  // PORTADAS / IMAGENES
  // Funciona también con URLs externas
  // (Google Drive, Postimg, etc.)
  // ==========================================
  if (
    request.destination === "image"
  ) {

    event.respondWith(
      (async () => {

        const cache =
          await caches.open(
            IMAGE_CACHE
          );

        const cached =
          await cache.match(
            request,
            {
              ignoreSearch: false,
            }
          );

        try {

          const response =
            await fetch(
              request
            );

          if (
            response.ok ||
            response.type === "opaque"
          ) {
            await cache.put(
              request,
              response.clone()
            );
          }

          return response;

        } catch (e) {

          if (cached) {
            return cached;
          }

          // SVG simple de respaldo.
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
              <rect width="100%" height="100%" fill="#7e22ce"/>
              <text x="50%" y="53%" text-anchor="middle" fill="white"
                    font-size="96" font-family="Arial">♫</text>
            </svg>`,
            {
              status: 200,
              headers: {
                "Content-Type":
                  "image/svg+xml",
                "X-Mundo-Musica-Offline":
                  "1",
              },
            }
          );

        }

      })()
    );

    return;
  }

  if (
    url.origin !==
    self.location.origin
  ) {
    return;
  }

  // ==========================================
  // API MUSICA: clave fija, ignora ?t=...
  // ==========================================
  if (
    url.pathname === "/api/musica"
  ) {

    event.respondWith(
      (async () => {

        const cache =
          await caches.open(
            API_CACHE
          );

        const key =
          canonicalRequest(
            API_MUSICA_KEY
          );

        try {

          const response =
            await fetch(request);

          if (response.ok) {

            await cache.put(
              key,
              response.clone()
            );

          }

          return response;

        } catch (e) {

          const cached =
            await cache.match(key);

          const offline =
            await respuestaOffline(
              cached
            );

          if (offline) {
            return offline;
          }

          return new Response(
            JSON.stringify({
              ok: false,
              mensaje:
                "Sin conexión y sin catálogo API guardado.",
            }),
            {
              status: 503,
              headers: {
                "Content-Type":
                  "application/json",
                "X-Mundo-Musica-Offline":
                  "1",
              },
            }
          );

        }

      })()
    );

    return;
  }

  // ==========================================
  // API CONFIG: clave fija
  // ==========================================
  if (
    url.pathname === "/api/config"
  ) {

    event.respondWith(
      (async () => {

        const cache =
          await caches.open(
            API_CACHE
          );

        const key =
          canonicalRequest(
            API_CONFIG_KEY
          );

        try {

          const response =
            await fetch(request);

          if (response.ok) {

            await cache.put(
              key,
              response.clone()
            );

          }

          return response;

        } catch (e) {

          const cached =
            await cache.match(key);

          const offline =
            await respuestaOffline(
              cached
            );

          if (offline) {
            return offline;
          }

          return new Response(
            JSON.stringify({
              ok: false,
              configurada: false,
            }),
            {
              status: 503,
              headers: {
                "Content-Type":
                  "application/json",
                "X-Mundo-Musica-Offline":
                  "1",
              },
            }
          );

        }

      })()
    );

    return;
  }

  // ==========================================
  // AUDIO: cache-first
  // ==========================================
  if (
    url.pathname.startsWith(
      "/api/audio/"
    )
  ) {

    event.respondWith(
      caches
        .open(AUDIO_CACHE)
        .then(
          async (cache) => {

            const cached =
              await cache.match(
                request,
                {
                  ignoreSearch: true,
                }
              );

            if (cached) {
              return cached;
            }

            return fetch(request);

          }
        )
    );

    return;
  }

  // ==========================================
  // APIs AUTENTICADAS:
  // No se guardan en la caché genérica.
  // /api/musica, /api/config y /api/audio ya fueron
  // tratados arriba.
  // ==========================================
  if (
    url.pathname.startsWith(
      "/api/"
    )
  ) {

    event.respondWith(
      fetch(
        request
      )
    );

    return;
  }

  // ==========================================
  // STATIC NEXT
  // ==========================================
  if (
    url.pathname.startsWith(
      "/_next/static/"
    )
  ) {

    event.respondWith(
      caches
        .open(SHELL_CACHE)
        .then(
          async (cache) => {

            const cached =
              await cache.match(
                request
              );

            try {

              const response =
                await fetch(
                  request
                );

              if (
                response.ok
              ) {
                await cache.put(
                  request,
                  response.clone()
                );
              }

              return response;

            } catch (e) {

              if (cached) {
                return cached;
              }

              return Response.error();

            }

          }
        )
    );

    return;
  }

  // ==========================================
  // NAVEGACION
  // ==========================================
  if (
    request.mode ===
    "navigate"
  ) {

    event.respondWith(
      (async () => {

        const cache =
          await caches.open(
            SHELL_CACHE
          );

        try {

          const response =
            await fetch(
              request
            );

          if (
            response.ok
          ) {

            await cache.put(
              "/",
              response.clone()
            );

          }

          return response;

        } catch (e) {

          const cached =
            await cache.match(
              "/"
            );

          if (cached) {
            return cached;
          }

          return Response.error();

        }

      })()
    );

    return;
  }

  // ==========================================
  // RESTO
  // ==========================================
  event.respondWith(
    (async () => {

      const cache =
        await caches.open(
          SHELL_CACHE
        );

      try {

        const response =
          await fetch(
            request
          );

        if (
          response.ok
        ) {
          await cache.put(
            request,
            response.clone()
          );
        }

        return response;

      } catch (e) {

        const cached =
          await cache.match(
            request
          );

        if (cached) {
          return cached;
        }

        return Response.error();

      }

    })()
  );
});
