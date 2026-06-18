// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseSvgSize, exportSvg, svgToPngBlob, exportPng } from './exporters.js';

describe('parseSvgSize (pure)', () => {
  it('reads numeric width/height attributes', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="375" height="812"></svg>';
    expect(parseSvgSize(svg)).toEqual({ width: 375, height: 812 });
  });

  it('strips px units from width/height', () => {
    const svg = '<svg width="640px" height="480px"></svg>';
    expect(parseSvgSize(svg)).toEqual({ width: 640, height: 480 });
  });

  it('falls back to viewBox when width/height are absent', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768"></svg>';
    expect(parseSvgSize(svg)).toEqual({ width: 1024, height: 768 });
  });

  it('uses viewBox only for the missing dimension', () => {
    const svg = '<svg width="500" viewBox="0 0 1024 768"></svg>';
    expect(parseSvgSize(svg)).toEqual({ width: 500, height: 768 });
  });

  it('ignores percentage dimensions and falls back to viewBox', () => {
    const svg = '<svg width="100%" height="100%" viewBox="0 0 320 200"></svg>';
    expect(parseSvgSize(svg)).toEqual({ width: 320, height: 200 });
  });

  it('handles comma-separated viewBox values', () => {
    const svg = '<svg viewBox="0,0,200,100"></svg>';
    expect(parseSvgSize(svg)).toEqual({ width: 200, height: 100 });
  });

  it('ignores width/height on inner elements', () => {
    const svg = '<svg width="50" height="60"><rect width="999" height="999"/></svg>';
    expect(parseSvgSize(svg)).toEqual({ width: 50, height: 60 });
  });

  it('returns defaults when nothing parseable is present', () => {
    expect(parseSvgSize('<svg></svg>')).toEqual({ width: 800, height: 600 });
  });

  it('returns defaults for empty / non-string input', () => {
    expect(parseSvgSize('')).toEqual({ width: 800, height: 600 });
    // @ts-expect-error testing defensive path
    expect(parseSvgSize(null)).toEqual({ width: 800, height: 600 });
  });

  it('handles single-quoted attributes', () => {
    const svg = "<svg width='123' height='45'></svg>";
    expect(parseSvgSize(svg)).toEqual({ width: 123, height: 45 });
  });
});

describe('exportSvg (DOM-stubbed)', () => {
  /** @type {Record<string, unknown>} */
  let original;

  beforeEach(() => {
    original = {
      document: globalThis.document,
      URL: globalThis.URL,
    };
  });

  afterEach(() => {
    Object.assign(globalThis, original);
    vi.restoreAllMocks();
  });

  it('creates an anchor with a .svg download name and clicks it', () => {
    const click = vi.fn();
    const anchor = /** @type {*} */ ({ click, style: {} });
    const createElement = vi.fn(() => anchor);
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();

    // @ts-ignore
    globalThis.document = { createElement, body: { appendChild, removeChild } };
    // @ts-ignore
    globalThis.URL = { createObjectURL, revokeObjectURL };

    exportSvg('<svg></svg>', 'my-frame');

    expect(createElement).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('my-frame.svg');
    expect(anchor.href).toBe('blob:fake');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('does not double-append the .svg extension', () => {
    const anchor = /** @type {*} */ ({ click: vi.fn(), style: {} });
    // @ts-ignore
    globalThis.document = { createElement: () => anchor, body: { appendChild: vi.fn(), removeChild: vi.fn() } };
    // @ts-ignore
    globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() };

    exportSvg('<svg></svg>', 'already.svg');
    expect(anchor.download).toBe('already.svg');
  });
});

describe('svgToPngBlob / exportPng (Image + canvas stubbed)', () => {
  let saved;

  beforeEach(() => {
    saved = {
      Image: /** @type {*} */ (globalThis).Image,
      document: globalThis.document,
      btoa: /** @type {*} */ (globalThis).btoa,
    };
  });

  afterEach(() => {
    if (saved.Image === undefined) delete (/** @type {*} */ (globalThis).Image);
    else globalThis.Image = saved.Image;
    globalThis.document = saved.document;
    if (saved.btoa === undefined) delete (/** @type {*} */ (globalThis).btoa);
    else globalThis.btoa = saved.btoa;
    vi.restoreAllMocks();
  });

  /**
   * Build an Image stub whose `src` setter triggers onload/onerror.
   * @param {'load'|'error'} outcome
   */
  function stubImage(outcome) {
    class FakeImage {
      constructor() {
        this.onload = null;
        this.onerror = null;
      }
      set src(_v) {
        queueMicrotask(() => {
          if (outcome === 'load' && this.onload) this.onload();
          if (outcome === 'error' && this.onerror) this.onerror();
        });
      }
    }
    // @ts-ignore
    globalThis.Image = FakeImage;
  }

  /** @param {Blob|null} blob what canvas.toBlob yields */
  function stubCanvasDocument(blob) {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (cb) => cb(blob),
    };
    // @ts-ignore
    globalThis.document = { createElement: () => canvas };
  }

  it('resolves a PNG Blob when the image loads and canvas yields a blob', async () => {
    stubImage('load');
    const fakeBlob = new Blob(['png'], { type: 'image/png' });
    stubCanvasDocument(fakeBlob);

    const result = await svgToPngBlob('<svg width="10" height="10"></svg>', { scale: 2 });
    expect(result).toBe(fakeBlob);
  });

  it('rejects when the image fails to load', async () => {
    stubImage('error');
    stubCanvasDocument(new Blob(['x']));
    await expect(svgToPngBlob('<svg width="10" height="10"></svg>')).rejects.toThrow(/failed to load/i);
  });

  it('rejects when canvas.toBlob produces no blob', async () => {
    stubImage('load');
    stubCanvasDocument(null);
    await expect(svgToPngBlob('<svg width="10" height="10"></svg>')).rejects.toThrow(/no blob/i);
  });

  it('exportPng downloads the resulting blob', async () => {
    stubImage('load');
    const fakeBlob = new Blob(['png'], { type: 'image/png' });
    const click = vi.fn();
    const anchor = /** @type {*} */ ({ click });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (cb) => cb(fakeBlob),
    };
    const createElement = vi.fn((tag) => (tag === 'a' ? anchor : canvas));
    // @ts-ignore
    globalThis.document = { createElement, body: { appendChild: vi.fn(), removeChild: vi.fn() } };
    const savedURL = globalThis.URL;
    // @ts-ignore
    globalThis.URL = { createObjectURL: () => 'blob:png', revokeObjectURL: vi.fn() };

    try {
      await exportPng('<svg width="10" height="10"></svg>', 'pic');
      expect(anchor.download).toBe('pic.png');
      expect(click).toHaveBeenCalledOnce();
    } finally {
      globalThis.URL = savedURL;
    }
  });
});
