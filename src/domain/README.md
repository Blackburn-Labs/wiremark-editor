# Domain layer

Plain domain objects (Java would call them POJOs) live here. Every value that
the app holds in the Redux store, passes between business-logic functions, or
serializes to/from a `.wiremark` file is modeled as a domain object so we get
**one consistent, enforceable way** to construct, copy, compare, and serialize
data.

## The contract: `BasicDomain`

All domain objects extend [`BasicDomain`](./BasicDomain.js). It is abstract
(instantiating it directly throws) and provides:

| Method | Purpose |
| --- | --- |
| `constructor(data)` | Hydrate from a plain-object payload (typically another instance's `toJSON()`). |
| `toJSON()` | Serialize to a JSON-safe plain object. Recurses into nested domain objects/arrays. Override when a subclass holds nested domain values or needs custom (de)serialization. |
| `clone()` | Deep, **type-preserving** copy: `new this.constructor(this.toJSON())`. |
| `with(patch)` | Immutable update: returns a new instance with `patch` shallow-merged over the payload. `this` is never mutated. |
| `equals(other)` | Structural equality by serialized form (order-independent). |

### Why `clone()` matters

In React + Redux you must **never mutate** an object that lives in the store --
React relies on reference identity to decide what re-renders, and a mutated
store value breaks that. The pattern is always: take the value out, **clone it**,
mutate the clone, put the clone back.

```js
clone() {
  const Cls = this.constructor;
  return new Cls(this.toJSON());
}
```

Routing every store value through `BasicDomain` means this is uniform and
customizable: a subclass that holds nested domain objects overrides `toJSON()`,
and `clone()` automatically does the right deep copy. Prefer `with(patch)` for
the common "copy then change a few fields" case.

## Collections: `BasicArray`

[`BasicArray`](./BasicArray.js) extends the native `Array` (so `map`/`filter`/
indexing/`length` all work) but every "mutating" operation
(`add`/`insertAt`/`removeAt`/`replaceAt`/`move`) returns a **new** instance.
Subclass it and set `static itemType = SomeDomainClass` to get automatic
hydration of items from plain payloads.

## Conventions

- One class per file, named after the class.
- A subclass declares its fields in the constructor from the `data` payload and
  provides sensible defaults.
- Override `toJSON()` whenever fields are themselves domain objects/arrays or
  need transformation, and make sure `new Cls(instance.toJSON())` round-trips.
- Keep domain objects free of React/Redux/MUI imports -- they are pure data +
  behavior and are the primary target of unit tests (`*.test.js`).
