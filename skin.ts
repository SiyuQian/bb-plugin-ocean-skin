// Ocean Skin: rotating pictures behind bb's own theme. Everything here is
// plain DOM, so the content script in app.tsx stays a one-line registration.

/** Set on <html> while the skin is mounted; every rule below is scoped to it. */
export const MARK = "data-ocean-skin";
export const ROTATE_MS = 60_000;
/** Files in assets/ that server.ts serves and the skin rotates through. */
export const BACKGROUNDS = ["bg-1.webp", "bg-2.webp", "bg-3.webp", "bg-4.webp"];

// The palette comes from the active bb theme (--canvas, --background,
// --sidebar), so any theme and both modes work. The skin only adds alpha.
// Selectors use bb's data attributes ([data-sidebar], [data-framed]); bb's
// Tailwind classes appear only where no attribute exists.
export const SKIN_CSS = `
html[${MARK}] {
  --ocean-pane: color-mix(in oklab, var(--background) 62%, transparent);
  --ocean-side: color-mix(in oklab, var(--sidebar) 70%, transparent);
  --ocean-frame: color-mix(in oklab, var(--sidebar) 40%, transparent);
  --ocean-glass: blur(20px) saturate(1.15);
  --ocean-tint: color-mix(in oklab, var(--canvas) 12%, transparent);
  background-color: var(--canvas);
}
html[${MARK}].dark { --ocean-tint: color-mix(in oklab, var(--canvas) 45%, transparent); }
html[${MARK}] body { background-color: transparent !important; }

/* Two stacked picture layers. The new one fades in on top; the old one waits
   under it until the fade ends, so the picture never dims mid-crossfade. */
.ocean-skin-layer {
  position: fixed; inset: 0; z-index: -2; pointer-events: none;
  background: no-repeat left center / cover;
  opacity: 0; transition: opacity 2.4s ease-in-out 2.4s;
}
.ocean-skin-layer[data-on] { z-index: -1; opacity: 1; transition-delay: 0s; }
.ocean-skin-layer::after { content: ""; position: absolute; inset: 0; background: var(--ocean-tint); }

/* Sidebar. bb paints --sidebar on several nested layers; clear the token
   inside the sidebar and paint one wash, so the tints never stack. */
html[${MARK}] [data-sidebar="panel"] { --sidebar: transparent !important; }
html[${MARK}] [data-sidebar="panel"]:not([data-framed] *) { background-color: var(--ocean-side) !important; }
/* Sticky project labels used --sidebar to hide rows that scroll under them.
   While a label is stuck, its ::before (bb's top shield, empty at rest)
   fills the label with a wash and blurs those rows. At rest it stays clear. */
html[${MARK}] [data-sidebar-sticky-tier] { container-type: scroll-state; }
@container scroll-state(stuck: top) {
  html[${MARK}] [data-sidebar-sticky-tier]::before {
    top: 0; bottom: 0; height: auto;
    background-color: var(--ocean-side);
    -webkit-backdrop-filter: var(--ocean-glass); backdrop-filter: var(--ocean-glass);
  }
}

/* Main pane. */
html[${MARK}] [data-sidebar="inset"]:not([data-framed] *) { background-color: var(--ocean-pane) !important; }
/* Full-height pages and bars repeat the pane color; clear them. The
   composer dock has its own rule below. */
html[${MARK}] [data-sidebar="inset"] :is(.h-full, .shrink-0).bg-background:not([data-scroll-footer] > *) { background-color: transparent !important; }
/* Headers and scrims become glass, and the fades that hid scrolled content
   under them go away (they would draw a band of solid color). */
html[${MARK}] [data-sidebar="inset"] :is(.bg-surface-scrim, .bg-surface-scrim\\/95) {
  background-color: transparent !important;
  -webkit-backdrop-filter: var(--ocean-glass); backdrop-filter: var(--ocean-glass);
}
html[${MARK}] [data-overflow-fade]:not([data-scroll-footer] > * > *) { visibility: hidden; }
/* The composer dock is sticky inside the thread's scroll area, so messages
   scroll under it. bb paints the dock opaque, with a fade above it, to hide
   them. Keep that while the dock is stuck. At the end of the thread nothing
   is under the dock, so it turns clear. A blur cannot replace the opaque
   dock: the desktop app's main card is a backdrop root, so text under a
   blur still shows through. */
html[${MARK}] [data-scroll-footer] { container-type: scroll-state; }
@container not scroll-state(stuck: bottom) {
  html[${MARK}] [data-sidebar="inset"] [data-scroll-footer] > .bg-background { background-color: transparent !important; }
  html[${MARK}] [data-scroll-footer] > * > [data-overflow-fade] { visibility: hidden; }
}

/* Desktop app (framed layout): the window frame, the sidebar card and the
   main card (its ::before) each get their own wash. */
html[${MARK}] [data-framed] { background: var(--ocean-frame) !important; }
html[${MARK}] [data-framed] [data-sidebar="collapsible-body"] { background-color: var(--ocean-side) !important; }
html[${MARK}] [data-framed] [data-sidebar="inset"]::before { background-color: var(--ocean-pane) !important; }

/* Phones: the closed sidebar drawer waits under the main pane. Hide it, or
   its rows show through the translucent pane. */
@media (max-width: 767.98px) {
  html[${MARK}] [data-sidebar="panel"][data-state="closed"] { visibility: hidden; }
}

@media (prefers-reduced-motion: reduce) {
  .ocean-skin-layer { transition: none; }
}
`;

/** Mounts the skin into the current document and returns its disposer. */
export function mountSkin(backgrounds: readonly string[]): () => void {
  // Fetch every picture now, so a rotation never fades in an empty layer.
  for (const url of backgrounds) new Image().src = url;
  const root = document.documentElement;
  const style = document.createElement("style");
  style.setAttribute(MARK, "");
  style.textContent = SKIN_CSS;
  document.head.append(style);
  root.setAttribute(MARK, "");

  const layers = [0, 1].map(() => {
    const layer = document.createElement("div");
    layer.className = "ocean-skin-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.prepend(layer);
    return layer;
  });
  let index = Math.floor(Math.random() * backgrounds.length);
  let front = 0;
  const show = (layer: HTMLElement) => {
    layer.style.backgroundImage = `url("${backgrounds[index]}")`;
    layer.setAttribute("data-on", "");
  };
  show(layers[front]!);

  const timer = window.setInterval(() => {
    if (document.hidden) return;
    index = (index + 1) % backgrounds.length;
    const back = 1 - front;
    show(layers[back]!);
    layers[front]!.removeAttribute("data-on");
    front = back;
  }, ROTATE_MS);

  return () => {
    window.clearInterval(timer);
    for (const layer of layers) layer.remove();
    style.remove();
    root.removeAttribute(MARK);
  };
}
