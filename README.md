# bb-plugin-ocean-skin

A skin for bb, ported from [SiyuQian/dsh-ocean-effort-skin](https://github.com/SiyuQian/dsh-ocean-effort-skin). It keeps your bb theme (Nord, Dracula, a custom theme, and so on) and adds rotating ocean backgrounds:

- Four watercolor ocean pictures sit behind the app. In each one, the whale-eared girl sits in the left quarter, under the sidebar. Small decorations fill the other corners.
- A random picture shows at start. Every 60 seconds the next one crossfades in (2.4 s fade). With reduced motion, the picture changes without a fade.
- The sidebar and the main pane become translucent, so the picture shows through. The skin mixes alpha into the active theme's own colors, so every theme works in light and dark mode.
- Sticky project labels in the sidebar turn to frosted glass while they are stuck, so rows that scroll under them stay hidden. Menus, dialogs and the composer stay opaque.
- On the home page, the "Recent" label and the area around the composer are frosted glass too. Inline visualizations stay solid, because bb draws them in a sandboxed frame. The skin frames each one as a card.

中文：保留 bb 当前主题，加入四张每 60 秒淡入淡出轮换的海洋背景（鲸耳少女在侧边栏后方），侧边栏和主区域变为半透明。

The DSH version also replaces the model and effort picker. bb has no slot to replace its own picker, so this port does not include it.

## Install

```
bb plugin install git:https://github.com/SiyuQian/bb-plugin-ocean-skin.git
```

Or from a local checkout: `bb plugin install .`

To turn it off: `bb plugin disable ocean-skin`.

## How it works

- `app.tsx` registers one content script. `skin.ts` mounts it: a `<style>` tag, two picture layers behind the app, and a `data-ocean-skin` attribute on `<html>`. The disposer removes all of them when you disable or reload the plugin.
- `server.ts` serves the pictures from `assets/` at `/api/v1/plugins/ocean-skin/http/bg-<n>.webp`. bb's frontend build has no image loader, so the pictures stay out of the bundle.
- The CSS targets bb's data attributes (`[data-sidebar]`, `[data-framed]`, `[data-sidebar-sticky-tier]`). It covers the web layout, the framed desktop layout, and phone widths. A bb update that renames these attributes makes the panes opaque again. It does not hide content.

## Develop

```
npm install
npm test            # serves each picture, and checks the skin CSS on a copy of bb's markup in headless Chrome
npm run typecheck
bb plugin build
bb plugin install .
bb plugin dev       # rebuild and reload on save
```

`npm test` skips the CSS tests when it finds no Chrome. Set `CHROME_PATH` to point at one.

The CSS tests use a copy of bb's markup, so they cannot see markup that a bb update adds. After a bb update, run `tests/live-audit.js` against the real bb UI. It lists every solid pane-colored block at phone size. The file header gives the commands.

## Credits

- Background pictures (`assets/bg-1.webp` to `bg-4.webp`) and the logo (`assets/logo.webp`): copied from [SiyuQian/dsh-ocean-effort-skin](https://github.com/SiyuQian/dsh-ocean-effort-skin) and converted to WebP. They were generated with gpt-image, using the character from [chouxiaohuai/dsh-uiskin-theme](https://github.com/chouxiaohuai/dsh-uiskin-theme) as reference. The MIT license of this repository **does not cover these images**. Character rights belong to the original author.

## License

MIT for the code in this repository (see `LICENSE`). The images are excluded, as described above.
