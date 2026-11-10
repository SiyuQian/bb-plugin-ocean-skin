// Finds solid pane-colored blocks in the real bb UI at phone size. These are
// the blocks the skin must make translucent. tests/skin.test.ts cannot see
// markup that a bb update adds, so run this after bb updates:
//
//   bb plugin install .        (the audit reads the installed skin)
//   bb browser-automation open --backend local --headless --machine <host-id> --json
//   bb browser-automation run <session-id> --script-file tests/live-audit.js --script-host <host-id> --timeout 100s
//
// An empty list for every route means no block was found. The audit cannot
// see inside iframes. Cards, buttons, inputs and the composer are solid in
// bb itself, so the audit ignores them.
const BB_URL = "http://127.0.0.1:38886"; // serverUrl in ~/.bb/bb-app-runtime.json
const ROUTES = ["/", "/settings", "/settings/plugins", "/plugins", "/skills"]; // add a thread URL to check a thread

const p = await browser.getPage("main");
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const found = {};
for (const route of ROUTES) {
  await p.goto(BB_URL + route, { waitUntil: "domcontentloaded" });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  found[route] = await p.evaluate(() => {
    const probe = document.body.appendChild(document.createElement("div"));
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const cache = {};
    const rgba = (color) => {
      if (cache[color]) return cache[color];
      probe.style.backgroundColor = color;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = getComputedStyle(probe).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      return (cache[color] = [...ctx.getImageData(0, 0, 1, 1).data]);
    };
    const root = getComputedStyle(document.documentElement);
    const theme = ["--background", "--sidebar", "--canvas"].map((name) => rgba(root.getPropertyValue(name)));
    const out = [];
    for (const el of document.querySelectorAll('[data-sidebar="inset"] *, [data-sidebar="panel"] *')) {
      if (el.closest("[data-promptbox]") || /^(BUTTON|SELECT|INPUT|TEXTAREA)$/.test(el.tagName) || el.classList.contains("bg-card")) continue;
      const cs = getComputedStyle(el);
      if (cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 150 || r.height < 14 || r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) continue;
      const c = rgba(cs.backgroundColor);
      if (c[3] < 230 || !theme.some((t) => Math.abs(t[0] - c[0]) + Math.abs(t[1] - c[1]) + Math.abs(t[2] - c[2]) < 12)) continue;
      out.push(`${el.tagName} ${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.x)},${Math.round(r.y)} class="${String(el.className).slice(0, 100)}"`);
    }
    probe.remove();
    return out;
  });
}
JSON.stringify(found, null, 1);
