import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { BACKGROUNDS } from "../skin.ts";

type Handler = () => Promise<Response>;

// Loads a server entry with a fake bb that records its HTTP routes, then
// checks that every background route answers with a WebP file.
async function checkRoutes(entry: string): Promise<void> {
  const { default: plugin } = await import(entry);
  const routes = new Map<string, Handler>();
  plugin({
    http: {
      route(method: string, path: string, handler: Handler) {
        assert.equal(method, "GET");
        routes.set(path, handler);
      },
    },
  });
  assert.deepEqual([...routes.keys()], BACKGROUNDS.map((name) => `/${name}`));
  for (const handler of routes.values()) {
    const response = await handler();
    assert.equal(response.headers.get("content-type"), "image/webp");
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.subarray(8, 12)), "WEBP");
  }
}

test("server.ts (path install) serves every background", () => checkRoutes("../server.ts"));

test(
  "dist/server.js (git install) serves every background",
  { skip: existsSync(new URL("../dist/server.js", import.meta.url)) ? false : "run bb plugin build first" },
  () => checkRoutes("../dist/server.js"),
);
