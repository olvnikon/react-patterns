# Pattern: redux-observable Dependencies

Context: large client-side React SPA applications with Redux Toolkit, redux-observable, RxJS, multiple routes/features, and generic financial workflows such as trade approval, order creation, report generation, portfolio views, or audit-heavy operations.

---

## 1. One sentence

**redux-observable dependencies** let epics receive infrastructure services as the third argument instead of importing concrete API clients, loggers, permissions, or platform services directly.

```ts
const approveTradeEpic = (action$, state$, { tradeApprovalRepository, logger }) => {
  // use injected services here
};
```

The goal is simple:

```txt
Epics orchestrate async workflows.
Injected dependencies perform external work.
```

---

## 2. Problem

Without dependency injection, epics often import infrastructure directly.

```ts
// features/trade-approval/model/tradeApproval.epics.ts

import { ofType } from 'redux-observable';
import { catchError, from, map, mergeMap, of } from 'rxjs';

import { tradeApprovalApi } from '@/shared/api/tradeApprovalApi';
import { logger } from '@/shared/logger';

import {
  approveTradeFailed,
  approveTradeRequested,
  approveTradeSucceeded,
} from './tradeApproval.slice';

export const approveTradeEpic = action$ =>
  action$.pipe(
    ofType(approveTradeRequested.type),
    mergeMap(action =>
      from(tradeApprovalApi.approve(action.payload.tradeId)).pipe(
        map(() => approveTradeSucceeded({ tradeId: action.payload.tradeId })),
        catchError(error => {
          logger.error(error);
          return of(approveTradeFailed({ tradeId: action.payload.tradeId }));
        }),
      ),
    ),
  );
```

This works, but it creates hidden coupling:

```txt
Epic imports concrete API implementation.
Epic imports concrete logger.
Tests need module mocks.
Platform-specific services can leak into feature code.
Changing API/logging infrastructure touches epics.
```

In a huge application, this becomes expensive because many epics start depending on many concrete services directly.

---

## 3. Use case / avoid when

### Use it when

Use redux-observable dependencies when epics need external services:

```txt
API repositories
HTTP clients
loggers
analytics / audit services
permission services
runtime config
navigation services
storage
clock/time service
ID generator
file download service
```

It is especially useful when the epic coordinates more than a single request:

```txt
debounced search
cancellable request pipelines
multi-step async workflows
action-to-action orchestration
background polling
websocket-like event processing
complex retry/cancel behavior
```

### Avoid when

Do not use redux-observable just because a feature needs basic data fetching.

Modern Redux guidance recommends:

```txt
RTK Query for data fetching and caching.
createAsyncThunk for simple request/response workflows.
RTK listener middleware for many reactive workflows.
redux-observable for complex RxJS-heavy workflows where it clearly pays off.
```

So for a simple page that only loads a list, prefer RTK Query or a query library rather than a new epic.

---

## 4. Mental model

```txt
React Component
  ↓ dispatch action
Redux Store
  ↓ action stream
Epic
  ↓ uses injected dependency
Repository / Logger / Permission Service / Platform Adapter
  ↓ external work
API / logging system / runtime platform
```

Or shorter:

```txt
Action in → Epic orchestrates → Dependency performs side effect → Action out
```

An epic should usually say:

```txt
When this action happens,
run this workflow,
call this dependency,
dispatch the result action.
```

It should not say:

```txt
Here is how to construct the HTTP client.
Here is how to read platform globals.
Here is how logging is implemented.
```

---

## 5. File structure

Recommended structure for a large feature:

```txt
src/
  app/
    store.ts
    rootEpic.ts
    dependencies.ts

  features/
    trade-approval/
      index.ts
      model/
        tradeApproval.slice.ts
        tradeApproval.epics.ts
        tradeApproval.selectors.ts
      ports/
        tradeApprovalRepository.ts
      adapters/
        httpTradeApprovalRepository.ts
      ui/
        TradeApprovalPage.tsx
```

The important split:

```txt
model/
  Redux slice, selectors, epics

ports/
  Interfaces the feature needs

adapters/
  Real implementations of those interfaces

app/dependencies.ts
  Creates concrete dependencies

app/store.ts
  Passes dependencies to createEpicMiddleware
```

---

## 6. Code example

### 6.1 Feature actions and reducer

```ts
// features/trade-approval/model/tradeApproval.slice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type TradeApprovalState = {
  approvedTradeIds: string[];
  pendingTradeIds: string[];
  errorByTradeId: Record<string, string | undefined>;
};

const initialState: TradeApprovalState = {
  approvedTradeIds: [],
  pendingTradeIds: [],
  errorByTradeId: {},
};

const tradeApprovalSlice = createSlice({
  name: 'tradeApproval',
  initialState,
  reducers: {
    approveTradeRequested(state, action: PayloadAction<{ tradeId: string }>) {
      state.pendingTradeIds.push(action.payload.tradeId);
      state.errorByTradeId[action.payload.tradeId] = undefined;
    },

    approveTradeSucceeded(state, action: PayloadAction<{ tradeId: string }>) {
      state.pendingTradeIds = state.pendingTradeIds.filter(
        id => id !== action.payload.tradeId,
      );
      state.approvedTradeIds.push(action.payload.tradeId);
    },

    approveTradeFailed(
      state,
      action: PayloadAction<{ tradeId: string; error: string }>,
    ) {
      state.pendingTradeIds = state.pendingTradeIds.filter(
        id => id !== action.payload.tradeId,
      );
      state.errorByTradeId[action.payload.tradeId] = action.payload.error;
    },
  },
});

export const tradeApprovalReducer = tradeApprovalSlice.reducer;

export const {
  approveTradeRequested,
  approveTradeSucceeded,
  approveTradeFailed,
} = tradeApprovalSlice.actions;
```

---

### 6.2 Port: feature-level dependency interface

```ts
// features/trade-approval/ports/tradeApprovalRepository.ts

export type TradeApprovalRepository = {
  approveTrade: (tradeId: string) => Promise<void>;
};
```

This is the service the epic needs.

The epic does not need to know whether approval uses:

```txt
fetch
Axios
internal HTTP client
REST proxy
mock data
test fixture
```

---

### 6.3 Adapter: concrete implementation

```ts
// features/trade-approval/adapters/httpTradeApprovalRepository.ts

import type {
  TradeApprovalRepository,
} from '../ports/tradeApprovalRepository';

type HttpClient = {
  post: <TResponse>(url: string, body?: unknown) => Promise<TResponse>;
};

export function createHttpTradeApprovalRepository(
  httpClient: HttpClient,
): TradeApprovalRepository {
  return {
    async approveTrade(tradeId) {
      await httpClient.post(`/api/trades/${tradeId}/approve`);
    },
  };
}
```

Infrastructure details stay in the adapter.

---

### 6.4 App dependencies type

```ts
// app/dependencies.ts

import {
  createHttpTradeApprovalRepository,
} from '@/features/trade-approval/adapters/httpTradeApprovalRepository';

export type AppDependencies = {
  tradeApprovalRepository: {
    approveTrade: (tradeId: string) => Promise<void>;
  };

  logger: {
    error: (
      message: string,
      context?: Record<string, unknown>,
    ) => void;
  };
};

type RuntimeServices = {
  httpClient: {
    post: <TResponse>(url: string, body?: unknown) => Promise<TResponse>;
  };
  logger: AppDependencies['logger'];
};

export function createAppDependencies({
  httpClient,
  logger,
}: RuntimeServices): AppDependencies {
  return {
    tradeApprovalRepository: createHttpTradeApprovalRepository(httpClient),
    logger,
  };
}
```

The dependencies object is your application-level contract for epics.

---

### 6.5 Epic uses injected dependencies

```ts
// features/trade-approval/model/tradeApproval.epics.ts

import { ofType, type Epic } from 'redux-observable';
import { catchError, from, map, mergeMap, of } from 'rxjs';

import type { RootState } from '@/app/store';
import type { AppDependencies } from '@/app/dependencies';

import {
  approveTradeFailed,
  approveTradeRequested,
  approveTradeSucceeded,
} from './tradeApproval.slice';

type AppAction =
  | ReturnType<typeof approveTradeRequested>
  | ReturnType<typeof approveTradeSucceeded>
  | ReturnType<typeof approveTradeFailed>;

export const approveTradeEpic: Epic<
  AppAction,
  AppAction,
  RootState,
  AppDependencies
> = (action$, state$, { tradeApprovalRepository, logger }) =>
  action$.pipe(
    ofType(approveTradeRequested.type),
    mergeMap(action =>
      from(
        tradeApprovalRepository.approveTrade(action.payload.tradeId),
      ).pipe(
        map(() =>
          approveTradeSucceeded({
            tradeId: action.payload.tradeId,
          }),
        ),
        catchError(error => {
          logger.error('Failed to approve trade', {
            tradeId: action.payload.tradeId,
            error,
          });

          return of(
            approveTradeFailed({
              tradeId: action.payload.tradeId,
              error: 'Failed to approve trade',
            }),
          );
        }),
      ),
    ),
  );
```

The epic now imports:

```txt
feature actions
Redux/RxJS primitives
types
```

It does not import:

```txt
concrete HTTP client
concrete logger
platform globals
```

---

### 6.6 Root epic

```ts
// app/rootEpic.ts

import { combineEpics } from 'redux-observable';

import {
  approveTradeEpic,
} from '@/features/trade-approval/model/tradeApproval.epics';

export const rootEpic = combineEpics(
  approveTradeEpic,
);
```

redux-observable uses a single root epic, typically built with `combineEpics`.

---

### 6.7 Store configuration with Redux Toolkit

```ts
// app/store.ts

import {
  configureStore,
} from '@reduxjs/toolkit';

import {
  createEpicMiddleware,
} from 'redux-observable';

import type {
  AppDependencies,
} from './dependencies';

import {
  rootEpic,
} from './rootEpic';

import {
  tradeApprovalReducer,
} from '@/features/trade-approval/model/tradeApproval.slice';

export function createAppStore(dependencies: AppDependencies) {
  const epicMiddleware = createEpicMiddleware({
    dependencies,
  });

  const store = configureStore({
    reducer: {
      tradeApproval: tradeApprovalReducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(epicMiddleware),
  });

  epicMiddleware.run(rootEpic);

  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
```

`dependencies` is passed to `createEpicMiddleware`, and redux-observable injects it into all epics as the third argument.

---

### 6.8 Component dispatches normal Redux action

```tsx
// features/trade-approval/ui/TradeApprovalButton.tsx

import {
  useDispatch,
  useSelector,
} from 'react-redux';

import type {
  AppDispatch,
  RootState,
} from '@/app/store';

import {
  approveTradeRequested,
} from '../model/tradeApproval.slice';

type TradeApprovalButtonProps = {
  tradeId: string;
};

export function TradeApprovalButton({
  tradeId,
}: TradeApprovalButtonProps) {
  const dispatch = useDispatch<AppDispatch>();

  const isPending = useSelector((state: RootState) =>
    state.tradeApproval.pendingTradeIds.includes(tradeId),
  );

  return (
    <button
      disabled={isPending}
      onClick={() =>
        dispatch(
          approveTradeRequested({ tradeId }),
        )
      }
    >
      {isPending ? 'Approving...' : 'Approve'}
    </button>
  );
}
```

React dispatches an action.

The epic reacts to it.

The dependency performs the external side effect.

---

## 7. Scaling version

For a huge application, avoid one flat dependency object with dozens of unrelated services.

### Less ideal

```ts
export type AppDependencies = {
  httpClient: HttpClient;
  logger: Logger;
  permissions: Permissions;
  tradeApprovalRepository: TradeApprovalRepository;
  tradeSearchRepository: TradeSearchRepository;
  reportsRepository: ReportsRepository;
  portfolioRepository: PortfolioRepository;
  clientRepository: ClientRepository;
  fileDownloadService: FileDownloadService;
  analytics: Analytics;
  // ...keeps growing
};
```

This becomes a service locator.

### Better: structure dependencies by area

```ts
export type AppDependencies = {
  platform: {
    logger: Logger;
    permissions: Permissions;
    analytics: Analytics;
    config: RuntimeConfig;
  };

  features: {
    tradeApproval: {
      repository: TradeApprovalRepository;
    };

    tradeSearch: {
      repository: TradeSearchRepository;
    };

    reports: {
      repository: ReportsRepository;
      fileDownloadService: FileDownloadService;
    };
  };
};
```

Then a feature epic uses only its area:

```ts
export const approveTradeEpic = (
  action$,
  state$,
  { features, platform }: AppDependencies,
) =>
  action$.pipe(
    ofType(approveTradeRequested.type),
    mergeMap(action =>
      from(
        features.tradeApproval.repository.approveTrade(
          action.payload.tradeId,
        ),
      ).pipe(
        map(() => approveTradeSucceeded({ tradeId: action.payload.tradeId })),
        catchError(error => {
          platform.logger.error('Failed to approve trade', {
            error,
            tradeId: action.payload.tradeId,
          });

          return of(
            approveTradeFailed({
              tradeId: action.payload.tradeId,
              error: 'Failed to approve trade',
            }),
          );
        }),
      ),
    ),
  );
```

### Even stricter: feature epic factory

The built-in redux-observable dependency object is global per middleware instance. For stricter feature boundaries, create feature epics with feature-specific dependencies first.

```ts
// features/trade-approval/model/createTradeApprovalEpics.ts

import { combineEpics } from 'redux-observable';

import type {
  TradeApprovalRepository,
} from '../ports/tradeApprovalRepository';

type TradeApprovalEpicDependencies = {
  repository: TradeApprovalRepository;
  logger: {
    error: (message: string, context?: Record<string, unknown>) => void;
  };
};

export function createTradeApprovalEpics(
  deps: TradeApprovalEpicDependencies,
) {
  const approveTradeEpic = action$ =>
    action$.pipe(
      ofType(approveTradeRequested.type),
      mergeMap(action =>
        from(deps.repository.approveTrade(action.payload.tradeId)).pipe(
          map(() => approveTradeSucceeded({ tradeId: action.payload.tradeId })),
          catchError(error => {
            deps.logger.error('Failed to approve trade', { error });
            return of(
              approveTradeFailed({
                tradeId: action.payload.tradeId,
                error: 'Failed to approve trade',
              }),
            );
          }),
        ),
      ),
    );

  return combineEpics(approveTradeEpic);
}
```

Then in app wiring:

```ts
const tradeApprovalEpics = createTradeApprovalEpics({
  repository: dependencies.features.tradeApproval.repository,
  logger: dependencies.platform.logger,
});

export const rootEpic = combineEpics(
  tradeApprovalEpics,
  tradeSearchEpics,
  reportsEpics,
);
```

This gives stronger feature ownership, but it is more boilerplate.

---

## 8. Platform relevance

In a large platform-hosted CSR SPA, epics often need to interact with services outside React:

```txt
runtime config
permissions
logging/audit
navigation
REST proxy client
file download service
analytics
cross-feature events
```

Without dependency injection, epics may start importing platform globals directly.

Avoid this:

```ts
import { platform } from '@/platform/globalPlatform';

platform.logger.error(error);
platform.permissions.has('TRADE_APPROVE');
platform.config.apiBaseUrl;
```

Prefer this:

```ts
export const approveTradeEpic = (
  action$,
  state$,
  { platform, features }: AppDependencies,
) => {
  // use injected platform and feature services
};
```

This keeps platform integration in the app composition layer and keeps feature epics easier to test.

---

## 9. Benefits

### 9.1 Better testability

You can call the epic directly and pass fake dependencies.

```ts
const fakeDependencies = {
  tradeApprovalRepository: {
    approveTrade: vi.fn().mockResolvedValue(undefined),
  },
  logger: {
    error: vi.fn(),
  },
};
```

No module mocking.

No real HTTP.

No platform globals.

---

### 9.2 Cleaner feature boundaries

Epics depend on feature ports, not concrete infrastructure.

```txt
Good:
  tradeApprovalRepository.approveTrade(tradeId)

Bad:
  fetch('/api/trades/' + tradeId + '/approve')
```

---

### 9.3 Easier infrastructure migration

You can replace:

```txt
fetch → internal HTTP client
internal HTTP client → REST proxy client
one logger → another logger
static config → runtime config
```

without changing the epic if the dependency interface stays stable.

---

### 9.4 Better alignment with complex workflows

RxJS is strong when the workflow involves:

```txt
debounce
throttle
cancellation
race handling
retry
polling
combining action streams
orchestration across multiple actions
```

Dependencies keep this orchestration separate from infrastructure.

---

### 9.5 Works with feature modules

Each feature can own:

```txt
slice
epics
selectors
ports
adapters
```

The app composes them through the store and dependency object.

---

## 10. Drawbacks / risks

### 10.1 Can become a service locator

If every epic receives every service, the dependency object becomes uncontrolled.

Avoid:

```ts
const dependencies = {
  everything: app,
};
```

Prefer explicit typed dependencies.

---

### 10.2 More boilerplate

Compared with importing an API directly, dependency injection adds:

```txt
ports
adapters
dependencies object
store wiring
test fakes
```

This is worth it for important features, but not for every tiny effect.

---

### 10.3 RxJS complexity

Redux's current guidance is cautious about observables because RxJS has a non-trivial mental model, can be harder to debug, and adds bundle size.

Use epics where RxJS is truly valuable, not as the default for all async code.

---

### 10.4 Not the default for data fetching/cache

For normal server-state data fetching and caching, prefer RTK Query or another server-state cache.

Epics are better for action-driven workflows and complex async orchestration.

---

## 11. Testing example

A small direct epic test:

```ts
// features/trade-approval/model/tradeApproval.epics.test.ts

import { of, lastValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';

import {
  approveTradeEpic,
} from './tradeApproval.epics';

import {
  approveTradeRequested,
  approveTradeSucceeded,
} from './tradeApproval.slice';

it('approves trade using injected repository', async () => {
  const dependencies = {
    tradeApprovalRepository: {
      approveTrade: vi.fn().mockResolvedValue(undefined),
    },
    logger: {
      error: vi.fn(),
    },
  };

  const action$ = of(
    approveTradeRequested({ tradeId: 'T-123' }),
  );

  const state$ = null as any;

  const result = await lastValueFrom(
    approveTradeEpic(
      action$,
      state$,
      dependencies,
    ).pipe(toArray()),
  );

  expect(dependencies.tradeApprovalRepository.approveTrade)
    .toHaveBeenCalledWith('T-123');

  expect(result).toEqual([
    approveTradeSucceeded({ tradeId: 'T-123' }),
  ]);
});
```

For time-based RxJS logic, use RxJS `TestScheduler` or marble tests. For simple dependency-injection examples, direct fake dependencies are often enough.

---

## 12. Related patterns

### Dependency Injection

redux-observable dependencies are a concrete implementation of Dependency Injection.

```txt
Instead of importing services,
epics receive services.
```

---

### Composition Root

The Composition Root is where real dependencies are created and passed into `createEpicMiddleware`.

```txt
Composition Root creates dependencies.
redux-observable injects them into epics.
```

---

### Ports & Adapters

The dependency interface is usually a port.

The real implementation is an adapter.

```txt
Port:
  TradeApprovalRepository

Adapter:
  createHttpTradeApprovalRepository(httpClient)
```

---

### Feature Facade + React Adapter

A React component may call a facade method:

```ts
api.approveTrade(tradeId)
```

The facade may dispatch a Redux action:

```ts
store.dispatch(approveTradeRequested({ tradeId }))
```

The epic reacts to that action and uses injected dependencies.

```txt
React
  ↓
Facade
  ↓
Redux action
  ↓
Epic
  ↓
Injected dependency
```

---

## 13. Key takeaway

```txt
Epics should orchestrate workflows, not own infrastructure.
Inject repositories, loggers, permissions, config, and platform services through redux-observable dependencies.
```

Use this pattern when RxJS gives real value: cancellation, debouncing, polling, retries, event streams, and complex action-driven workflows.

For simple data fetching and caching, prefer RTK Query or another server-state cache.

---

## 14. Slide takeaway

**redux-observable dependencies turn epics from infrastructure-coupled scripts into testable workflow orchestrators.**

---

## 15. References

- redux-observable: Injecting Dependencies Into Epics — https://redux-observable.js.org/docs/recipes/InjectingDependenciesIntoEpics.html
- redux-observable: createEpicMiddleware — https://redux-observable.js.org/docs/api/createEpicMiddleware.html
- redux-observable: Setting Up The Middleware — https://redux-observable.js.org/docs/basics/SettingUpTheMiddleware.html
- Redux docs: Side Effects Approaches — https://redux.js.org/usage/side-effects-approaches
