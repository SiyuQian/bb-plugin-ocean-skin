import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { MARK, ROTATE_MS, SKIN_CSS, mountSkin } from "../skin.ts";

const chrome = [process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find((path) => path && existsSync(path));

test("resizing follows frames, settles the last movement, and releases drag feedback", {
  skip: chrome ? false : "Chrome not found; set CHROME_PATH",
}, () => {
  const dir = mkdtempSync(join(tmpdir(), "ocean-resize-"));
  const file = join(dir, "page.html");
  writeFileSync(file, `<!doctype html><html><head><style>
    body { margin: 0; }
    main { width: 1000px; height: 600px; }
    .mx-auto { margin-inline: auto; width: 100%; max-width: 760px; }
  </style></head><body>
    <main data-sidebar="inset"><div class="mx-auto max-w-[760px]">Messages</div>
      <div class="chat-prompt-box mx-auto max-w-[760px]">Composer</div></main>
    <script>
      window.onerror = (message) => document.body.append(Object.assign(document.createElement('pre'), {
        id: 'error', textContent: String(message),
      }));
      const MARK = ${JSON.stringify(MARK)};
      const ROTATE_MS = ${ROTATE_MS};
      const SKIN_CSS = ${JSON.stringify(SKIN_CSS)};
      const mountSkin = ${mountSkin.toString()};
      // Step frames explicitly: Chrome's --dump-dom does not wait for animation frames.
      let frameId = 0;
      const frames = new Map();
      window.requestAnimationFrame = (callback) => (frames.set(++frameId, callback), frameId);
      window.cancelAnimationFrame = (id) => frames.delete(id);
      const frame = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(0)); };
      localStorage.clear();
      const dispose = mountSkin([]);
      const root = document.documentElement;
      const [left, right] = document.querySelectorAll('.ocean-skin-grip');
      // Synthetic pointer events have no native capture; exercise the handlers in real DOM.
      for (const grip of [left, right]) grip.setPointerCapture = () => {};
      const pointer = (grip, type, clientX) => grip.dispatchEvent(new PointerEvent(type, {
        clientX, pointerId: 1, button: 0, bubbles: true,
      }));
      const width = () => document.querySelector('.mx-auto').getBoundingClientRect().width;
      const feedback = () => ({ cursor: getComputedStyle(document.body).cursor,
        selection: getComputedStyle(document.body).userSelect });
      const out = {};
      pointer(right, 'pointerdown', 880);
      out.active = feedback();
      pointer(right, 'pointermove', 900);
      pointer(right, 'pointermove', 920);
      out.beforeFrame = width();
      frame();
      out.afterFrame = width();
      out.composer = document.querySelector('.chat-prompt-box').getBoundingClientRect().width;
      pointer(right, 'pointermove', 930);
      pointer(right, 'pointerup', 930);
      out.released = width();
      out.saved = localStorage.getItem('ocean-skin-width');
      out.afterRelease = feedback();
      pointer(left, 'pointerdown', 70);
      pointer(left, 'pointermove', 100);
      pointer(left, 'pointercancel', 100);
      out.leftWidth = width();
      out.cancelled = feedback();
      pointer(right, 'pointerdown', 900);
      pointer(right, 'lostpointercapture', 900);
      out.lostCapture = feedback();
      right.dispatchEvent(new MouseEvent('dblclick'));
      out.reset = { width: width(), saved: localStorage.getItem('ocean-skin-width') };
      pointer(right, 'pointerdown', 880);
      pointer(right, 'pointermove', 950);
      dispose();
      frame();
      out.disposed = { ...feedback(), width: width(),
        grips: document.querySelectorAll('.ocean-skin-grip').length,
        override: root.style.getPropertyValue('--ocean-width') };
      document.body.append(Object.assign(document.createElement('pre'), {
        id: 'out', textContent: JSON.stringify(out),
      }));
    </script></body></html>`);
  try {
    const dom = execFileSync(chrome!, ["--headless", "--disable-gpu", "--no-sandbox", "--dump-dom", `file://${file}`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const json = /<pre id="out">(.*?)<\/pre>/s.exec(dom);
    assert.ok(json, `the resize scenario did not finish: ${/<pre id="error">(.*?)<\/pre>/s.exec(dom)?.[1] ?? dom.slice(-2000)}`);
    const out = JSON.parse(json[1]!);
    assert.equal(out.beforeFrame, 760, "pointer events are coalesced until the next frame");
    assert.equal(out.afterFrame, 840);
    assert.equal(out.composer, 840, "messages and composer stay aligned");
    assert.equal(out.released, 860, "release flushes the last queued movement");
    assert.equal(out.saved, "860");
    assert.equal(out.leftWidth, 800, "dragging the left edge inward narrows the column");
    assert.deepEqual(out.reset, { width: 760, saved: null });
    assert.deepEqual(out.active, { cursor: "ew-resize", selection: "none" });
    for (const key of ["afterRelease", "cancelled", "lostCapture"]) {
      assert.deepEqual(out[key], { cursor: "auto", selection: "auto" }, key);
    }
    assert.deepEqual(out.disposed, { cursor: "auto", selection: "auto", width: 760, grips: 0, override: "" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
