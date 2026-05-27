# Pattern: `replaceReducer` / `injectReducer` in a Multi-Route SPA

## 1. One sentence

Use `replaceReducer` / `injectReducer` to load Redux reducers only when a route or feature is loaded, instead of putting every rarely used route reducer into the initial store bundle.

```txt
Initial app load
  store has only core reducers

Visit /trades
  load trade-search route bundle
  inject tradeSearch reducer

Visit /reports
  load reports route bundle
  inject reports reducer
```

This pattern is mostly about **route-level code splitting** and **state ownership**, not about automatically clearing all previous route state.

---

## 2. Problem

In a large CSR SPA, the app may have many major routes:

```txt
/trades
/orders
/portfolios
/reports
/clients
/admin
/settings
/audit
```

A simple Redux setup often imports every slice at startup:

```ts
// app/store.ts
import { tradeSearchReducer } from '@/features/trade-search/tradeSearchSlice';
import { orderBlotterReducer } from '@/features/order-blotter/orderBlotterSlice';
import { reportBuilderReducer } from '@/features/report-builder/reportBuilderSlice';
import { adminReducer } from '@/features/admin/adminSlice';

export const store = configureStore({
  reducer: {
    tradeSearch: tradeSearchReducer,
    orderBlotter: orderBlotterReducer,
    reportBuilder: reportBuilderReducer,
    admin: adminReducer,
  },
});
```

This means the initial app bundle may include code for routes the user never opens.

It also creates a psychological problem: the store starts looking like the whole application at once.

```txt
store
  tradeSearch
  orderBlotter
  reportBuilder
  admin
  audit
  settings
  many more...
```

But in a multi-route SPA, one route often does not need most of the state used by another route.

---

## 3. Use case / avoid when

### Use it when

Use reducer injection when:

```txt
The SPA has many large routes.
Some routes are rarely visited.
Route bundles are lazy-loaded.
Feature slices are route-specific.
Initial JS size matters.
You want each route module to own its slice.
```

Good candidates:

```txt
report builder
large search screens
admin tools
analytics dashboards
audit screens
complex order/trade workflows
rarely used configuration screens
```

### Avoid when

Avoid this pattern when:

```txt
The app is small.
Reducers are tiny.
All routes are used immediately.
The team does not need route-level code splitting yet.
The complexity is higher than the startup cost you save.
```

Also avoid using Redux slices for everything. Server data should often live in a server-state/cache tool such as RTK Query, SWR, or React Query. Reducer injection is mostly useful for **client/workflow/UI state owned by route features**.

---

## 4. Mental model

```txt
Router
  ↓ lazy route import
Route module
  ↓ inject route reducer
Redux store
  ↓ route state becomes available
Route component renders
```

Practical difference:

```txt
replaceReducer
  Low-level Redux API.
  Replaces the store's current root reducer function.

injectReducer
  App-level helper built on top of replaceReducer.
  Keeps track of already injected reducers and rebuilds the root reducer.
```

Modern Redux Toolkit also has another option:

```txt
combineSlices().inject(...)
  RTK 2.x reducer injection helper.
  Does not call store.replaceReducer.
  The root reducer instance stays the same.
```

---

## 5. File structure

```txt
src/
  app/
    store.ts
    routes.tsx
    hooks.ts

  features/
    trade-search/
      route.tsx
      TradeSearchPage.tsx
      tradeSearchSlice.ts

    report-builder/
      route.tsx
      ReportBuilderPage.tsx
      reportBuilderSlice.ts
```

Each route feature owns its route module and its slice.

---

## 6. Code example A: classic `replaceReducer` / `injectReducer`

This is the traditional handwritten approach.

### 6.1 Static app slice

```ts
// app/appSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    theme: 'light' as 'light' | 'dark',
  },
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
  },
});

export const appReducer = appSlice.reducer;
export const { toggleTheme } = appSlice.actions;
```

This reducer is always present.

---

### 6.2 Store with `injectReducer`

```ts
// app/store.ts
import {
  combineReducers,
  configureStore,
  type Reducer,
  type ReducersMapObject,
} from '@reduxjs/toolkit';

import { appReducer } from './appSlice';

const staticReducers = {
  app: appReducer,
};

const asyncReducers: ReducersMapObject = {};

function createRootReducer() {
  return combineReducers({
    ...staticReducers,
    ...asyncReducers,
  });
}

export const store = configureStore({
  reducer: createRootReducer(),
});

export function injectReducer(key: string, reducer: Reducer) {
  if (asyncReducers[key]) {
    return;
  }

  asyncReducers[key] = reducer;

  store.replaceReducer(createRootReducer());
}

export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
```

What happens here:

```txt
1. App starts with only static reducers.
2. Route is lazy-loaded.
3. Route calls injectReducer('tradeSearch', reducer).
4. injectReducer rebuilds the root reducer.
5. store.replaceReducer(newRootReducer) swaps it in.
```

---

### 6.3 Trade Search slice

```ts
// features/trade-search/tradeSearchSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TradeSearchState = {
  filters: {
    counterparty: string;
    minAmount?: number;
  };
  selectedTradeId?: string;
};

export const initialTradeSearchState: TradeSearchState = {
  filters: {
    counterparty: '',
  },
};

const tradeSearchSlice = createSlice({
  name: 'tradeSearch',
  initialState: initialTradeSearchState,
  reducers: {
    setCounterpartyFilter(state, action: PayloadAction<string>) {
      state.filters.counterparty = action.payload;
    },

    selectTrade(state, action: PayloadAction<string>) {
      state.selectedTradeId = action.payload;
    },

    resetTradeSearch() {
      return initialTradeSearchState;
    },
  },
});

export const tradeSearchReducer = tradeSearchSlice.reducer;

export const {
  setCounterpartyFilter,
  selectTrade,
  resetTradeSearch,
} = tradeSearchSlice.actions;
```

---

### 6.4 Route module owns reducer injection metadata

```tsx
// features/trade-search/route.tsx
import { TradeSearchPage } from './TradeSearchPage';
import { tradeSearchReducer } from './tradeSearchSlice';

export const reducerKey = 'tradeSearch';
export const reducer = tradeSearchReducer;

export function Component() {
  return <TradeSearchPage />;
}
```

This route module says:

```txt
When this route is loaded, it needs the tradeSearch reducer.
```

---

### 6.5 Router lazy-loads route and injects reducer

```tsx
// app/routes.tsx
import { createBrowserRouter } from 'react-router';

import { injectReducer } from './store';

export const router = createBrowserRouter([
  {
    path: '/trades',
    lazy: async () => {
      const route = await import('../features/trade-search/route');

      injectReducer(route.reducerKey, route.reducer);

      return {
        Component: route.Component,
      };
    },
  },
  {
    path: '/reports',
    lazy: async () => {
      const route = await import('../features/report-builder/route');

      injectReducer(route.reducerKey, route.reducer);

      return {
        Component: route.Component,
      };
    },
  },
]);
```

Now `/trades` loads only when the user opens it.

The reducer is injected before the route component renders.

---

### 6.6 Route component uses route state

```tsx
// features/trade-search/TradeSearchPage.tsx
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/app/store';

import {
  initialTradeSearchState,
  setCounterpartyFilter,
} from './tradeSearchSlice';

export function TradeSearchPage() {
  const dispatch = useDispatch();

  const filters = useSelector((state: RootState) => {
    return state.tradeSearch?.filters ?? initialTradeSearchState.filters;
  });

  return (
    <section>
      <h1>Trade Search</h1>

      <label>
        Counterparty
        <input
          value={filters.counterparty}
          onChange={event =>
            dispatch(setCounterpartyFilter(event.target.value))
          }
        />
      </label>
    </section>
  );
}
```

In a fully typed production setup, you would usually extend your `RootState` type to include known lazy slices. The example keeps the type simple to show the mechanics.

---

## 7. Code example B: modern Redux Toolkit `combineSlices().inject(...)`

Redux Toolkit 2.x includes `combineSlices`, which is designed to simplify reducer injection and improve TypeScript support.

Important difference:

```txt
Classic injectReducer
  Calls store.replaceReducer(newRootReducer).

RTK combineSlices inject
  Does not call store.replaceReducer.
  The reducer instance passed to the store stays the same.
```

This is the more modern RTK-style approach.

---

### 7.1 Root reducer with lazy slices support

```ts
// app/rootReducer.ts
import { combineSlices } from '@reduxjs/toolkit';

import { appSlice } from './appSlice';

export interface LazyLoadedSlices {}

export const rootReducer = combineSlices(appSlice)
  .withLazyLoadedSlices<LazyLoadedSlices>();

export type RootState = ReturnType<typeof rootReducer>;
```

---

### 7.2 Store

```ts
// app/store.ts
import { configureStore } from '@reduxjs/toolkit';

import { rootReducer } from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
});

export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
```

The store receives the root reducer once.

There is no manual `replaceReducer` call.

---

### 7.3 Lazy feature slice

```ts
// features/trade-search/tradeSearchSlice.ts
import {
  createSlice,
  type PayloadAction,
  type WithSlice,
} from '@reduxjs/toolkit';

import { rootReducer } from '@/app/rootReducer';

export type TradeSearchState = {
  filters: {
    counterparty: string;
  };
};

const tradeSearchSlice = createSlice({
  name: 'tradeSearch',
  reducerPath: 'tradeSearch',
  initialState: {
    filters: {
      counterparty: '',
    },
  } satisfies TradeSearchState,
  reducers: {
    setCounterpartyFilter(state, action: PayloadAction<string>) {
      state.filters.counterparty = action.payload;
    },
  },
  selectors: {
    selectFilters: state => state.filters,
  },
});

declare module '@/app/rootReducer' {
  export interface LazyLoadedSlices
    extends WithSlice<typeof tradeSearchSlice> {}
}

const injectedTradeSearchSlice = tradeSearchSlice.injectInto(rootReducer);

export const {
  setCounterpartyFilter,
} = tradeSearchSlice.actions;

export const {
  selectFilters,
} = injectedTradeSearchSlice.selectors;
```

The injection happens when this module is imported.

The selectors from `injectedTradeSearchSlice` can safely use the slice initial state even before the slice state physically appears in the store.

---

### 7.4 Route module

```tsx
// features/trade-search/route.tsx
import { TradeSearchPage } from './TradeSearchPage';

// Important: importing from tradeSearchSlice triggers injectInto(rootReducer)
import './tradeSearchSlice';

export function Component() {
  return <TradeSearchPage />;
}
```

---

### 7.5 Route config

```tsx
// app/routes.tsx
import { createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([
  {
    path: '/trades',
    lazy: () => import('../features/trade-search/route'),
  },
]);
```

The router lazy-loads the route module.

The route module imports the slice.

The slice injects itself into the root reducer.

---

### 7.6 Component using injected selectors

```tsx
// features/trade-search/TradeSearchPage.tsx
import { useDispatch, useSelector } from 'react-redux';

import {
  selectFilters,
  setCounterpartyFilter,
} from './tradeSearchSlice';

export function TradeSearchPage() {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);

  return (
    <section>
      <h1>Trade Search</h1>

      <label>
        Counterparty
        <input
          value={filters.counterparty}
          onChange={event =>
            dispatch(setCounterpartyFilter(event.target.value))
          }
        />
      </label>
    </section>
  );
}
```

This is cleaner than the classic approach because selectors can be typed around the injected slice.

---

## 8. Scaling version

For a real large multi-route SPA, use this structure:

```txt
src/
  app/
    rootReducer.ts
    store.ts
    routes.tsx
    hooks.ts

  features/
    trade-search/
      index.ts
      route.tsx
      tradeSearchSlice.ts
      TradeSearchPage.tsx

    report-builder/
      index.ts
      route.tsx
      reportBuilderSlice.ts
      ReportBuilderPage.tsx

    audit-log/
      index.ts
      route.tsx
      auditLogSlice.ts
      AuditLogPage.tsx
```

Each feature route can own:

```txt
route component
route-specific reducer
route-specific selectors
route-specific actions
route-specific reset action
```

A large route bundle then loads as one unit:

```txt
route.tsx
  imports page
  imports slice
  imports route-level setup
```

---

## 9. Platform relevance

For a financial applications platform, this pattern is useful when a single SPA contains several large workflows:

```txt
large search screens
portfolio views
order/trade workflows
report builders
admin/configuration tools
audit/history screens
```

Many users may only open a subset of those routes in one session.

Reducer injection lets you avoid paying the initial startup cost for route-specific Redux code that is not needed immediately.

It also aligns well with lazy route loading and feature module boundaries.

---

## 10. Benefits

### 1. Smaller initial bundle

Reducers, actions, selectors, and route-specific logic can live in a lazy route bundle.

The app starts with only core state:

```txt
app
session
permissions
runtime config
```

Route-specific state appears when the route is loaded.

---

### 2. Better route ownership

The route owns its state module:

```txt
features/trade-search/route.tsx
features/trade-search/tradeSearchSlice.ts
```

This is better than one central store file importing every feature.

---

### 3. Cleaner mental model for huge SPAs

Instead of:

```txt
The store knows every route from startup.
```

You get:

```txt
The route brings its own state when loaded.
```

---

### 4. Works with lazy routes

This pattern fits naturally with React Router lazy route objects.

```txt
Route bundle loads
  → slice module loads
  → reducer is injected
  → route renders
```

---

### 5. Good bridge to package-based architecture

If a feature later becomes an internal package, it can still expose:

```txt
route module
slice
selectors
actions
```

The root app does not need to know internal files.

---

## 11. Drawbacks / risks

### 1. More infrastructure code

Classic `injectReducer` requires custom store setup.

Modern RTK `combineSlices` reduces this, but still requires team understanding.

---

### 2. More TypeScript complexity

Lazy-loaded state is harder to type than static reducers.

You need conventions for:

```txt
RootState
lazy slice declarations
optional state
injected selectors
```

---

### 3. Reducer injection does not automatically clear previous route state

This is important.

If the user visits `/trades`, then `/reports`, the store may contain both:

```txt
store
  app
  tradeSearch
  reportBuilder
```

That is normal.

Reducer injection is primarily about **lazy loading reducer code**, not automatically removing state on route change.

If route state should reset, do it explicitly:

```ts
dispatch(resetTradeSearch());
```

Do not assume navigation will remove it.

---

### 4. Removing reducers is more complicated

Classic reducer managers can support removal, but it adds edge cases:

```txt
components may still read removed state
selectors need defaults
navigation transitions may still render old route briefly
DevTools history can become confusing
```

For most applications, prefer:

```txt
inject lazily
reset state explicitly when needed
avoid aggressive reducer removal
```

---

### 5. Not a replacement for server-state caching

Do not put all server data into route slices just because reducers can be injected.

For fetched/cached data, consider a dedicated server-state layer.

Reducer injection is most useful for:

```txt
route workflow state
filters
selected rows
draft UI state
wizard state
complex local decisions
```

---

## 12. Related patterns

### Route Modules

Route modules are a natural place to trigger reducer injection.

```txt
route.tsx
  owns Component
  owns loader/action if used
  owns reducer injection
```

---

### Feature Modules with Public API

A feature can expose its route as a public API:

```ts
export { tradeSearchRoute } from './route';
```

The app should not deep-import feature internals.

---

### Feature-Owned State

This pattern works best when state is owned by the route/feature, not by one giant global state shape.

---

### redux-observable dependencies

Reducer injection only handles reducers.

If a route also has epics, you need a separate strategy for epic injection or a root epic that already knows about the relevant actions.

---

## 13. Key takeaway

```txt
Use reducer injection when routes are large enough that their Redux code should load with the route, not with the initial app.
```

And remember:

```txt
replaceReducer is the low-level Redux mechanism.
injectReducer is a helper you build on top of it.
RTK combineSlices.inject is the modern Redux Toolkit option.
```

---

## 14. Source notes

This overview is aligned with current official Redux / Redux Toolkit and React Router documentation:

```txt
Redux code splitting:
  replaceReducer, injectReducer recipes, reducer manager, RTK combineSlices.

Redux Toolkit combineSlices:
  reducer injection, injectInto, withLazyLoadedSlices, selector helpers.

React Router route objects:
  lazy route imports and route modules.
```
