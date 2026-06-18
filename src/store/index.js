// @ts-check
/**
 * Redux store configuration.
 *
 * Per the project's domain strategy (see /src/domain/README.md and
 * /src/store/README.md), values held in the store may be BasicDomain instances
 * rather than plain objects. Those are class instances, so RTK's default
 * serializable/immutable dev checks would flag them; we relax those checks and
 * instead rely on BasicDomain's `clone()`/`with()` discipline (reducers replace
 * state with fresh instances rather than mutating drafts in place).
 */
import { configureStore } from '@reduxjs/toolkit';
import documentReducer from './documentSlice.js';
import uiReducer from './uiSlice.js';

export const store = configureStore({
  reducer: {
    document: documentReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Domain objects (class instances) intentionally live in the store.
      serializableCheck: false,
      immutableCheck: false,
    }),
});

export default store;
