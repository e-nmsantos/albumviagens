import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  // Server-only settings in .env (e.g. AI keys) become process.env for `npm run dev`.
  // In production they come from the host's environment.
  for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ""))) process.env[k] ??= v;

  return {
    server: { host: "::", port: 8080 },
    // The detailed world map (~780 kB, keeps small countries) is its own lazily loaded chunk.
    build: { chunkSizeWarningLimit: 800 },
    resolve: {
      tsconfigPaths: true, // the "@/…" imports from tsconfig.json
      dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
    },
    plugins: [
      tailwindcss(),
      tanstackStart({
        // src/server.ts wraps the server entry with an error page for crashed renders.
        server: { entry: "server" },
        importProtection: { behavior: "error", client: { specifiers: ["server-only"] } },
      }),
      // Production server: Vercel when building there, otherwise Node (`npm run build` → `npm start`).
      // NITRO_PRESET picks another host.
      ...(command === "build"
        ? [
            nitro({
              preset:
                process.env["NITRO_PRESET"] || (process.env["VERCEL"] ? "vercel" : "node-server"),
            }),
          ]
        : []),
      viteReact(),
    ],
  };
});
