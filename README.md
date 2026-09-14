# TheWorkLab

The website for TheWorkLab, an AI automation business. Built with Vite and
plain HTML, CSS and JavaScript — no UI framework and no runtime dependencies
beyond Three.js for the hero object.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at <http://localhost:5173> with hot module replacement.

## Scripts

| Script             | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Start the dev server with hot reload                    |
| `npm run build`    | Produce a production build in `dist/`                   |
| `npm run preview`  | Serve the built `dist/` locally to check it             |
| `npm run lint`     | Run ESLint over JS and Stylelint over CSS               |
| `npm run lint:fix` | Fix what the linters can fix automatically              |
| `npm run format`   | Format everything with Prettier                         |
| `npm run check`    | Format check, lint and build — run this before shipping |

## Project structure

```
.
├── index.html              # The page. Semantic markup, no inline styles.
├── public/                 # Copied to the build root as-is
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── main.js             # Entry point: imports CSS, boots enhancements
│   ├── config.js           # Booking URL and other site-level settings
│   ├── scripts/
│   │   ├── env.js          # Shared capability checks (motion, pointer)
│   │   ├── reveal.js       # Scroll-triggered fade-in
│   │   ├── cursor.js       # Custom cursor
│   │   ├── tilt.js         # Pointer-tracking card tilt
│   │   └── worklab-knot-3d.js    # <worklab-knot-3d> hero object (Three.js)
│   └── styles/
│       ├── main.css        # Import manifest — controls cascade order
│       ├── base/           # Tokens, themes, reset, typography, layout
│       ├── components/     # Button, card, logo, cursor, reveal
│       └── sections/       # Header, hero, pricing, booking, footer
└── design-source/          # Original exports, byte-for-byte, for reference
```

### Light and dark surfaces

The site is light-first. Colours are resolved in two layers:

1. `base/tokens.css` holds the **raw palette** — named colours that know nothing
   about where they are used.
2. `base/themes.css` maps those onto **semantic `--surface-*` tokens**
   (`--surface-bg`, `--surface-text`, `--surface-heading`, `--surface-line`,
   `--surface-card-bg`, and so on). `:root` carries the light set; `.theme-dark`
   overrides it.

Components only ever read `--surface-*`, never the raw palette. So flipping any
part of the page between light and dark is a one-class change in the markup:

```html
<section class="section theme-dark">
  <!-- ...identical markup, dark surface -->
</section>
```

`.theme-dark` paints its own background, so it cannot leave light text on a
light background. Light blocks stay transparent and let the ambient wash show
through; add `.section--solid` if one needs to paint itself.

Currently only **01 / The problem** is dark; everything else is light.

### Where to change things

- **Colours, type scale, spacing, shadows** → `src/styles/base/tokens.css`.
  Every other stylesheet reads from these custom properties; no file below
  `base/` should contain a raw hex value.
- **Whether a section is light or dark** → its `.theme-light` / `.theme-dark`
  class in `index.html`.
- **Booking link** → `src/config.js`. One constant feeds every call-to-action on
  the page via the `data-booking-link` attribute.
- **Copy** → `index.html`.

## Conventions

**CSS** is layered `base → components → sections`, imported in that order by
`src/styles/main.css` so the cascade stays predictable. Class names follow a
BEM-ish `block__element--modifier` pattern, enforced by Stylelint.

**JavaScript** is written as ES modules. Every visual effect is a progressive
enhancement: each module decides for itself whether it should run, and returns a
cleanup function. The page is complete and readable with JavaScript disabled or
failing.

## Accessibility

The following are deliberate and should survive future changes:

- A skip link to `#main` as the first focusable element.
- One `h1`, and a heading order that does not skip levels.
- Every section labelled via `aria-labelledby`.
- Decorative elements (the 3D mark, the logo glyph, the cursor layers, the
  background wash) are `aria-hidden`.
- `prefers-reduced-motion` is honoured: scroll reveal, card tilt, the custom
  cursor and the 3D animation all disable themselves, and the native cursor is
  never hidden.
- The custom cursor only engages on devices with a fine pointer.
- All body text clears 4.5:1 contrast against its surface. `--color-text-on-paper-faint`
  is the palest tone that still passes — do not lighten it.

Currently hidden via the `hidden` attribute, pending content decisions: the
Pricing section (with its header and footer nav links) and the "An AI tool
bought against the documented 70%…" line in the problem section. Remove the
attribute to bring any of them back.

## Notes and known gaps

- **The booking link is a placeholder.** `src/config.js` points at
  `https://calendly.com`. Replace it with the real scheduling URL.
- **Pricing figures are placeholders** (`[$X,XXX]`), as are the company
  registration and address in the footer — carried over from the design.
- **Metadata uses `https://example.com`.** Update the canonical URL, the
  Open Graph URL, and `public/robots.txt` before launch. No `og-image.png`
  exists yet; social shares will have no preview image until one is added.
- **Fonts load from Google Fonts.** Self-hosting them would remove a
  third-party request and improve privacy and first paint.
- **Three.js is ~668 KB** (172 KB gzipped), plus a 2 KB room-environment chunk.
  Both are dynamically imported, so they never block first paint — but if the
  hero object is ever cut, drop the dependency with it.

## Design source

`design-source/` holds the original exports byte-for-byte, for reference only.
It is excluded from the build, the linters and Prettier, and should never be
edited.

- `Interlock Homepage v3.dc.html` + `support.js` — the Claude Design export the
  site was ported from, under the project's former name. Not runnable on its own: it depends on the design tool's
  runtime, which interprets non-standard tags like `<x-dc>` and `<x-import>` and
  `style-hover` attributes.
- `interlock3d.original.js` — the first hero object (two intersecting wireframe
  cubes), replaced by the knot.
- `knot-3dx.original.js` — the standalone knot component as supplied, before it
  was ported to this project's module conventions.

### The hero object

`src/scripts/worklab-knot-3d.js` renders `<worklab-knot-3d>`: a glass
trefoil knot with a copper filament following the same path. It is configured by
attributes in `index.html` — `accent`, `glass`, `ground`, plus `spin`,
`shadow`, `parallax` and `quality` to tune or disable the effects.

Differences from the supplied standalone file: Three.js and `RoomEnvironment`
are imported from the bundled dependency rather than a CDN, and the component
tracks its GPU resources so they are released when it is removed. Behaviour and
all visual values are unchanged.
