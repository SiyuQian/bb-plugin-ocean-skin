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
/* Full-height pages and the composer dock repeat the pane color; clear them. */
html[${MARK}] [data-sidebar="inset"] :is(.h-full, .shrink-0).bg-background { background-color: transparent !important; }
/* The phone home page has two more pane-colored blocks that rows scroll
   under: sticky list labels ("Recent") and the composer dock. Make them
   glass, like the headers below. The composer itself keeps its color. */
html[${MARK}] [data-sidebar="inset"] .sticky.bg-background,
html[${MARK}] [data-sidebar="inset"] .bg-background:not(.h-full):has([data-promptbox]) {
  background-color: transparent !important;
  -webkit-backdrop-filter: var(--ocean-glass); backdrop-filter: var(--ocean-glass);
}
/* Where the browser can tell that a label is stuck, blur only then: at rest
   the blur would draw a band across the picture. */
@supports (container-type: scroll-state) {
  html[${MARK}] [data-sidebar="inset"] .sticky.bg-background {
    container-type: scroll-state;
    -webkit-backdrop-filter: none; backdrop-filter: none;
  }
  @container scroll-state(stuck: top) {
    html[${MARK}] [data-sidebar="inset"] .sticky.bg-background::before {
      content: ""; position: absolute; inset: 0; z-index: -1;
      -webkit-backdrop-filter: var(--ocean-glass); backdrop-filter: var(--ocean-glass);
    }
  }
}
/* Headers and scrims become glass, and the fades that hid scrolled content
   under them go away (they would draw a band of solid color). */
html[${MARK}] [data-sidebar="inset"] :is(.bg-surface-scrim, .bg-surface-scrim\\/95) {
  background-color: transparent !important;
  -webkit-backdrop-filter: var(--ocean-glass); backdrop-filter: var(--ocean-glass);
}
html[${MARK}] [data-overflow-fade] { visibility: hidden; }

/* Inline visualizations are sandboxed iframes that paint the solid theme
   background; the skin cannot style inside them. Frame each as a card in
   the same color, so the solid block has a rounded, padded edge. */
html[${MARK}] [data-inline-vis-frame] {
  overflow: hidden; border-radius: 12px; border: 1px solid var(--border);
  padding: 8px 12px; background-color: var(--background);
}

/* Desktop app (framed layout): the window frame, the sidebar card and the
   main card (its ::before) each get their own wash. */
html[${MARK}] [data-framed] { background: var(--ocean-frame) !important; }
html[${MARK}] [data-framed] [data-sidebar="collapsible-body"] { background-color: var(--ocean-side) !important; }
html[${MARK}] [data-framed] [data-sidebar="inset"]::before { background-color: var(--ocean-pane) !important; }
/* bb rounds the main card with a mask and a clip-path. Either one makes the
   card a backdrop root: the glass in it (header, composer dock) then blurs
   only the card's wash, without the picture, and paints that wash again as
   a dark band. Remove both. The wash (::before) keeps its rounded corners. */
html[${MARK}] [data-framed] [data-sidebar="inset"] {
  -webkit-mask-image: none !important; mask-image: none !important; clip-path: none !important;
}

/* Phones: bb keeps the sidebar drawer under the main pane and slides the
   pane off it. The pane is translucent, so the drawer rows would show
   through it. Hide the closed drawer. While the pane moves
   ([data-vaul-animate]), move the drawer with the pane's left edge, so no
   part of the drawer is under the pane. mountSkin copies the pane's offset
   and transition to --ocean-shelf and --ocean-shelf-move. */
@media (max-width: 767.98px) {
  html[${MARK}] [data-sidebar="panel"][data-state="closed"] { translate: -100%; }
  html[${MARK}] [data-sidebar="panel"][data-state="closed"]:not([data-vaul-animate]) { visibility: hidden; }
  html[${MARK}] [data-sidebar="panel"][data-vaul-animate] {
    translate: calc(var(--ocean-shelf, 0px) - 100%);
    transition: var(--ocean-shelf-move, none);
  }
  /* iOS can show a strip of the picture below the 100dvh shell. Continue the
     washes down into it; with no strip, the shadow is off-screen. */
  html[${MARK}] [data-sidebar="inset"] { box-shadow: 0 200px 0 var(--ocean-pane); }
  html[${MARK}] [data-sidebar="panel"] { box-shadow: 0 200px 0 var(--ocean-side); }
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

  // Phone drawer: bb sets data-vaul-animate on each step of a slide or a
  // drag, and writes the pane's offset and transition as inline styles.
  // Copy both to the root, where the drawer rule in SKIN_CSS reads them.
  const shelfWatch = new MutationObserver(() => {
    const inset = document.querySelector<HTMLElement>('[data-sidebar="inset"][data-vaul-animate]');
    root.style.setProperty("--ocean-shelf", inset?.style.translate || "0px");
    root.style.setProperty("--ocean-shelf-move", inset?.style.transition || "none");
  });
  shelfWatch.observe(document.body, { subtree: true, attributeFilter: ["data-vaul-animate"] });

  return () => {
    shelfWatch.disconnect();
    root.style.removeProperty("--ocean-shelf");
    root.style.removeProperty("--ocean-shelf-move");
    window.clearInterval(timer);
    for (const layer of layers) layer.remove();
    style.remove();
    root.removeAttribute(MARK);
  };
}
