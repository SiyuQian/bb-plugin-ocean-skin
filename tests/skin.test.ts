import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { MARK, SKIN_CSS } from "../skin.ts";

// Renders a copy of bb's markup with the skin in headless Chrome and reads
// computed styles back. The markup below is copied from bb's DOM; when a bb
// update changes it, copy the new markup here and run tests/live-audit.js.

const CHROME = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => path && existsSync(path));

// Stand-ins for the bb theme tokens and Tailwind classes that the skin reads.
const BB_CSS = `
:root { --background: rgb(30, 30, 46); --sidebar: rgb(40, 40, 60); --canvas: rgb(20, 20, 30); --border: rgb(80, 80, 100); }
.bg-background { background-color: var(--background); }
.bg-sidebar { background-color: var(--sidebar); }
.sticky { position: sticky; top: 0; }
.h-full { height: 100%; }
`;

const BB_HTML = `
<div data-sidebar="panel" data-state="closed" id="panel" class="bg-sidebar">sidebar</div>
<div data-sidebar="panel" data-state="closed" data-vaul-animate="false" id="panel-moving" style="--ocean-shelf: 120px" class="bg-sidebar">sidebar</div>
<main data-sidebar="inset" id="inset" class="h-full bg-background">
  <div id="page" class="h-full bg-background">
    <div id="label" class="sticky top-0 z-10 mb-1 bg-background px-2">Recent</div>
    <div id="vis" data-inline-vis-frame class="relative my-2"><iframe srcdoc="x"></iframe></div>
    <div data-scroll-footer>
      <div id="dock-thread" class="relative shrink-0 bg-background">
        <div id="column" class="chat-prompt-box"><form data-promptbox class="bg-background"></form></div>
      </div>
    </div>
    <div id="dock-home" class="bg-background pb-4"><div><form id="composer" data-promptbox class="bg-background">Ask</form></div></div>
  </div>
</main>
<div data-sidebar-sticky-stack>
  <div data-sidebar-sticky-group>
    <div data-sidebar-sticky-tier="label" id="sticky-label">project</div>
    <div class="mt-1"><div data-sidebar-sticky-section>
      <div data-sidebar-windowed-item><div data-sidebar-sticky-group>
        <div data-sidebar-rename-row id="thread-row">thread</div>
      </div></div>
      <div data-sidebar-windowed-item><div data-sidebar-sticky-group>
        <div data-sidebar-rename-row data-sidebar-sticky-tier="parent" id="parent-row">parent thread</div>
      </div></div>
    </div></div>
  </div>
  <div data-sidebar-sticky-group>
    <div data-sidebar-sticky-tier="label">empty project</div>
    <div class="mt-1"><div id="no-threads">No threads</div></div>
  </div>
</div>
<div data-framed>
  <main data-sidebar="inset" id="framed-inset" style="mask-image: linear-gradient(black, black); clip-path: inset(0 round 8px)"></main>
</div>
<script>
  const out = {};
  for (const el of document.querySelectorAll("[id]")) {
    const cs = getComputedStyle(el);
    out[el.id] = { bg: cs.backgroundColor, blur: cs.backdropFilter, visibility: cs.visibility, translate: cs.translate,
      shadow: cs.boxShadow, radius: cs.borderRadius, overflow: cs.overflow, mask: cs.maskImage, clip: cs.clipPath,
      beforeBlur: getComputedStyle(el, "::before").backdropFilter, animation: cs.animationName, timeline: cs.animationTimeline };
  }
  document.body.append(Object.assign(document.createElement("pre"), { id: "out", textContent: JSON.stringify(out) }));
</script>
`;

type Styles = Record<string, { bg: string; blur: string; visibility: string; translate: string; shadow: string; radius: string; overflow: string; mask: string; clip: string; beforeBlur: string; animation: string; timeline: string }>;

function render(width: number): Styles {
  const file = join(mkdtempSync(join(tmpdir(), "ocean-skin-")), "page.html");
  writeFileSync(file, `<!doctype html><html ${MARK} class="dark"><head><style>${BB_CSS}</style><style>${SKIN_CSS}</style></head><body>${BB_HTML}</body></html>`);
  const dom = execFileSync(CHROME!, ["--headless", "--disable-gpu", "--no-sandbox", `--window-size=${width},844`, "--dump-dom", `file://${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const json = /<pre id="out">(.*?)<\/pre>/s.exec(dom);
  assert.ok(json, "the page script did not run");
  return JSON.parse(json[1]!.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
}

const alpha = (color: string) => (color === "rgba(0, 0, 0, 0)" ? 0 : / \/ ([\d.]+)\)|rgba\(.*, ([\d.]+)\)/.exec(color)?.slice(1).find(Boolean) ?? "1");
const skip = CHROME ? false : "Chrome not found; set CHROME_PATH";

test("no pane-colored block stays solid inside the main pane", { skip }, () => {
  const s = render(390);
  // The pane gets one translucent wash. Wrappers inside it must not add more.
  assert.notEqual(Number(alpha(s.inset!.bg)), 1);
  for (const id of ["page", "label", "dock-thread", "dock-home"]) assert.equal(alpha(s[id]!.bg), 0, `${id} is ${s[id]!.bg}`);
  // The composer keeps its solid color.
  assert.equal(s.composer!.bg, "rgb(30, 30, 46)");
});

test("blocks that rows scroll under are glass; full pages are not", { skip }, () => {
  const s = render(390);
  assert.match(s["dock-home"]!.blur, /blur/);
  assert.equal(s.page!.blur, "none");
});

test("in a thread only the composer column is glass, not the whole dock", { skip }, () => {
  const s = render(1280);
  // A blur across the full-width dock would also blur the picture beside the composer.
  assert.equal(s["dock-thread"]!.blur, "none");
  assert.match(s.column!.beforeBlur, /blur/);
});

test("inline visualizations are framed as cards", { skip }, () => {
  const s = render(390);
  assert.equal(s.vis!.radius, "12px");
  assert.equal(s.vis!.overflow, "hidden");
  assert.equal(s.vis!.bg, "rgb(30, 30, 46)");
});

test("the framed desktop card has no mask or clip-path, so glass in it sees the picture", { skip }, () => {
  const s = render(1280);
  assert.equal(s["framed-inset"]!.mask, "none");
  assert.equal(s["framed-inset"]!.clip, "none");
});

test("sidebar rows fade out under a stuck label; the label stays clear", { skip }, () => {
  const s = render(1280);
  for (const id of ["thread-row", "no-threads"]) {
    assert.equal(s[id]!.animation, "ocean-row-fade", id);
    assert.match(s[id]!.timeline, /^view\(/, id);
  }
  // A stuck parent row stays visible, and the label gets no glass band.
  assert.equal(s["parent-row"]!.animation, "none");
  assert.equal(s["sticky-label"]!.animation, "none");
  assert.equal(s["sticky-label"]!.beforeBlur, "none");
});

test("phone rules apply below 768px only", { skip }, () => {
  const phone = render(390);
  assert.equal(phone.panel!.visibility, "hidden");
  assert.notEqual(phone.inset!.shadow, "none");
  const desktop = render(1280);
  assert.equal(desktop.panel!.visibility, "visible");
  assert.equal(desktop.inset!.shadow, "none");
});

test("the phone drawer moves with the pane's left edge while the pane slides", { skip }, () => {
  const s = render(390);
  // At rest the closed drawer is hidden. During a slide it is visible, and
  // its right edge is at the pane's offset (--ocean-shelf, 120px in the test markup).
  assert.equal(s["panel-moving"]!.visibility, "visible");
  assert.equal(s["panel-moving"]!.translate, "calc(-100% + 120px)");
  assert.equal(render(1280)["panel-moving"]!.translate, "none");
});
