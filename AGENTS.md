# AGENTS.md — orientation for AI coding sessions

Read this first. It's the fast map of **what this app is, how it's wired, and the
non-obvious things that will bite you**. For exact signatures and per-module
responsibilities, **the code + its JSDoc + the `*.test.js` files are the source of
truth** (and won't drift like a prose spec would). For the wiremark DSL itself,
the `wiremark` skill (`reference.md`) is authoritative.

## What this is

**Wiremark Editor** — a React SPA/PWA for editing [wiremark](https://wiremark.dev)
wireframes (a plain-text, indentation-significant wireframe DSL that renders to a
hand-drawn SVG). IntelliJ-markdown-style editing: a text editor on one side, a
live rendered preview on the other, with a tri-state toggle (text / split /
render).

- **Local-only, no backend, no auth.** Files are opened/saved to the user's
  machine; export to SVG/PNG/PDF. Works in-browser and packaged as a desktop PWA.
- Stack: **React 19, Vite 8, MUI 9, Redux Toolkit 2, React Router 7, Vitest 4,
  Storybook 10, vite-plugin-pwa.** Plain **JS/JSX** (no TypeScript) with
  `// @ts-check` + JSDoc on business logic.
- Rendering + the component vocabulary come from the npm package
  **`@wiremark/core`** (maintained in the sibling `wiremark` monorepo).

## The one mental model that explains everything

**The wiremark TEXT is the single source of truth** — `state.document.source`, a
plain string. Every other view is *derived* from it:

```
state.document.source  (string, canonical)
   │  WiremarkDocument.parse()  (our fault-tolerant parser)
   ▼
WiremarkDocument tree  ──►  OutlineTree, ElementInspector, autocomplete, ids
   │  treeOps edit + .serialize()
   ▼
new source string  ──►  applyEdit()  ──►  (re-parse, re-render)

state.document.source  ──►  safeRender()  ──►  SVG preview + diagnostics
```

- The **text editor** writes the source directly (`setSource`).
- The **render panel / property form** parse → edit a node via `treeOps` →
  **re-serialize back to text** → `applyEdit(newSource)`. They never hold their
  own separate state.
- This is why undo/redo is just a stack of source strings, and why selection
  identity is positional (see path-ids below).

## ⚠️ `@wiremark/core` — the gotchas that cause most bugs

This package is powerful but sharp. **Most of the bugs we've hit trace back to
misusing it.** The verified facts (these override anything in SPEC.md or your
training data):

1. **`parse()` and `render()` THROW `WiremarkError` on hard errors** (unknown
   component, unknown prop, unquoted text, bad enum, tabs, …). The live editor
   feeds them invalid text on nearly every keystroke. **Never call `render()` /
   `parse()` from app or UI code.** Always go through
   **`utils/wmRender.safeRender(source, theme)`**, which try/catches, surfaces
   `err.loc.line` as a diagnostic, and keeps the last-good SVG so the preview
   degrades instead of crashing. The returned `diagnostics` array only ever holds
   *soft warnings*; hard errors arrive via the thrown error.

2. **`getComponent(name)` returns `undefined` for unknown/blank names.** ALWAYS
   null-check. (A crash this session: `getComponent("A").props` while the user
   was mid-typing `AppBar`.) `registryAdapter` centralizes this via
   `safeGetComponent` — use the adapter, don't call core directly.

3. **`UNIVERSAL_PROPS` is NOT exported.** Universal props (`to`, `scrollbar*`,
   `padding`, `background`, `denseBackground`, `opaque`) are pre-merged into
   `getComponent(name).props`. Don't import `UNIVERSAL_PROPS`.

4. **Shapes:** `def.keyless` is `Array<{kind,to}>` **or `undefined`** (e.g.
   `Card`) — coalesce `?? []`. `def.container/sizing/text` are **sparse** (present
   only when true) — read via `!!`. `icon`-typed props have no `values`.

5. **`core.parse()` is LOSSY** (drops comments, normalizes keyless→keyed, strips
   quotes). **It is never used for the editable model** — that's our own
   `utils/wmParser` (below). Core is used only for: rendering (`safeRender`),
   registry metadata (`getComponent`/`REGISTRY`), and `isKnownComponent`.

6. **Click-to-select runs on core's `interactive` mode, keyed by SOURCE LINE.**
   `render(source, { interactive: true })` (exposed via `safeRender(src, theme,
   { interactive: true })`, which the **RenderPanel uses; exporters do NOT** —
   exports must stay clean) wraps each element/frame in a `<g data-wm-line=...>`
   (plus `data-wm-id`/`data-wm-component`/`data-wm-to`). The rendered SVG still has
   **no per-node geometry**, and `data-wm-id` is core's wiremark `#id`, **not our
   path-id** — so DON'T select on it. Instead the preview maps a clicked
   `data-wm-line` back to our path-id through the same `selectLineIndex`
   (`lineToId`/`idToLine`) the **editor cursor ↔ selection sync** uses, and rings
   the selected element with marching ants found by `[data-wm-line]`. Any unmapped
   line just degrades to no-op (fault-tolerant). The **OutlineTree** remains a
   parallel selection driver. Only importable core symbols: `parse, render,
   REGISTRY, getComponent, isKnownComponent, toFlowGraph, toMermaid, WiremarkError,
   NotImplementedError`.

## Two parsers — don't confuse them

| | `@wiremark/core` `parse()` | our `utils/wmParser.parse()` |
| --- | --- | --- |
| Throws? | **Yes** (hard errors) | **Never** |
| Lossy? | Yes | No (preserves comments, token style, trivia) |
| Used for | nothing in the editable model | **the editable tree** (`WiremarkDocument.parse`) |

`WiremarkDocument.parse(source)` → our parser → hydrates the domain tree and
assigns ids. It tolerates anything the user types.

## Folder structure (`src/`)

```
domain/      Pure POJO domain objects. NO React/Redux/MUI imports.
             BasicDomain (clone/with/toJSON/equals) + BasicArray are the base.
             WiremarkDocument / WiremarkElement / WiremarkElementList = the tree.
utils/       Pure business logic (the bulk of the unit tests):
             wmParser (text→tree, fault-tolerant), wmSerializer (tree→text),
             treeOps (ALL structural edits + move semantics), tokenEdit,
             registryAdapter (core registry → editor metadata, null-safe),
             wmRender.safeRender (the ONLY entry to core render),
             exporters (svg/png/pdf), fileIo (open/save), pathId, lineIndex,
             completionContext, iconNames, analytics (Aptabase event names +
             surfaceTag + the isAnalyticsEnabled gate; pure/testable).
store/       Redux Toolkit. documentSlice (source + history), uiSlice
             (themeMode/viewMode/selectedElementId), thunks, index.
theme/       MUI light/dark theme + ThemeModeProvider + useResolvedThemeMode().
config/      Plain JS constants (externalLinks: the UI's outbound URLs). The one
             build-time env var is VITE_APTABASE_KEY (analytics) -- set in the
             Netlify build, absent in dev/test/Storybook so analytics stays off.
components/
  common/    Reusable bits (BrandLogo, ConfirmDialog, ExternalLink).
  layout/    App chrome: EditorAppBar, FileMenu, HelpMenu, AboutDialog,
             ComponentDrawer, ThemeModeToggle.
features/
  editor/    CodeMirror text editor + wiremark StreamLanguage + completions.
  render/    RenderPanel (SVG + zoom/pan), OutlineTree, ElementInspector.
  properties/ PropertyForm + one control per field type.
  elements/  Component-palette pieces (ElementList/Item/Card) used by the drawer.
screens/     EditorScreen (composes everything), ErrorScreen (route errorElement).
router/      createBrowserRouter; App.jsx is the layout shell.
hooks/       React hooks for transient browser state: useInstallPrompt (PWA
             install lifecycle), useTrack (analytics seam -- the ONLY way UI
             records Aptabase events; no-ops when disabled, never throws).
test/        Vitest setup (jest-dom).
```

Every component in `components/` and `features/` has a co-located
`*.stories.jsx`. Business logic in `domain/`/`utils/`/`store/` has co-located
`*.test.js`.

## Key invariants & patterns

- **`treeOps` is the *only* owner of structural edits** (move up/down/ascend/
  descend, add/remove/update). Domain classes are read-only; don't add mutators
  to them. Move predicates (`canMoveUp`, …) gate the inspector's buttons. The
  behavioral spec (also enforced by `treeOps.test.js`):
  - **Up** — move before the previous sibling; disabled if it's the first child.
  - **Down** — move after the next sibling; disabled if it's the last child.
  - **Ascend** — move to the parent's level, immediately before the parent;
    disabled at the top wireframe level (parent is a frame root).
  - **Descend** — become the first child of the next sibling; disabled if there's
    no next sibling, or the next sibling isn't a container (`getComponent().container`).
- **Identity = path-id** (`pathId([frameIdx, ...childIdxs])`, e.g. `"0.2.1"`),
  assigned during `WiremarkDocument.parse`. Stable for unchanged nodes across
  re-parses. A move changes a node's path, so `treeOps` mutators **return the
  moved node's new id** and the caller re-points `selectedElementId` in the same
  dispatch — that's how selection survives a move. (Don't introduce a second id
  scheme.)
- **`line`** (1-based source line) rides on each `WiremarkElement` for editor
  cursor↔selection sync via `selectLineIndex`. It's positional/derived, so it is
  **deliberately excluded from `toJSON()`** (keeps round-trip tests stable).
- **Applying an edit** = `dispatch(applyEdit(newDoc.serialize()))` then
  `dispatch(selectElement(result.selectedId))`, or the `applyStructuralEdit`
  thunk. `setSource` is for raw typing (coalesces bursts into one undo entry);
  `applyEdit` always snapshots history.
- **Fault-tolerance is a design rule, not a nicety.** The editor must never crash
  on partial/invalid input. New code that reads the registry or parses must
  tolerate unknown components, blank lines, half-typed tokens, etc.

## Conventions

- Plain JS/JSX, ESM, `// @ts-check` + JSDoc on logic. `prop-types` on components.
- MUI: import components from `@mui/material`; **icons as per-icon named imports**
  (`import UndoIcon from '@mui/icons-material/Undo'`) — never `import * as Icons`
  (bundle size / PWA).
- Use the MUI theme; no hardcoded colors. Path alias `@/` → `src/`.
- **ASCII only in config/build files** (vite.config, package.json, .env, etc.).
- App version is the Vite-injected global **`__APP_VERSION__`** — don't import
  package.json in app code; reference it guarded
  (`typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'`).
- **Analytics (Aptabase) is production-only and must never break the app.** UI
  records events through **`useTrack()`** (`hooks/useTrack.js`) — never import
  `@aptabase/react` in components directly. `track()` no-ops unless
  `VITE_APTABASE_KEY` is set (dev/test/Storybook send nothing) and swallows all
  errors. Event names + props live in `utils/analytics.js` (`EVENTS`); props must
  be flat scalars and must never include wireframe content.

## Testing strategy

- **Unit tests (Vitest)** cover business logic only — `domain/`, `utils/`,
  `store/`. Round-trip/idempotency for parser↔serializer, every `treeOps` move +
  its disabled predicate, registry mapping (incl. unknown-name tolerance),
  `safeRender` on valid+throwing input, exporters size math, fileIo with stubbed
  globals. **Do NOT unit-test JSX components.**
- **Storybook** is the component workbench; **Chrome MCP** drives Storybook
  stories and the running app for interaction/integration testing.
- All of `npm run build`, `npx vitest run`, and `npm run build-storybook` must
  stay green.

## Commands

```
npm run dev              # vite dev server (http://localhost:5173)
npm run build            # production build (+ PWA service worker)
npx vitest run           # unit tests
npm run build-storybook  # compile all stories (also the integration compile gate)
npm run storybook        # storybook dev server (port 6006)
node scripts/make-square-icon.mjs && npx pwa-assets-generator ...  # regen PWA icons
```

## Lessons already learned (don't re-discover these)

- **Storybook inherits `vite.config.js`** → the PWA plugin runs during
  `build-storybook` and errors on a large asset. `.storybook/main.js` `viteFinal`
  **flattens** the plugins array (`VitePWA()` returns a *nested array*) and strips
  pwa/workbox plugins. Keep that.
- **`RenderPanel`'s surface uses an absolutely-positioned zoom/pan stage**, so its
  container must set `width: 100%` — otherwise the width collapses to 0 (the SVG
  vanishes and the toolbar floats into the editor). Don't remove it.
- **A render error used to take down the whole app** (no boundary). There's now a
  route `errorElement` (`ErrorScreen`). Keep crashes recoverable.
- **The marching-ants selection ring fights TWO clips.** The selected element's
  `<g>` lives inside the frame's content clip (`wm-clip-N`), and the whole drawing
  lives inside the svg viewport (`viewBox`, overflow hidden). A ring drawn into the
  element group, or any ring around a full-bleed element / the frame itself, gets
  trimmed. So `RenderPanel` appends the ring rect to the **frame group** (escapes
  the content clip; element/frame share its coordinate space since nothing between
  them carries a transform) **and** sets the svg to `overflow: visible` (escapes
  the viewport). Keep both. The ring is injected imperatively into the
  `dangerouslySetInnerHTML` svg and cleaned up on selection/source change.
- jsdom/Node may expose a partial `localStorage`; `uiSlice` guards
  `typeof localStorage.getItem === 'function'`. Keep such guards.
- The core invariants (source-as-truth, single path-id scheme, the `safeRender`
  boundary, `treeOps` as sole edit owner) were chosen deliberately and depend on
  each other — change them as a set, not piecemeal, and update this file to match.
