// Ocean Skin backend: serves the background pictures to the frontend at
// /api/v1/plugins/<id>/http/<name>. bb's frontend build has no image loader,
// so the pictures stay plain files in assets/ instead of inside the bundle.
import { readFile } from "node:fs/promises";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { BACKGROUNDS } from "./skin.ts";

// A path install runs server.ts from the plugin root. A git install runs the
// built dist/server.js. Look for assets/ beside either one.
const ASSET_DIRS = ["./assets/", "../assets/"].map((dir) => new URL(dir, import.meta.url));

export async function readBackground(name: string): Promise<Buffer> {
  for (const dir of ASSET_DIRS) {
    try {
      return await readFile(new URL(name, dir));
    } catch {
      // Not in this directory; try the next one.
    }
  }
  throw new Error(`Ocean Skin: assets/${name} is missing`);
}

export default function plugin(bb: BbPluginApi): void {
  for (const name of BACKGROUNDS) {
    bb.http.route("GET", `/${name}`, async () =>
      new Response(new Uint8Array(await readBackground(name)), {
        headers: { "content-type": "image/webp", "cache-control": "public, max-age=86400" },
      }),
    );
  }
}
