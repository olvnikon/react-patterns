# Pattern: Feature Facade + React Adapter

Context: large client-side React applications, including financial applications with many routes, complex workflows, platform integration, and long-lived codebases.

This version explains the pattern and shows how it can work with:

```txt
plain TypeScript
Redux Toolkit
redux-observable dependencies
SWR
```

The key message:

```txt
The facade pattern does not replace existing state/server-state tools.
It gives React components a stable feature-level API.
The implementation behind that API can use Redux Toolkit, SWR, redux-observable, Zustand, React Query, or plain TypeScript.
```

---

## 1. One sentence

**Feature Facade + React Adapter** means: expose a small feature-level API to React components, while hiding feature behavior, state orchestration, and implementation details behind a boundary.

```txt
React component
  ↓
React adapter / hook
  ↓
Feature facade or feature adapter
  ↓
Internal implementation: Redux Toolkit, SWR, plain TS, epics, APIs, etc.
```

The component should mostly see this:

```ts
const { state, api } = useTradeApproval(tradeId);

api.approve();
api.reject(reason);
api.reload();
```

Not this:

```ts
const dispatch = useAppDispatch();
const trade = useAppSelector(selectTrade);
const isSaving = useAppSelector(selectIsSaving);

await dispatch(approveTradeThunk({ tradeId }));
```

---

## 2. Problem it solves

In large React applications, feature implementation details often leak into components.

```tsx
function TradeApprovalPage({ tradeId }: { tradeId: string }) {
  const dispatch = useAppDispatch();

  const trade = useAppSelector(selectTradeForApproval);
  const isSaving = useAppSelector(selectIsSaving);
  const error = useAppSelector(selectApprovalError);
  const permissions = useAppSelector(selectUserPermissions);

  return (
    <section>
      <h1>Trade Approval</h1>

      <button
        disabled={isSaving || !permissions.canApproveTrades}
        onClick={() => dispatch(approveTrade({ tradeId }))}
      >
        Approve
      </button>

      <button
        disabled={isSaving || !permissions.canRejectTrades}
        onClick={() =>
          dispatch(rejectTrade({
            tradeId,
            reason: 'Incorrect details',
          }))
        }
      >
        Reject
      </button>

      {error && <p>{error}</p>}
    </section>
  );
}
```

This is not always wrong. For simple screens, direct Redux/SWR usage can be fine.

The problem appears when many components start knowing too much:

```txt
Redux action names
selector names
store shape
thunk names
SWR cache keys
mutation implementation
permission checks
API orchestration
workflow details
```

The pattern gives the UI a feature-level API:

```ts
api.approve();
api.reject(reason);
api.reload();
```

---

## 3. Use case / avoid when

### Use it when

```txt
feature workflow is complex
feature has multiple subcomponents
same feature is reused in multiple routes/widgets
UI should not know Redux/SWR/cache/action details
feature has permissions, validation, side effects, or audit/logging needs
feature behavior should be testable separately from rendering
```

Good examples:

```txt
approval flow
order creation
multi-step form
report builder
large search/filter screen
client or account onboarding
stateful dashboard widget
```

### Avoid when

```txt
simple button
basic modal
static page
tiny form
pure presentational component
simple data display with one useSWR/useQuery call
```

Do not add a facade only because it sounds architectural. Add it when it reduces real coupling.

---

## 4. Mental model

There are two versions of the pattern.

### A. Pure facade

The facade is plain TypeScript and has no React hooks.

```txt
React component
  ↓
React adapter hook
  ↓
Plain TypeScript facade
  ↓
Store/repository/workflow logic
```

Good for workflow-heavy client state.

### B. React adapter facade

The hook itself hides Redux/SWR and exposes a feature-level API.

```txt
React component
  ↓
useTradeApproval()
  ↓
Redux Toolkit / SWR / RTK Query / local state
```

This is often the most pragmatic version with hook-based tools like SWR.

The important rule:

```txt
Do not put React hooks inside a plain TypeScript facade.
If the implementation uses hooks, the facade is really a React adapter.
That is fine, but name and explain it honestly.
```

---

## 5. File structure

### Pure facade version

```txt
src/
  features/
    trade-approval/
      index.ts
      domain/
        tradeApproval.types.ts
      core/
        createTradeApprovalFacade.ts
      react/
        TradeApprovalProvider.tsx
        useTradeApproval.ts
      ui/
        TradeApprovalPage.tsx
```

### Redux Toolkit version

```txt
src/
  features/
    trade-approval/
      index.ts
      model/
        tradeApprovalSlice.ts
        tradeApprovalSelectors.ts
        tradeApprovalThunks.ts
      react/
        useTradeApproval.ts
      ui/
        TradeApprovalPage.tsx
```

### SWR version

```txt
src/
  features/
    trade-details/
      index.ts
      api/
        tradeDetailsRepository.ts
      react/
        useTradeDetails.ts
      ui/
        TradeDetailsPage.tsx
```

### Package / monorepo version

```txt
repo/
  apps/
    main-spa/
      src/
        app/
          routes.tsx

  packages/
    trade-approval/
      src/
        index.ts
        model/
        react/
        ui/
```

---

## 6. Code example: pure TypeScript facade

This is the cleanest form of the pattern.

### 6.1 State type

```ts
// features/trade-approval/domain/tradeApproval.types.ts

export type TradeApprovalState = {
  tradeId: string;
  status:
    | 'ready'
    | 'saving'
    | 'approved'
    | 'rejected'
    | 'failed';
  error?: string;
};
```

### 6.2 Plain facade

```ts
// features/trade-approval/core/createTradeApprovalFacade.ts

import type { TradeApprovalState } from '../domain/tradeApproval.types';

type Listener = () => void;

type TradeApprovalRepository = {
  approve: (tradeId: string) => Promise<void>;
  reject: (tradeId: string, reason: string) => Promise<void>;
};

export function createTradeApprovalFacade({
  tradeId,
  repository,
}: {
  tradeId: string;
  repository: TradeApprovalRepository;
}) {
  let state: TradeApprovalState = {
    tradeId,
    status: 'ready',
  };

  const listeners = new Set<Listener>();

  function notify() {
    listeners.forEach(listener => listener());
  }

  function setState(nextState: TradeApprovalState) {
    state = nextState;
    notify();
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot() {
      return state;
    },

    async approve() {
      setState({ ...state, status: 'saving', error: undefined });

      try {
        await repository.approve(tradeId);
        setState({ ...state, status: 'approved' });
      } catch {
        setState({ ...state, status: 'failed', error: 'Approval failed' });
      }
    },

    async reject(reason: string) {
      if (!reason.trim()) {
        setState({ ...state, error: 'Reject reason is required' });
        return;
      }

      setState({ ...state, status: 'saving', error: undefined });

      try {
        await repository.reject(tradeId, reason);
        setState({ ...state, status: 'rejected' });
      } catch {
        setState({ ...state, status: 'failed', error: 'Rejection failed' });
      }
    },
  };
}

export type TradeApprovalFacade = ReturnType<typeof createTradeApprovalFacade>;
```

### 6.3 React adapter

```tsx
// features/trade-approval/react/useTradeApproval.ts

import React from 'react';
import type { TradeApprovalFacade } from '../core/createTradeApprovalFacade';

export function useTradeApproval(facade: TradeApprovalFacade) {
  const state = React.useSyncExternalStore(
    facade.subscribe,
    facade.getSnapshot,
    facade.getSnapshot,
  );

  return {
    state,
    api: {
      approve: facade.approve,
      reject: facade.reject,
    },
  };
}
```

### 6.4 UI component

```tsx
// features/trade-approval/ui/TradeApprovalPage.tsx

import type { TradeApprovalFacade } from '../core/createTradeApprovalFacade';
import { useTradeApproval } from '../react/useTradeApproval';

export function TradeApprovalPage({
  facade,
}: {
  facade: TradeApprovalFacade;
}) {
  const { state, api } = useTradeApproval(facade);

  return (
    <section>
      <h1>Trade Approval</h1>

      <p>Status: {state.status}</p>

      {state.error && <p>{state.error}</p>}

      <button
        disabled={state.status === 'saving'}
        onClick={api.approve}
      >
        Approve
      </button>

      <button
        disabled={state.status === 'saving'}
        onClick={() => api.reject('Incorrect trade details')}
      >
        Reject
      </button>
    </section>
  );
}
```

The component only knows:

```txt
state.status
state.error
api.approve()
api.reject(reason)
```

---

## 7. Code example: Redux Toolkit integration

Redux Toolkit already gives structure through slices, actions, selectors, thunks, and RTK Query.

For many screens, direct `useSelector` / `useDispatch` is enough.

Use a React adapter when you want to hide Redux details from the page/component.

### 7.1 Slice

```ts
// features/trade-approval/model/tradeApprovalSlice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TradeApprovalState = {
  status: 'idle' | 'saving' | 'approved' | 'rejected' | 'failed';
  error?: string;
};

const initialState: TradeApprovalState = {
  status: 'idle',
};

const tradeApprovalSlice = createSlice({
  name: 'tradeApproval',
  initialState,
  reducers: {
    approveRequested(state, _action: PayloadAction<{ tradeId: string }>) {
      state.status = 'saving';
      state.error = undefined;
    },
    approveSucceeded(state) {
      state.status = 'approved';
    },
    approveFailed(state) {
      state.status = 'failed';
      state.error = 'Approval failed';
    },
    rejectRequested(
      state,
      _action: PayloadAction<{ tradeId: string; reason: string }>,
    ) {
      state.status = 'saving';
      state.error = undefined;
    },
    rejectSucceeded(state) {
      state.status = 'rejected';
    },
    rejectFailed(state) {
      state.status = 'failed';
      state.error = 'Rejection failed';
    },
  },
});

export const tradeApprovalReducer = tradeApprovalSlice.reducer;

export const tradeApprovalActions = tradeApprovalSlice.actions;
```

### 7.2 Selector

```ts
// features/trade-approval/model/tradeApprovalSelectors.ts

import type { RootState } from '@/app/store';

export function selectTradeApprovalView(state: RootState) {
  return state.tradeApproval;
}
```

### 7.3 React adapter over Redux Toolkit

This is the pragmatic version.

Redux stays inside the feature hook. The UI does not call `dispatch` or selectors directly.

```tsx
// features/trade-approval/react/useTradeApproval.ts

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/app/storeHooks';
import { tradeApprovalActions } from '../model/tradeApprovalSlice';
import { selectTradeApprovalView } from '../model/tradeApprovalSelectors';

export function useTradeApproval(tradeId: string) {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectTradeApprovalView);

  const approve = React.useCallback(() => {
    dispatch(tradeApprovalActions.approveRequested({ tradeId }));
  }, [dispatch, tradeId]);

  const reject = React.useCallback(
    (reason: string) => {
      dispatch(tradeApprovalActions.rejectRequested({ tradeId, reason }));
    },
    [dispatch, tradeId],
  );

  return {
    state,
    api: {
      approve,
      reject,
    },
  };
}
```

### 7.4 UI component

```tsx
// features/trade-approval/ui/TradeApprovalPage.tsx

import { useTradeApproval } from '../react/useTradeApproval';

export function TradeApprovalPage({ tradeId }: { tradeId: string }) {
  const { state, api } = useTradeApproval(tradeId);

  return (
    <section>
      <h1>Trade Approval</h1>

      <p>Status: {state.status}</p>

      {state.error && <p>{state.error}</p>}

      <button
        disabled={state.status === 'saving'}
        onClick={api.approve}
      >
        Approve
      </button>

      <button
        disabled={state.status === 'saving'}
        onClick={() => api.reject('Incorrect trade details')}
      >
        Reject
      </button>
    </section>
  );
}
```

The page now sees a feature-level API, not Redux details.

---

## 8. Redux Toolkit note: server state

Do not use the facade pattern as an excuse to hand-write your own server cache in Redux.

For Redux-based applications, the modern default for fetching and caching server state is RTK Query.

Recommended split:

```txt
RTK Query:
  server data
  cache
  loading/error state for requests
  refetching
  invalidation

Feature facade / Redux slice:
  workflow state
  selected step
  draft comment
  validation state
  local UI state
  feature-specific actions
```

For example:

```txt
Trade details loaded from server → RTK Query
Approval comment                 → feature slice/local state
Approve/reject workflow           → action/thunk/epic/listener/mutation
```

---

## 9. Integration with redux-observable dependencies

If the application already uses redux-observable, this pattern fits well.

The facade or React adapter dispatches feature-level actions:

```ts
api.approve();
```

Internally:

```ts
dispatch(tradeApprovalActions.approveRequested({ tradeId }));
```

The epic performs the side effect through injected dependencies.

### 9.1 Configure epic middleware with dependencies

```ts
// app/store.ts

import { configureStore } from '@reduxjs/toolkit';
import { createEpicMiddleware } from 'redux-observable';
import { rootEpic } from './rootEpic';

export type EpicDependencies = {
  tradeApprovalRepository: {
    approve: (tradeId: string) => Promise<void>;
    reject: (tradeId: string, reason: string) => Promise<void>;
  };
  logger: {
    error: (error: unknown) => void;
  };
};

const dependencies: EpicDependencies = {
  tradeApprovalRepository: createTradeApprovalRepository(),
  logger: createLogger(),
};

const epicMiddleware = createEpicMiddleware({
  dependencies,
});

export const store = configureStore({
  reducer: {
    tradeApproval: tradeApprovalReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(epicMiddleware),
});

epicMiddleware.run(rootEpic);
```

### 9.2 Epic uses injected dependencies

```ts
// features/trade-approval/model/tradeApprovalEpics.ts

import { from, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { ofType } from 'redux-observable';
import { tradeApprovalActions } from './tradeApprovalSlice';
import type { EpicDependencies } from '@/app/store';

export const approveTradeEpic = (
  action$,
  _state$,
  { tradeApprovalRepository, logger }: EpicDependencies,
) =>
  action$.pipe(
    ofType(tradeApprovalActions.approveRequested.type),
    mergeMap(action =>
      from(tradeApprovalRepository.approve(action.payload.tradeId)).pipe(
        map(() => tradeApprovalActions.approveSucceeded()),
        catchError(error => {
          logger.error(error);
          return of(tradeApprovalActions.approveFailed());
        }),
      ),
    ),
  );
```

The chain becomes:

```txt
React Component
  ↓
React Adapter / Facade
  ↓
Redux action
  ↓
Epic
  ↓
Injected dependency
```

### 9.3 Important modern Redux note

For new Redux code, the official recommendation is generally:

```txt
RTK Query for data fetching and caching
RTK listener middleware for most reactive workflows
redux-observable only when you truly need RxJS-level stream composition
```

So for this presentation, position redux-observable dependencies as:

```txt
A very useful DI pattern when the app already uses epics,
especially for complex cancellation/debounce/background workflows.
```

Not as the default recommendation for ordinary data fetching.

---

## 10. Integration with SWR

SWR is hook-based, so it belongs in the React adapter layer.

A plain TypeScript facade should not call:

```ts
useSWR(...)
```

because hooks must run in React function components or custom hooks.

For SWR, the pattern is usually:

```txt
React Component
  ↓
React Adapter Hook
  ↓
SWR / useSWRMutation
  ↓
Repository/API
```

### 10.1 Repository

```ts
// features/trade-details/api/tradeDetailsRepository.ts

export type TradeDetails = {
  id: string;
  counterparty: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type TradeDetailsRepository = {
  getTradeDetails: (tradeId: string) => Promise<TradeDetails>;
  approveTrade: (tradeId: string) => Promise<void>;
  rejectTrade: (tradeId: string, reason: string) => Promise<void>;
};
```

### 10.2 SWR-backed React adapter

```tsx
// features/trade-details/react/useTradeDetails.ts

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { TradeDetailsRepository } from '../api/tradeDetailsRepository';

const tradeDetailsKey = (tradeId: string) =>
  ['trade-details', tradeId] as const;

type TradeDetailsKey = ReturnType<typeof tradeDetailsKey>;

export function createUseTradeDetails(repository: TradeDetailsRepository) {
  return function useTradeDetails(tradeId: string) {
    const query = useSWR(
      tradeDetailsKey(tradeId),
      ([, id]: TradeDetailsKey) => repository.getTradeDetails(id),
    );

    const approveMutation = useSWRMutation(
      tradeDetailsKey(tradeId),
      ([, id]: TradeDetailsKey) => repository.approveTrade(id),
      {
        onSuccess() {
          query.mutate();
        },
      },
    );

    const rejectMutation = useSWRMutation(
      tradeDetailsKey(tradeId),
      (
        [, id]: TradeDetailsKey,
        { arg: reason }: { arg: string },
      ) => repository.rejectTrade(id, reason),
      {
        onSuccess() {
          query.mutate();
        },
      },
    );

    return {
      state: {
        trade: query.data,
        isLoading: query.isLoading,
        isValidating: query.isValidating,
        isSaving:
          approveMutation.isMutating || rejectMutation.isMutating,
        error:
          query.error ??
          approveMutation.error ??
          rejectMutation.error,
      },
      api: {
        reload: query.mutate,
        approve: approveMutation.trigger,
        reject: rejectMutation.trigger,
      },
    };
  };
}
```

Why this is aligned with SWR:

```txt
useSWR owns server data and cache.
useSWRMutation owns manually triggered remote mutations.
The adapter exposes one feature-level API to the component.
The component does not know the cache key or mutation details.
```

### 10.3 UI component

```tsx
// features/trade-details/ui/TradeDetailsPage.tsx

import type { createUseTradeDetails } from '../react/useTradeDetails';

type TradeDetailsPageProps = {
  tradeId: string;
  useTradeDetails: ReturnType<typeof createUseTradeDetails>;
};

export function TradeDetailsPage({
  tradeId,
  useTradeDetails,
}: TradeDetailsPageProps) {
  const { state, api } = useTradeDetails(tradeId);

  if (state.isLoading) {
    return <p>Loading...</p>;
  }

  if (state.error) {
    return <p>Failed to load trade details</p>;
  }

  if (!state.trade) {
    return null;
  }

  return (
    <section>
      <h1>Trade Details</h1>

      <p>Counterparty: {state.trade.counterparty}</p>
      <p>
        Amount: {state.trade.amount} {state.trade.currency}
      </p>
      <p>Status: {state.trade.status}</p>

      <button onClick={() => api.reload()}>
        Reload
      </button>

      <button
        disabled={state.isSaving}
        onClick={() => api.approve()}
      >
        Approve
      </button>

      <button
        disabled={state.isSaving}
        onClick={() => api.reject('Incorrect trade details')}
      >
        Reject
      </button>
    </section>
  );
}
```

---

## 11. SWR rule: do not duplicate server cache

Do not copy SWR data into your own feature store just to fit a facade pattern.

Bad:

```txt
useSWR loads trade
then copy trade into Redux/Zustand/local facade cache
then render copied trade
```

This can create stale or conflicting state.

Better split:

```txt
SWR:
  server data
  cache
  loading state
  validation/refetching
  remote mutations

Feature/local state:
  unsaved comment
  selected tab
  wizard step
  form draft
  validation state
  workflow-only state
```

---

## 12. Hybrid usage: SWR for server state, local facade for workflow state

In real applications, the best version is often hybrid.

Example approval screen:

```txt
Trade details from server → SWR
Approval comment          → local state / facade
Approve/reject mutation   → SWR mutation or injected repository
```

```tsx
// features/trade-approval/react/useTradeApprovalScreen.ts

import React from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

export function createUseTradeApprovalScreen({
  repository,
}: {
  repository: {
    getTradeDetails: (tradeId: string) => Promise<{
      id: string;
      counterparty: string;
    }>;
    reject: (tradeId: string, reason: string) => Promise<void>;
  };
}) {
  return function useTradeApprovalScreen(tradeId: string) {
    const [comment, setComment] = React.useState('');
    const [workflowError, setWorkflowError] = React.useState<string | undefined>();

    const key = ['trade-details', tradeId] as const;

    const tradeQuery = useSWR(
      key,
      ([, id]) => repository.getTradeDetails(id),
    );

    const rejectMutation = useSWRMutation(
      key,
      ([, id], { arg: reason }: { arg: string }) =>
        repository.reject(id, reason),
      {
        onSuccess() {
          tradeQuery.mutate();
        },
      },
    );

    async function reject() {
      if (!comment.trim()) {
        setWorkflowError('Comment is required');
        return;
      }

      setWorkflowError(undefined);
      await rejectMutation.trigger(comment);
    }

    return {
      state: {
        trade: tradeQuery.data,
        isLoading: tradeQuery.isLoading,
        isSaving: rejectMutation.isMutating,
        comment,
        error: tradeQuery.error ?? rejectMutation.error ?? workflowError,
      },
      api: {
        setComment,
        reject,
        reload: tradeQuery.mutate,
      },
    };
  };
}
```

The UI still sees one feature-level API:

```ts
const { state, api } = useTradeApprovalScreen(tradeId);
```

---

## 13. Scaling version

For a large multi-route application, each feature can expose an entry point.

```txt
features/
  trade-approval/
    index.ts
    route.tsx
    model/
    react/
    ui/
```

Public API:

```ts
// features/trade-approval/index.ts

export { TradeApprovalRoute } from './route';
```

Route entry:

```tsx
// features/trade-approval/route.tsx

import { TradeApprovalPage } from './ui/TradeApprovalPage';
import { useTradeApproval } from './react/useTradeApproval';

export function TradeApprovalRoute({ tradeId }: { tradeId: string }) {
  return <TradeApprovalPage tradeId={tradeId} />;
}
```

In a package-based setup:

```txt
packages/
  trade-approval/
    src/
      index.ts
      route.tsx
      model/
      react/
      ui/
```

The root app imports only the feature entry:

```tsx
import { TradeApprovalRoute } from '@org/trade-approval';
```

---

## 14. Platform relevance

For large financial applications, this pattern helps keep platform and infrastructure concerns away from React screens.

A feature may need:

```txt
runtime config
permissions
logging
audit events
API client
REST proxy client
feature flags
navigation
```

Without a boundary, these concerns leak into components.

With a facade/adapter approach, components stay focused:

```tsx
const { state, api } = useTradeApproval(tradeId);
```

The implementation behind it can use:

```txt
Redux Toolkit
redux-observable dependencies
SWR
RTK Query
Zustand
plain TypeScript state
platform adapters
```

---

## 15. Benefits

```txt
Cleaner React components.
Feature operations become explicit.
State library details are hidden from page UI.
Works with Redux Toolkit, redux-observable, SWR, RTK Query, Zustand, or plain TS.
Makes complex workflows easier to test.
Supports package/feature entry points.
Reduces direct coupling between UI and infrastructure.
```

---

## 16. Drawbacks and risks

```txt
Extra abstraction can be overkill for simple screens.
Poorly designed facade can become a god object.
If it exposes hooks directly, it is not a pure facade; it is a React adapter.
If it duplicates SWR/RTK Query cache, it can create stale or conflicting state.
If every tiny component gets a facade, the app becomes noisy.
```

Bad facade:

```ts
const appFacade = {
  tradeApproval: {},
  tradeSearch: {},
  reports: {},
  users: {},
  settings: {},
};
```

Better:

```txt
One facade/adapter per meaningful feature or workflow.
```

---

## 17. Related patterns

### Dependency Injection

The facade often receives dependencies:

```ts
createTradeApprovalFacade({ repository, logger, permissions });
```

### redux-observable dependencies

Epics can receive repositories/services through dependency injection.

```txt
Facade/adapter dispatches action → Epic handles side effect through injected dependency.
```

### Composition Root

The Composition Root is where real dependencies are created and wired.

```txt
Composition Root creates repository/store/facade.
React route renders feature entry.
```

### Ports & Adapters

The facade can depend on feature-level interfaces instead of concrete APIs.

```ts
type TradeApprovalRepository = {
  approve(tradeId: string): Promise<void>;
};
```

### Feature Modules with Public API

The feature should expose the route/page/hook/facade through `index.ts`, not its internals.

---

## 18. Key takeaway

```txt
The facade does not replace Redux Toolkit, redux-observable, SWR, or RTK Query.
It gives React components a stable feature-level API.
The implementation behind that API can use whichever state or server-state tool fits the feature.
```

Best short version:

```txt
Components call feature actions.
Adapters connect React.
Internals remain replaceable.
```
