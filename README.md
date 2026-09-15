# TheWorkLab01

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

| Script                 | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Start the dev server with hot reload                          |
| `npm run build`        | Produce a production build in `dist/`                         |
| `npm run preview`      | Serve the built `dist/` locally to check it                   |
| `npm run lint`         | Run ESLint over JS and Stylelint over CSS                     |
| `npm run lint:fix`     | Fix what the linters can fix automatically                    |
| `npm run format`       | Format everything with Prettier                               |
| `npm run check`        | Format check, lint and build — run this before shipping       |
| `npm run deploy:check` | Build, then validate the Cloudflare deploy without publishing |

## Deployment

The site deploys to **Cloudflare Workers** as static assets, configured in
`wrangler.jsonc`. There is no Worker script — Cloudflare serves the contents of
`dist/` directly. The contact form sends through FormSubmit, so nothing
email-related needs configuring on Cloudflare.

Cloudflare builds from the GitHub repo with these settings:

| Setting        | Value                 |
| -------------- | --------------------- |
| Build command  | `npm run build`       |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/`                   |
| `NODE_VERSION` | `22` (build variable) |

The `name` in `wrangler.jsonc` must match the Worker's name in the Cloudflare
dashboard. Wrangler is pinned as a dev dependency so builds use a known
version.

Run `npm run deploy:check` before pushing a deploy-related change: it builds the
site and has Wrangler validate the config and list what it would upload, without
publishing anything or needing a Cloudflare login.

### One-time setup: activate the contact form

Submissions are delivered by [FormSubmit](https://formsubmit.co), a free
form-to-email service with no account. It needs a single activation:

1. Once the site is live, **submit the contact form once**.
2. FormSubmit emails **awan.raf@gmail.com** an "Activate Form" link.
   **Click it.** (Check spam if it doesn't arrive.)
3. Done — every later submission arrives in that inbox.

Until activation, submissions are not delivered: visitors see an error message
and keep what they typed, and the browser console logs FormSubmit's reason.

**Recommended after activating:** the activation email includes a random alias
for the address. Use it in place of `awan.raf@gmail.com` in `contactEndpoint`
(`src/config.js`) and the form's `action` (`index.html`) so the real address
isn't visible in the page source to spam scrapers.

## Project structure

```
.
├── index.html              # The page. Semantic markup, no inline styles.
├── wrangler.jsonc          # Cloudflare deploy config (static assets from dist/)
├── public/                 # Copied to the build root as-is
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── main.js             # Entry point: imports CSS, boots enhancements
│   ├── config.js           # Contact form endpoint and other site-level settings
│   ├── assets/
│   │   ├── illustrations/  # Animated section illustrations (SVG)
│   │   └── icons/          # Arrow and chevron glyphs, PNG @3x
│   ├── scripts/
│   │   ├── env.js          # Shared capability checks (motion, pointer)
│   │   ├── reveal.js       # Scroll-triggered fade-in
│   │   ├── cursor.js       # Custom cursor
│   │   ├── tilt.js         # Pointer-tracking card tilt
│   │   ├── contact-form.js # Sends the form via FormSubmit, shows the outcome
│   │   └── worklab-knot-3d.js    # <worklab-knot-3d> hero object (Three.js)
│   └── styles/
│       ├── main.css        # Import manifest — controls cascade order
│       ├── base/           # Tokens, themes, reset, typography, layout
│       ├── components/     # Button, card, field, logo, cursor, reveal
│       └── sections/       # Header, hero, expertise, capabilities, contact, footer
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
light background. A light element inside a dark section — the expertise cards,
the contact form — takes `.theme-light` to switch back.

The **expertise**, **contact** and **footer** bands are dark; everything else is
light.

### Where to change things

- **Colours, type scale, spacing, shadows** → `src/styles/base/tokens.css`.
  Every other stylesheet reads from these custom properties; no file below
  `base/` should contain a raw hex value.
- **Whether a section is light or dark** → its `.theme-light` / `.theme-dark`
  class in `index.html`.
- **Who receives form submissions** → `contactEndpoint` in `src/config.js` and
  the form's `action` in `index.html` (the no-JavaScript fallback). Change both
  together; a new address needs activating once (see above).
- **Dropdown options** (employees, annual sales) → the `<select>`s in
  `index.html`.
- **Copy** → `index.html`.

### The contact form

Submitting validates the form in the browser, then sends it in the background to
FormSubmit, which emails it on. The email lists each field under its visible
label, dropdowns show the option chosen, and the visitor's address is set as
reply-to, so replying goes straight to them. The page shows a sending state,
then a success or error message. Without JavaScript the form posts to FormSubmit
directly, which shows its own confirmation page.

Spam protection: a hidden honeypot field (`_honey`). Bots that fill it get a fake
success and nothing is sent. The no-JavaScript fallback also gets FormSubmit's
own CAPTCHA page; background submissions do not use one. If spam becomes a
problem, a service with built-in filtering (Formspree, Web3Forms) is the next
step.

Submissions pass through FormSubmit's servers. If that is not acceptable later,
the same form can post to a service with an account (Formspree, Web3Forms) by
changing `contactEndpoint` and the response check in `scripts/contact-form.js`.

### Sticky illustrations

On desktop the two service illustrations stay in view while the text column
beside them scrolls, and release when the list ends. When the layout stacks
(tablet and phone) they scroll normally.

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
- Decorative elements (the 3D knot, the illustrations, the logo ring, the
  cursor layers) are `aria-hidden` or have empty `alt`.
- Every form field has a real `<label>`, drawn inside the field to match the
  design, and required fields use native `required` validation.
- The two "learn more" links carry hidden text so each reads uniquely to a
  screen reader ("learn more about generative AI").
- `prefers-reduced-motion` is honoured: scroll reveal, card tilt, the custom
  cursor, the 3D animation and the illustration animations (inside the SVGs
  themselves) all disable themselves, and the native cursor is never hidden.
- Form status messages are announced via a `role="status"` live region.
- The custom cursor only engages on devices with a fine pointer.
- Body copy clears 4.5:1 contrast everywhere.

**Known contrast failure, from the design:** the orange `--color-cta` (#ea6f3f)
measures **2.77:1** as text on the light surfaces (eyebrows, item titles), 2.60:1
on the expertise cards, and white button labels on it measure 2.77:1 — all below
the 4.5:1 WCAG AA minimum. On the dark sections the same orange passes (5.90:1).
It is kept as designed pending a decision; because every instance reads the one
token, a fix is a single-value change in `tokens.css`.

## Notes and known gaps

- **The illustration animations are reconstructed.** The SVGs supplied from
  Claude were saved as frozen snapshots: shapes and timing offsets intact, but
  the animation rules missing. The motion was rebuilt from each file's own
  description and surviving timings. The untouched originals are in
  `design-source/`. If the original animated code turns up, it can replace the
  `<style>` block in each SVG.
- **The footer reads "The Work Lab | 2026 |"** with a trailing separator, exactly
  as in the design. Likely a placeholder for another item.
- **Metadata uses `https://example.com`.** Update the canonical URL, the
  Open Graph URL, and `public/robots.txt` before launch. No `og-image.png`
  exists yet; social shares will have no preview image until one is added.
- **Fonts load from Google Fonts.** Self-hosting them would remove a
  third-party request and improve privacy and first paint.
- **Three.js is ~668 KB** (172 KB gzipped), plus a 2 KB room-environment chunk.
  Both are dynamically imported, so they never block first paint — but if the
  hero object is ever cut, drop the dependency with it.

## Design source

The current design is the **The Work Lab** Figma file (desktop frame, node
`1:157`). Layout, type and colour values in `tokens.css` and the section styles
come from it. The site was checked against it at 1920px: every measured text
element lands within 5px of its Figma position, and the page height is within
3px.

Two deliberate differences from the file:

- **Word spacing on display headings.** The display font closes up word gaps at
  large sizes, so the design itself renders "WORKYOUR" run together. Headings
  get `word-spacing: 0.08em` for legibility; the centred expertise heading sits
  ~13px wider as a result.
- **Hero text position.** Figma centres a fixed 227.5px box that the hero copy
  overflows, which places the text ~43px below true centre. The hero reproduces
  that visual position rather than centring the real content.

`design-source/` holds earlier original exports byte-for-byte, for reference
only. It is excluded from the build, the linters and Prettier, and should never
be edited.

- `Interlock Homepage v3.dc.html` + `support.js` — the first Claude Design export
  the site was ported from, under the project's former name. Not runnable on its
  own: it depends on the design tool's runtime, which interprets non-standard
  tags like `<x-dc>` and `<x-import>` and `style-hover` attributes.
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
