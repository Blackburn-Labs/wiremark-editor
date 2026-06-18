# Store layer (Redux)

State management uses [Redux Toolkit](https://redux-toolkit.js.org/). Slices are
co-located here; each slice owns one area of state and exports its actions,
reducer (default export), and selectors.

## Domain objects in the store

Per the project's domain strategy, non-trivial values in the store are
[`BasicDomain`](../domain/README.md) instances, not bare plain objects. These
are class instances, so RTK's default `serializableCheck`/`immutableCheck` dev
middleware would flag them. We therefore disable those two checks in
[`index.js`](./index.js) and instead rely on the domain layer's discipline:

- **Never mutate** a domain value held in state. In a reducer, replace it with a
  fresh instance produced by `.clone()` / `.with(patch)` (return the new value
  rather than mutating the Immer draft in place).
- Selectors return the stored instances directly; components read them but do
  not mutate them.

```js
reducers: {
  renameElement(state, action) {
    const { id, name } = action.payload;
    // produce a new document instance; do not mutate state.document
    state.document = state.document.withElementRenamed(id, name);
  },
}
```

## Slice catalog

| Slice | Responsibility |
| --- | --- |
| `documentSlice` | The wiremark source/document being edited; open/save bookkeeping (file name, dirty tracking); undo/redo history. |
| `uiSlice` | View-only state: theme mode (light/dark/system), editor view mode (text/split/render), selected element id. |

## Selectors

Co-locate selectors with their slice and prefer them over reaching into
`state.x.y` from components, so state shape stays an implementation detail.
Derived/expensive selectors should be memoized (`reselect`, re-exported by RTK
as `createSelector`).

## Undo / redo

History is part of the document area. The editor exposes Undo/Redo on the app
bar; the implementation keeps past/future stacks of document snapshots
(domain `clone()`s) and is careful to coalesce rapid keystroke edits into single
history entries.
