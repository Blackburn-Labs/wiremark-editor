// @ts-check
/**
 * fileIo -- open/save `.wiremark` files in the browser and as a PWA.
 *
 * The live `FileSystemFileHandle` (when the File System Access API is available)
 * lives in a MODULE-LEVEL variable here -- never in Redux, never serialized,
 * since handles are not JSON-safe. When the API is unavailable, Open uses a
 * hidden `<input type=file>` and Save degrades to downloading a copy.
 *
 * All `window`/DOM access is guarded so unit tests can stub `globalThis`.
 */

/**
 * @typedef {{ name: string, source: string }} OpenedFile
 * @typedef {{ name: string, usedHandle: boolean }} SaveResult
 */

const DEFAULT_NAME = 'untitled.wiremark';

/**
 * The active file handle, when the File System Access API granted one. Module
 * scope by design (see file header). `null` means "no handle -> degrade".
 * @type {FileSystemFileHandle|null}
 */
let activeHandle = null;

/** @returns {(Window & typeof globalThis) | undefined} */
function getWindow() {
  return /** @type {*} */ (globalThis);
}

/**
 * Is the File System Access API (`showOpenFilePicker`) available?
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
  const w = getWindow();
  return !!(w && typeof w.showOpenFilePicker === 'function' && typeof w.showSaveFilePicker === 'function');
}

/**
 * Is there a stored handle we can write through (so "Save" overwrites in place)?
 * @returns {boolean}
 */
export function hasActiveHandle() {
  return activeHandle !== null;
}

/**
 * Forget any stored handle (called on "New").
 * @returns {void}
 */
export function clearHandle() {
  activeHandle = null;
}

/** Standard `.wiremark` picker option set. */
function pickerTypes() {
  return [
    {
      description: 'Wiremark wireframe',
      accept: { 'text/plain': ['.wiremark'] },
    },
  ];
}

/**
 * Open a `.wiremark` file. Uses `showOpenFilePicker` when supported (storing the
 * handle for later in-place saves); otherwise falls back to a hidden file input.
 * @returns {Promise<OpenedFile|null>} the opened file, or `null` if cancelled
 */
export async function openWiremarkFile() {
  const w = getWindow();
  if (isFileSystemAccessSupported() && w) {
    let handles;
    try {
      handles = await w.showOpenFilePicker({
        types: pickerTypes(),
        multiple: false,
      });
    } catch (err) {
      // AbortError => user cancelled the picker.
      if (isAbortError(err)) return null;
      throw err;
    }
    const handle = handles && handles[0];
    if (!handle) return null;
    const file = await handle.getFile();
    const source = await file.text();
    activeHandle = handle;
    return { name: file.name, source };
  }
  return openViaInput();
}

/**
 * Fallback open path: a hidden `<input type=file>` triggered programmatically.
 * Does NOT set a handle (none is available), so subsequent saves download.
 * @returns {Promise<OpenedFile|null>}
 */
function openViaInput() {
  const doc = /** @type {{ document?: Document }} */ (globalThis).document;
  if (!doc || typeof doc.createElement !== 'function') {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = '.wiremark';
    input.style.display = 'none';

    let settled = false;
    const cleanup = () => {
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) {
        if (!settled) { settled = true; cleanup(); resolve(null); }
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (settled) return;
        settled = true;
        cleanup();
        activeHandle = null;
        resolve({ name: file.name, source: String(reader.result ?? '') });
      };
      reader.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(reader.error || new Error('fileIo: failed to read file'));
      };
      reader.readAsText(file);
    });

    if (doc.body) doc.body.appendChild(input);
    input.click();
  });
}

/**
 * Save the given source. Behavior, in order:
 *  1. write through the stored handle when present (in-place save),
 *  2. else `showSaveFilePicker` when supported (and store the new handle),
 *  3. else trigger a download of `name || 'untitled.wiremark'`.
 *
 * @param {{ source: string, name?: string|null }} args
 * @returns {Promise<SaveResult>} `usedHandle` is true only for cases 1 and 2
 */
export async function saveWiremarkFile({ source, name }) {
  const text = String(source ?? '');
  const fileName = (name && String(name).trim()) || DEFAULT_NAME;
  const w = getWindow();

  if (activeHandle) {
    await writeThroughHandle(activeHandle, text);
    return { name: activeHandle.name || fileName, usedHandle: true };
  }

  if (isFileSystemAccessSupported() && w) {
    let handle;
    try {
      handle = await w.showSaveFilePicker({
        suggestedName: fileName,
        types: pickerTypes(),
      });
    } catch (err) {
      if (isAbortError(err)) return { name: fileName, usedHandle: false };
      throw err;
    }
    activeHandle = handle;
    await writeThroughHandle(handle, text);
    return { name: handle.name || fileName, usedHandle: true };
  }

  // Degrade: download a copy.
  downloadText(text, fileName);
  return { name: fileName, usedHandle: false };
}

/**
 * Write text through a `FileSystemFileHandle` writable stream.
 * @param {FileSystemFileHandle} handle
 * @param {string} text
 * @returns {Promise<void>}
 */
async function writeThroughHandle(handle, text) {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

/**
 * Trigger a browser download of `text` as a `.wiremark` file.
 * @param {string} text
 * @param {string} fileName
 * @returns {void}
 */
function downloadText(text, fileName) {
  const doc = /** @type {{ document?: Document }} */ (globalThis).document;
  if (!doc || typeof doc.createElement !== 'function') {
    throw new Error('fileIo: cannot download (no document available)');
  }
  const urlApi = globalThis.URL || /** @type {*} */ (globalThis).webkitURL;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = urlApi.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = fileName;
  if (doc.body) doc.body.appendChild(a);
  a.click();
  if (doc.body && a.parentNode === doc.body) doc.body.removeChild(a);
  urlApi.revokeObjectURL(url);
}

/**
 * Is `err` a user-cancellation (DOMException 'AbortError')?
 * @param {unknown} err
 * @returns {boolean}
 */
function isAbortError(err) {
  return !!err && /** @type {{ name?: string }} */ (err).name === 'AbortError';
}
