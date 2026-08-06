import { promises as fs } from "fs";
import path from "path";

const configPath = path.join(
  process.cwd(),
  ".mundomusica-config.json"
);

export async function obtenerAppsScriptUrl() {
  const env =
    String(
      process.env.MUNDO_MUSICA_APPS_SCRIPT_URL || ""
    ).trim();

  if (env) {
    return env;
  }

  try {
    const texto =
      await fs.readFile(
        configPath,
        "utf8"
      );

    const config =
      JSON.parse(texto);

    return String(
      config?.appsScriptUrl || ""
    ).trim();

  } catch {
    return "";
  }
}

export async function leerConfigLocal() {
  try {
    return JSON.parse(
      await fs.readFile(
        configPath,
        "utf8"
      )
    );
  } catch {
    return {};
  }
}

export async function guardarAppsScriptUrl(
  url: string
) {
  const actual =
    await leerConfigLocal();

  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        ...actual,
        appsScriptUrl:
          url,
      },
      null,
      2
    ),
    "utf8"
  );
}
