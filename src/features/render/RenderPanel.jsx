// @ts-check
/**
 * RenderPanel -- the live SVG preview.
 *
 * Reads the canonical wiremark source and the resolved theme mode, renders to an
 * SVG through the guarded `safeRender` (the ONLY entry into core's `render()`),
 * and injects the result via `dangerouslySetInnerHTML` into a scrollable,
 * centered surface. Soft warnings and the single hard-error diagnostic surface in
 * a status bar at the bottom (errors red, warnings amber, with line numbers when
 * known). An empty render degrades to a friendly placeholder.
 *
 * Selection model: the preview renders in core's INTERACTIVE mode, so every
 * element is wrapped in a `<g data-wm-line="...">` handle. The surface is
 * therefore click-to-select -- a click maps `data-wm-line` back to the element id
 * (via the source-line index) exactly like the editor caret does -- and the
 * currently selected element is ringed with animated "marching ants". Both are
 * driven off the source line, the one coordinate the interactive SVG exposes, so
 * they stay in lock-step with the OutlineTree and the editor cursor sync.
 *
 * Click-to-escalate: the first click on a spot selects the innermost element
 * there; clicking the same spot again walks one level up the ancestry toward the
 * frame, and stops at the frame. The marching ants are drawn into the frame group
 * (not the element group) with the svg set to overflow:visible, so a full-bleed
 * element's -- or the frame's own -- ring is not trimmed by the frame clip or the
 * svg viewport.
 */
import { useMemo, useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';

import { useSelector, useDispatch } from 'react-redux';
import { safeRender } from '../../utils/wmRender.js';
import { selectSource, selectLineIndex } from '../../store/documentSlice.js';
import {
  selectSelectedElementId,
  selectElement,
  setHoveredElement,
} from '../../store/uiSlice.js';
import { useResolvedThemeMode } from '../../theme/ThemeModeProvider.jsx';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 6;
/** Pointer travel (px) past which a press counts as a pan-drag, not a click. */
const DRAG_THRESHOLD = 4;
/** Padding (svg units) between the selected element and its marching-ants ring. */
const ANTS_PAD = 3;

/** @param {number} v @param {number} lo @param {number} hi */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * One diagnostic row in the status bar.
 * @param {{ diagnostic: import('../../utils/wmRender.js').Diagnostic }} props
 */
function DiagnosticRow({ diagnostic }) {
  const isError = diagnostic.severity === 'error';
  const color = isError ? 'error.main' : 'warning.main';
  const Icon = isError ? ErrorIcon : WarningAmberIcon;
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Icon fontSize="small" sx={{ color }} />
      <Typography
        variant="caption"
        sx={{ color, fontFamily: 'monospace', whiteSpace: 'nowrap' }}
      >
        {typeof diagnostic.line === 'number' ? `L${diagnostic.line}` : '--'}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {diagnostic.message}
      </Typography>
    </Stack>
  );
}

DiagnosticRow.propTypes = {
  diagnostic: PropTypes.shape({
    line: PropTypes.number,
    severity: PropTypes.oneOf(['error', 'warning']).isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
};

/**
 * Presentational render surface. Kept separate from the store-bound default
 * export so it is storyable with explicit props.
 *
 * Selection is expressed in SOURCE-LINE terms -- the one coordinate the
 * interactive SVG exposes (`data-wm-line`) -- so this surface never needs to know
 * about path ids: `selectedLine` says which element's `<g>` to ring with marching
 * ants, and `onPickLine` reports the line of a clicked element back to the host.
 * @param {{
 *   source: string,
 *   mode: 'light'|'dark',
 *   selectedLine?: number|null,
 *   onPickLine?: (line: number) => void,
 *   onHoverLine?: (line: number|null) => void,
 * }} props
 */
export function RenderSurface({
  source, mode, selectedLine = null, onPickLine, onHoverLine,
}) {
  const result = useMemo(() => safeRender(source, mode, { interactive: true }), [source, mode]);
  const { svg, diagnostics } = result;
  const hasSvg = typeof svg === 'string' && svg.trim() !== '';

  const viewportRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const dragRef = useRef(/** @type {{sx:number,sy:number,ox:number,oy:number}|null} */ (null));
  // True once a press has moved past DRAG_THRESHOLD: the trailing `click` is then
  // a pan, not a selection, and is swallowed by `handleClick`.
  const draggedRef = useRef(false);
  // Last canvas-driven pick, as { hitLine, selectedLine }: lets a repeat click on
  // the SAME element walk one level up the ancestry, while only continuing the
  // walk if the selection is still exactly where the previous click left it (so an
  // outline/editor selection in between resets to a fresh innermost pick).
  const lastClickRef = useRef(/** @type {{hitLine:number, selectedLine:number}|null} */ (null));
  // Last reported hovered source line, for deduping the (store-dispatching) hover
  // callback so it only fires when the cursor crosses into a different element.
  const hoverLineRef = useRef(/** @type {number|null} */ (null));
  const initedFor = useRef(/** @type {string|null} */ (null));
  // Whether the cursor is over a clickable (data-wm-line) element: drives the
  // pointer-vs-grab affordance. (Grabbing while dragging is handled by `:active`.)
  const [hoverClickable, setHoverClickable] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 16, y: 16 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  /** Measure viewport + the injected SVG's natural size. Null if not laid out yet. */
  const measure = useCallback(() => {
    const vp = viewportRef.current;
    const svgEl = vp && vp.querySelector('svg');
    if (!vp || !svgEl) return null;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    if (vw < 1 || vh < 1) return null; // layout not settled yet
    const rect = svgEl.getBoundingClientRect();
    const sw = parseFloat(svgEl.getAttribute('width') || '') || rect.width || 1;
    const sh = parseFloat(svgEl.getAttribute('height') || '') || rect.height || 1;
    return { vw, vh, sw, sh };
  }, []);

  /** Center the content at zoom `z` and apply. */
  const centerAt = useCallback((z) => {
    const m = measure();
    setZoom(z);
    if (!m) return;
    setPan({
      x: Math.max(12, (m.vw - m.sw * z) / 2),
      y: Math.max(12, (m.vh - m.sh * z) / 2),
    });
  }, [measure]);

  const fit = useCallback(() => {
    const m = measure();
    if (!m) return; // dims not ready -> keep current (visible) view
    const z = clamp(Math.min(m.vw / (m.sw + 32), m.vh / (m.sh + 32)), MIN_ZOOM, 2);
    centerAt(z);
  }, [measure, centerAt]);

  const reset = useCallback(() => centerAt(1), [centerAt]);

  /** Zoom to `z`, keeping the viewport point (cx,cy) fixed under the cursor. */
  const zoomAround = useCallback((z, cx, cy) => {
    const nz = clamp(z, MIN_ZOOM, MAX_ZOOM);
    const prev = zoomRef.current;
    setPan((p) => ({ x: cx - (cx - p.x) * (nz / prev), y: cy - (cy - p.y) * (nz / prev) }));
    setZoom(nz);
  }, []);

  const zoomInCenter = useCallback(() => {
    const vp = viewportRef.current;
    zoomAround(zoomRef.current * 1.2, (vp?.clientWidth || 0) / 2, (vp?.clientHeight || 0) / 2);
  }, [zoomAround]);
  const zoomOutCenter = useCallback(() => {
    const vp = viewportRef.current;
    zoomAround(zoomRef.current / 1.2, (vp?.clientWidth || 0) / 2, (vp?.clientHeight || 0) / 2);
  }, [zoomAround]);

  // Auto-fit once when the document first renders (and when switching from empty
  // to non-empty), so the wireframe lands nicely sized; manual zoom/pan persists
  // across edits afterward.
  useLayoutEffect(() => {
    if (!hasSvg) { initedFor.current = null; return undefined; }
    if (initedFor.current !== null) return undefined;
    initedFor.current = 'done';
    // Defer to after layout so the viewport has real dimensions (an immediate
    // measure inside a settling flex container reads 0 and mis-fits).
    const raf = requestAnimationFrame(() => requestAnimationFrame(fit));
    return () => cancelAnimationFrame(raf);
  }, [hasSvg, fit]);

  // Native non-passive wheel listener: ctrl/meta+wheel zooms toward the cursor;
  // plain wheel pans. preventDefault is required to stop browser page-zoom.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    /** @param {WheelEvent} e */
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = vp.getBoundingClientRect();
        const dir = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomAround(zoomRef.current * dir, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomAround]);

  // Report the hovered source line upward (for the OutlineTree preview) and flip
  // the pointer affordance, deduped so it only fires when the cursor crosses into
  // a different element.
  const reportHover = useCallback((line) => {
    if (line === hoverLineRef.current) return;
    hoverLineRef.current = line;
    setHoverClickable(line != null);
    if (onHoverLine) onHoverLine(line);
  }, [onHoverLine]);

  const onMouseDown = useCallback((e) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
    draggedRef.current = false;
  }, [pan.x, pan.y]);
  const onMouseMove = useCallback((e) => {
    const d = dragRef.current;
    if (d) {
      // Panning: past the threshold, swallow the trailing click and drop the hover
      // affordance (the cursor is `grabbing` via `:active` while the button is down).
      if (!draggedRef.current && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_THRESHOLD) {
        draggedRef.current = true;
        reportHover(null);
      }
      setPan({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
      return;
    }
    // Not dragging: report the innermost clickable element under the cursor.
    const target = /** @type {Element|null} */ (e.target);
    const g = target && typeof target.closest === 'function' ? target.closest('[data-wm-line]') : null;
    const line = g ? Number(g.getAttribute('data-wm-line')) : null;
    reportHover(Number.isFinite(line) ? line : null);
  }, [reportHover]);
  const endDrag = useCallback(() => { dragRef.current = null; }, []);
  const onMouseLeave = useCallback(() => {
    dragRef.current = null;
    reportHover(null);
  }, [reportHover]);

  // Click -> selection, with click-to-escalate. The first click on a spot selects
  // the INNERMOST element under the cursor (core's `data-wm-line` handles nest, so
  // `closest` finds it). Clicking the SAME element again walks one level up the
  // ancestry toward the frame, and again, and again; clicking once more at the
  // frame CYCLES back to the innermost element. Clicking a DIFFERENT element (or
  // after an outline/editor selection) starts fresh at that element's innermost
  // level. A click that concluded a pan-drag is ignored.
  const handleClick = useCallback((e) => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    if (!onPickLine) return;
    const target = /** @type {Element|null} */ (e.target);
    if (!target || typeof target.closest !== 'function') return;
    const hit = target.closest('[data-wm-line]');
    if (!hit) return;
    // Ancestor chain of source lines, innermost first, up to and including the
    // frame. (Adjacent duplicates -- e.g. a Card and its synthetic CardContent
    // share a line -- collapse so they don't waste an escalation step.)
    /** @type {number[]} */
    const chain = [];
    for (let n = /** @type {Element|null} */ (hit); n; n = n.parentElement) {
      if (n.hasAttribute('data-wm-line')) {
        const ln = Number(n.getAttribute('data-wm-line'));
        if (Number.isFinite(ln) && chain[chain.length - 1] !== ln) chain.push(ln);
      }
      if (n.classList.contains('wm-frame')) break; // reached the frame root
    }
    if (chain.length === 0) return;
    const hitLine = chain[0];
    // Continue walking up only if this is a repeat click on the same element AND
    // the selection still sits exactly where the previous click left it (an
    // outline/editor pick in between breaks the chain -> fresh innermost select).
    const prev = lastClickRef.current;
    const continuing = prev != null && prev.hitLine === hitLine && prev.selectedLine === selectedLine;
    let nextLine;
    if (continuing && selectedLine != null) {
      const idx = chain.indexOf(selectedLine);
      // Wrap past the frame back to the innermost element (cycle, not clamp).
      nextLine = idx === -1 ? hitLine : chain[(idx + 1) % chain.length];
    } else {
      nextLine = hitLine;
    }
    lastClickRef.current = { hitLine, selectedLine: nextLine };
    onPickLine(nextLine);
  }, [onPickLine, selectedLine]);

  // Marching-ants overlay: ring the selected element's `<g>` with an animated,
  // dashed rect. The rect is appended to the FRAME group, not the element group:
  // element groups live inside the frame's overflow clip, so a full-bleed element
  // (an AppBar, a frame-width Stack) would have its ring clipped away on three
  // sides. The frame group shares the element's coordinate space -- there are no
  // transforms between an element and its frame, so getBBox()'s frame-local
  // numbers drop straight in -- but sits OUTSIDE the clip, so the whole ring shows.
  // Re-runs when the svg is re-injected (source/theme change) or the selection
  // moves; styling (themed stroke, dashes, march) lives in the svg Box `sx` below.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const svgEl = vp && vp.querySelector('svg');
    if (!svgEl) return undefined;
    svgEl.querySelectorAll('[data-wm-selection]').forEach((n) => n.remove());
    if (selectedLine == null || !Number.isFinite(selectedLine)) return undefined;
    const g = /** @type {SVGGraphicsElement|null} */ (
      svgEl.querySelector(`[data-wm-line="${selectedLine}"]`)
    );
    if (!g || typeof g.getBBox !== 'function') return undefined;
    let bbox;
    try { bbox = g.getBBox(); } catch { return undefined; }
    if (!bbox || (bbox.width === 0 && bbox.height === 0)) return undefined;
    const host = g.closest('.wm-frame') || g;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('data-wm-selection', '');
    rect.setAttribute('x', String(bbox.x - ANTS_PAD));
    rect.setAttribute('y', String(bbox.y - ANTS_PAD));
    rect.setAttribute('width', String(bbox.width + ANTS_PAD * 2));
    rect.setAttribute('height', String(bbox.height + ANTS_PAD * 2));
    host.appendChild(rect);
    return () => { rect.remove(); };
  }, [svg, selectedLine]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minHeight: 0,
        minWidth: 0,
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, minWidth: 0 }}>
        {hasSvg ? (
          <>
            <Box
              ref={viewportRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={endDrag}
              onMouseLeave={onMouseLeave}
              onClick={handleClick}
              sx={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                // `cursor` inherits into the injected svg, so this one value drives
                // the whole surface: pointer over a clickable element, grab over
                // empty canvas, grabbing while panning (button held -> `:active`).
                cursor: hoverClickable ? 'pointer' : 'grab',
                '&:active': { cursor: 'grabbing' },
                // A pan-drag that starts over SVG text would otherwise begin a
                // native text selection (the flickering highlight). The wireframe
                // text is decorative, so disable selection across the surface.
                userSelect: 'none',
              }}
            >
              <Box
                // The SVG comes from the guarded `safeRender`; core produces the markup.
                dangerouslySetInnerHTML={{ __html: svg }}
                sx={(theme) => ({
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transformOrigin: '0 0',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  // overflow:visible lets the selection ring show even when it
                  // sits just outside the frame's viewBox (a full-bleed element, or
                  // the frame itself) -- otherwise the SVG viewport clips it away.
                  // The wrapping viewport Box still clips at the panel edges.
                  '& svg': { display: 'block', overflow: 'visible' },
                  // Marching-ants ring around the selected element (the rect is
                  // injected imperatively by the selection effect above). A
                  // non-scaling stroke keeps the ring a constant visual weight at
                  // any zoom; the dash offset animates for the "march".
                  '& [data-wm-selection]': {
                    fill: 'none',
                    stroke: theme.palette.primary.main,
                    strokeWidth: 1.5,
                    strokeDasharray: '6 4',
                    vectorEffect: 'non-scaling-stroke',
                    pointerEvents: 'none',
                    animation: 'wm-march 0.6s linear infinite',
                  },
                  '@keyframes wm-march': { to: { strokeDashoffset: -10 } },
                })}
              />
            </Box>

            {/* Zoom / pan toolbar */}
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 2,
                px: 0.5,
              }}
            >
              <Tooltip title="Zoom out">
                <IconButton size="small" aria-label="Zoom out" onClick={zoomOutCenter}>
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset to 100%">
                <Box
                  component="button"
                  aria-label="Reset zoom"
                  onClick={reset}
                  sx={{
                    border: 0,
                    background: 'none',
                    cursor: 'pointer',
                    color: 'text.secondary',
                    font: 'inherit',
                    fontSize: 12,
                    minWidth: 44,
                  }}
                >
                  {Math.round(zoom * 100)}%
                </Box>
              </Tooltip>
              <Tooltip title="Zoom in">
                <IconButton size="small" aria-label="Zoom in" onClick={zoomInCenter}>
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />
              <Tooltip title="Fit to view">
                <IconButton size="small" aria-label="Fit to view" onClick={fit}>
                  <FitScreenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Center (100%)">
                <IconButton size="small" aria-label="Center view" onClick={reset}>
                  <CenterFocusStrongIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          </>
        ) : (
          <Stack
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{ height: '100%', color: 'text.secondary' }}
          >
            <Typography variant="body2">Nothing to preview yet.</Typography>
            <Typography variant="caption">
              Start typing wiremark to see the rendered wireframe.
            </Typography>
          </Stack>
        )}
      </Box>

      {diagnostics.length > 0 && (
        <>
          <Divider />
          <Box
            sx={{
              flexShrink: 0,
              maxHeight: 140,
              overflow: 'auto',
              px: 2,
              py: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={0.5}>
              {diagnostics.map((d, i) => (
                <DiagnosticRow key={`${d.severity}-${d.line ?? 'x'}-${i}`} diagnostic={d} />
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}

RenderSurface.propTypes = {
  source: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['light', 'dark']).isRequired,
  selectedLine: PropTypes.number,
  onPickLine: PropTypes.func,
  onHoverLine: PropTypes.func,
};

/**
 * The store-bound render panel used by the app. Bridges the positional path-id
 * selection model to the surface's line-based one through the memoized source-line
 * index: the selected id resolves to the line to ring, and a clicked line resolves
 * back to the id to select -- the same two-way mapping the editor caret sync uses.
 */
export default function RenderPanel() {
  const source = useSelector(selectSource);
  const mode = useResolvedThemeMode();
  const { idToLine, lineToId } = useSelector(selectLineIndex);
  const selectedId = useSelector(selectSelectedElementId);
  const dispatch = useDispatch();

  const selectedLine = selectedId != null && idToLine[selectedId] != null
    ? idToLine[selectedId]
    : null;

  const onPickLine = useCallback(
    /** @param {number} line */
    (line) => {
      const id = lineToId[line];
      if (id) dispatch(selectElement(id));
    },
    [lineToId, dispatch],
  );

  const onHoverLine = useCallback(
    /** @param {number|null} line */
    (line) => {
      const id = line != null ? lineToId[line] ?? null : null;
      dispatch(setHoveredElement(id));
    },
    [lineToId, dispatch],
  );

  return (
    <RenderSurface
      source={source}
      mode={mode}
      selectedLine={selectedLine}
      onPickLine={onPickLine}
      onHoverLine={onHoverLine}
    />
  );
}
