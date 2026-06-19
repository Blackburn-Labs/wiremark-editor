// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isFileSystemAccessSupported,
  hasActiveHandle,
  clearHandle,
  openWiremarkFile,
  saveWiremarkFile,
  saveWiremarkFileAs,
} from './fileIo.js';

/** Snapshot of the globals we mutate, restored after each test. */
let saved;

beforeEach(() => {
  saved = {
    showOpenFilePicker: /** @type {*} */ (globalThis).showOpenFilePicker,
    showSaveFilePicker: /** @type {*} */ (globalThis).showSaveFilePicker,
    document: globalThis.document,
    URL: globalThis.URL,
  };
  clearHandle();
});

afterEach(() => {
  // Delete keys we added; restore originals.
  delete (/** @type {*} */ (globalThis).showOpenFilePicker);
  delete (/** @type {*} */ (globalThis).showSaveFilePicker);
  if (saved.showOpenFilePicker !== undefined) globalThis.showOpenFilePicker = saved.showOpenFilePicker;
  if (saved.showSaveFilePicker !== undefined) globalThis.showSaveFilePicker = saved.showSaveFilePicker;
  globalThis.document = saved.document;
  globalThis.URL = saved.URL;
  clearHandle();
  vi.restoreAllMocks();
});

describe('isFileSystemAccessSupported', () => {
  it('false when pickers are absent', () => {
    delete (/** @type {*} */ (globalThis).showOpenFilePicker);
    delete (/** @type {*} */ (globalThis).showSaveFilePicker);
    expect(isFileSystemAccessSupported()).toBe(false);
  });

  it('true when both pickers exist', () => {
    // @ts-ignore
    globalThis.showOpenFilePicker = () => {};
    // @ts-ignore
    globalThis.showSaveFilePicker = () => {};
    expect(isFileSystemAccessSupported()).toBe(true);
  });
});

describe('hasActiveHandle / clearHandle', () => {
  it('starts with no handle', () => {
    expect(hasActiveHandle()).toBe(false);
  });

  it('opening via the picker stores a handle, clearHandle removes it', async () => {
    const file = { name: 'a.wiremark', text: () => Promise.resolve('Wireframe #x') };
    const handle = { name: 'a.wiremark', getFile: () => Promise.resolve(file) };
    // @ts-ignore
    globalThis.showOpenFilePicker = vi.fn(() => Promise.resolve([handle]));
    // @ts-ignore
    globalThis.showSaveFilePicker = () => {};

    const opened = await openWiremarkFile();
    expect(opened).toEqual({ name: 'a.wiremark', source: 'Wireframe #x' });
    expect(hasActiveHandle()).toBe(true);

    clearHandle();
    expect(hasActiveHandle()).toBe(false);
  });
});

describe('openWiremarkFile cancellation', () => {
  it('returns null when the open picker is aborted', async () => {
    const abort = Object.assign(new Error('cancel'), { name: 'AbortError' });
    // @ts-ignore
    globalThis.showOpenFilePicker = vi.fn(() => Promise.reject(abort));
    // @ts-ignore
    globalThis.showSaveFilePicker = () => {};

    const result = await openWiremarkFile();
    expect(result).toBeNull();
    expect(hasActiveHandle()).toBe(false);
  });
});

describe('saveWiremarkFile', () => {
  it('writes through an existing handle (in-place save)', async () => {
    // First open to establish a handle.
    const write = vi.fn(() => Promise.resolve());
    const close = vi.fn(() => Promise.resolve());
    const writable = { write, close };
    const file = { name: 'doc.wiremark', text: () => Promise.resolve('old') };
    const handle = {
      name: 'doc.wiremark',
      getFile: () => Promise.resolve(file),
      createWritable: vi.fn(() => Promise.resolve(writable)),
    };
    // @ts-ignore
    globalThis.showOpenFilePicker = vi.fn(() => Promise.resolve([handle]));
    // @ts-ignore
    globalThis.showSaveFilePicker = vi.fn();

    await openWiremarkFile();
    const result = await saveWiremarkFile({ source: 'new content', name: 'doc.wiremark' });

    expect(handle.createWritable).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith('new content');
    expect(close).toHaveBeenCalledOnce();
    expect(result).toEqual({ name: 'doc.wiremark', usedHandle: true });
  });

  it('uses showSaveFilePicker and stores the new handle when supported but no handle yet', async () => {
    const write = vi.fn(() => Promise.resolve());
    const close = vi.fn(() => Promise.resolve());
    const handle = {
      name: 'fresh.wiremark',
      createWritable: vi.fn(() => Promise.resolve({ write, close })),
    };
    // @ts-ignore
    globalThis.showOpenFilePicker = () => {};
    // @ts-ignore
    globalThis.showSaveFilePicker = vi.fn(() => Promise.resolve(handle));

    expect(hasActiveHandle()).toBe(false);
    const result = await saveWiremarkFile({ source: 'hello', name: 'fresh.wiremark' });

    expect(globalThis.showSaveFilePicker).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith('hello');
    expect(result).toEqual({ name: 'fresh.wiremark', usedHandle: true });
    expect(hasActiveHandle()).toBe(true);
  });

  it('returns usedHandle:false when the save picker is aborted', async () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' });
    // @ts-ignore
    globalThis.showOpenFilePicker = () => {};
    // @ts-ignore
    globalThis.showSaveFilePicker = vi.fn(() => Promise.reject(abort));

    const result = await saveWiremarkFile({ source: 'hi', name: 'foo.wiremark' });
    expect(result).toEqual({ name: 'foo.wiremark', usedHandle: false });
    expect(hasActiveHandle()).toBe(false);
  });

  it('degrades to a download when the File System Access API is unsupported', async () => {
    delete (/** @type {*} */ (globalThis).showOpenFilePicker);
    delete (/** @type {*} */ (globalThis).showSaveFilePicker);

    const click = vi.fn();
    const anchor = /** @type {*} */ ({ click });
    const createElement = vi.fn(() => anchor);
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:dl');
    const revokeObjectURL = vi.fn();
    // @ts-ignore
    globalThis.document = { createElement, body: { appendChild, removeChild } };
    // @ts-ignore
    globalThis.URL = { createObjectURL, revokeObjectURL };

    const result = await saveWiremarkFile({ source: 'data', name: 'thing.wiremark' });

    expect(createElement).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('thing.wiremark');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:dl');
    expect(result).toEqual({ name: 'thing.wiremark', usedHandle: false });
  });

  it('defaults the download name to untitled.wiremark when none is given', async () => {
    delete (/** @type {*} */ (globalThis).showOpenFilePicker);
    delete (/** @type {*} */ (globalThis).showSaveFilePicker);

    const anchor = /** @type {*} */ ({ click: vi.fn() });
    // @ts-ignore
    globalThis.document = { createElement: () => anchor, body: { appendChild: vi.fn(), removeChild: vi.fn() } };
    // @ts-ignore
    globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() };

    const result = await saveWiremarkFile({ source: 'data', name: null });
    expect(anchor.download).toBe('untitled.wiremark');
    expect(result.name).toBe('untitled.wiremark');
  });
});

describe('saveWiremarkFileAs', () => {
  it('always prompts (replacing any existing handle) instead of writing in place', async () => {
    // Establish an initial in-place handle by opening a file first.
    const oldHandle = {
      name: 'old.wiremark',
      getFile: () => Promise.resolve({ name: 'old.wiremark', text: () => Promise.resolve('old') }),
      createWritable: vi.fn(() => Promise.resolve({ write: vi.fn(), close: vi.fn() })),
    };
    // The fresh handle the Save As picker hands back.
    const write = vi.fn(() => Promise.resolve());
    const close = vi.fn(() => Promise.resolve());
    const newHandle = {
      name: 'copy.wiremark',
      createWritable: vi.fn(() => Promise.resolve({ write, close })),
    };
    // @ts-ignore
    globalThis.showOpenFilePicker = vi.fn(() => Promise.resolve([oldHandle]));
    // @ts-ignore
    globalThis.showSaveFilePicker = vi.fn(() => Promise.resolve(newHandle));

    await openWiremarkFile();
    expect(hasActiveHandle()).toBe(true);

    const result = await saveWiremarkFileAs({ source: 'fresh', name: 'old.wiremark' });

    // Prompted for a new location rather than writing through the old handle...
    expect(globalThis.showSaveFilePicker).toHaveBeenCalledOnce();
    expect(oldHandle.createWritable).not.toHaveBeenCalled();
    // ...and wrote to (and now retains) the newly chosen handle.
    expect(write).toHaveBeenCalledWith('fresh');
    expect(result).toEqual({ name: 'copy.wiremark', usedHandle: true });
    expect(hasActiveHandle()).toBe(true);
  });

  it('returns usedHandle:false when the save picker is aborted', async () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' });
    // @ts-ignore
    globalThis.showOpenFilePicker = () => {};
    // @ts-ignore
    globalThis.showSaveFilePicker = vi.fn(() => Promise.reject(abort));

    const result = await saveWiremarkFileAs({ source: 'hi', name: 'foo.wiremark' });
    expect(result).toEqual({ name: 'foo.wiremark', usedHandle: false });
    expect(hasActiveHandle()).toBe(false);
  });

  it('degrades to a download when the File System Access API is unsupported', async () => {
    delete (/** @type {*} */ (globalThis).showOpenFilePicker);
    delete (/** @type {*} */ (globalThis).showSaveFilePicker);

    const anchor = /** @type {*} */ ({ click: vi.fn() });
    // @ts-ignore
    globalThis.document = { createElement: () => anchor, body: { appendChild: vi.fn(), removeChild: vi.fn() } };
    // @ts-ignore
    globalThis.URL = { createObjectURL: () => 'blob:as', revokeObjectURL: vi.fn() };

    const result = await saveWiremarkFileAs({ source: 'data', name: 'thing.wiremark' });
    expect(anchor.download).toBe('thing.wiremark');
    expect(result).toEqual({ name: 'thing.wiremark', usedHandle: false });
  });
});
