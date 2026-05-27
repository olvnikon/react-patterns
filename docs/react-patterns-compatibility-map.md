# React Scaling Patterns — Compatibility Map

## Purpose

This document focuses only on **how the selected React scaling patterns work together**.

It does not describe a demo application. It is intended as a planning/reference document for deciding which patterns can be presented together and how they relate.

---

## Selected Patterns

| Pattern | Main role |
|---|---|
| **Feature Modules with Public API** | Defines feature boundaries and controls imports. |
| **Feature Facade + React Adapter** | Gives React components a clean feature-level API. |
| **redux-observable dependencies** | Injects side-effect dependencies into epics. |
| **Flat Application Composition / Slot-Based Layouts** | Makes application/page composition explicit and reduces prop drilling. |
| **`replaceReducer` / `injectReducer` in a multi-route SPA** | Loads route/feature reducers only when needed. |
| **Plugin / Extension Points** | Lets features contribute UI/behavior through contracts instead of direct imports. |

---

# 1. High-Level Compatibility

All selected patterns are compatible. They mostly solve different parts of the same larger problem:

```txt
How do we keep a large React application modular, understandable, and changeable?
```

The common theme is **dependency direction**.

```txt
Bad direction:
  Everything imports everything.

Better direction:
  App composes features.
  Features expose public APIs.
  React talks to feature APIs.
  Side effects receive injected dependencies.
  Optional contributions go through contracts.
```

---

# 2. Compatibility Matrix

| Pattern | Works well with | Why |
|---|---|---|
| **Feature Modules with Public API** | All selected patterns | It creates the basic module boundary that other patterns rely on. |
| **Feature Facade + React Adapter** | Feature Modules, Redux Toolkit, SWR, redux-observable dependencies | It can hide different internal implementations behind a stable feature API. |
| **redux-observable dependencies** | Feature Modules, Feature Facade, `injectReducer` | Epics can be feature-owned and receive dependencies without importing infrastructure. |
| **Flat Application Composition** | Feature Modules, Public API, Plugin / Extension Points | The app/page composes feature entries explicitly without deep imports. |
| **`replaceReducer` / `injectReducer`** | Feature Modules, route-based features, redux-observable | Route features can lazy-load reducers; the same idea can extend to epics if needed. |
| **Plugin / Extension Points** | Feature Modules, Public API, Flat Composition | Features can contribute widgets/actions/tabs through a host-defined contract. |

---

# 3. Pattern Groups

## Group 1: Feature Boundaries

Patterns:

```txt
Feature Modules with Public API
```

Optional extension:

```txt
Project-level feature modules
  ↓
Monorepo packages
```

This group answers:

```txt
Where does code live?
What is public?
What is private?
How do we prevent deep imports?
```

This is the foundation. Other patterns work better when feature boundaries already exist.

---

## Group 2: React-to-Feature Boundary

Patterns:

```txt
Feature Facade + React Adapter
```

Related tools:

```txt
Redux Toolkit
SWR
Zustand
React Query
redux-observable
```

This group answers:

```txt
How should React components talk to feature logic?
```

The pattern does not require a custom state manager. It can wrap or adapt existing tools.

Examples of valid internal implementations:

```txt
React Adapter → Redux Toolkit selectors/actions
React Adapter → SWR query/mutation hooks
React Adapter → Zustand store
React Adapter → Plain TypeScript facade
React Adapter → Redux action → redux-observable epic
```

The key idea:

```txt
React component sees state + api.
It does not need to know the implementation details.
```

---

## Group 3: Dependency Injection / Side Effects

Patterns:

```txt
redux-observable dependencies
```

Related concepts:

```txt
Dependency Injection
Composition Root
Ports & Adapters
```

This group answers:

```txt
How do side-effect layers access APIs, loggers, config, permissions, or platform services?
```

redux-observable dependencies are a concrete implementation of DI:

```txt
Epic does not import repository directly.
Epic receives repository as dependency.
```

This works well with Feature Modules:

```txt
Feature owns epic.
Application wires dependencies.
Epic receives dependencies.
```

It also works well with Feature Facade:

```txt
React → Facade → Redux action → Epic → Injected dependency
```

---

## Group 4: Application Composition

Patterns:

```txt
Flat Application Composition / Slot-Based Layouts
```

This group answers:

```txt
Where do we compose the visible application structure?
```

It works especially well with Feature Modules because the composed pieces can be feature entries:

```txt
Page/Route composes feature entries.
Feature entries hide internals behind public APIs.
Layout components arrange, but do not own business features.
```

This pattern is mostly about avoiding excessive wrapper trees and prop drilling.

It pairs well with:

```txt
Feature Public API
Feature Entries
Route-level composition
Monorepo package entries
```

---

## Group 5: Route-Level Scaling

Patterns:

```txt
replaceReducer / injectReducer
```

This group answers:

```txt
How do we avoid loading all feature reducers for all routes upfront?
```

It works best with:

```txt
Route-based features
Feature Modules with Public API
Lazy route loading
Feature-owned Redux slices
```

It can also work with redux-observable if the application has a strategy for dynamic epic injection, but this is a separate concern.

Important distinction:

```txt
injectReducer:
  load state logic lazily

lazy route:
  load UI/route code lazily

dynamic epic injection:
  load side-effect logic lazily
```

They are related, but not the same.

---

## Group 6: Extension-Based Composition

Patterns:

```txt
Plugin / Extension Points
```

This group answers:

```txt
How can optional features contribute to a host page without the host importing every feature directly?
```

It works well with Feature Public APIs:

```txt
Feature exports extension object.
Host consumes extension contract.
```

It also works with Flat Composition, but the two should not be confused.

```txt
Flat Composition:
  explicit composition of known sections

Plugin / Extension Points:
  contract-based contribution of optional sections
```

---

# 4. Strong Pattern Combinations

## Combination A: Feature Modules + Public API + Flat Composition

Very strong combination.

```txt
Feature module exposes entry.
Route/page imports entry from public API.
Route/page composes entries into layout.
```

Why it works:

```txt
Clear feature ownership.
No deep imports.
Application structure remains visible.
Layouts stay generic.
```

This is one of the best combinations for large CSR SPAs.

---

## Combination B: Feature Facade + React Adapter + Redux Toolkit

Good when Redux is already used, but components should not be coupled to Redux details.

```txt
Component
  ↓
useFeature()
  ↓
selectors + dispatch
  ↓
Redux slice/thunks/epics
```

Why it works:

```txt
Components do not need dispatch/action/selector knowledge.
Feature API is easier to read.
Redux remains available internally.
```

Use this mainly for complex features, not every tiny component.

---

## Combination C: Feature Facade + React Adapter + SWR

Good when feature state is mostly server state.

```txt
Component
  ↓
useFeature()
  ↓
SWR / useSWRMutation
  ↓
Repository/API
```

Why it works:

```txt
Server cache remains in SWR.
Component receives feature-shaped state/api.
No duplicate custom cache is needed.
```

Useful for read-heavy screens and simple server mutations.

---

## Combination D: Feature Facade + redux-observable dependencies

Good for complex async workflows.

```txt
Component
  ↓
Feature React Adapter
  ↓
Facade action
  ↓
Redux action
  ↓
Epic
  ↓
Injected dependency
```

Why it works:

```txt
React stays thin.
Facade provides feature language.
Epic handles async orchestration.
Dependencies stay injectable/testable.
```

Good for workflows with cancellation, sequencing, streams, or complex async behavior.

---

## Combination E: Feature Modules + injectReducer

Good for large multi-route SPAs.

```txt
Route loads feature module.
Feature module exposes reducer.
Route injects reducer.
Route renders feature page.
```

Why it works:

```txt
Initial store stays smaller.
Heavy route state loads only when needed.
Feature owns its reducer.
```

This works best when route features are large and rarely used.

---

## Combination F: Feature Modules + Plugin / Extension Points

Good for dashboards, configurable pages, toolbars, tabs, and detail-page actions.

```txt
Host defines extension contract.
Feature exports extension contribution.
Application selects active extensions.
Host renders them.
```

Why it works:

```txt
Host does not import every feature directly.
Features can be optional.
Contributions are standardized.
```

Good when multiple features need to contribute to the same area.

---

## Combination G: Flat Composition + Plugin / Extension Points

Useful, but they solve different problems.

```txt
Flat Composition:
  known sections are passed explicitly

Plugin / Extension Points:
  optional/dynamic sections are collected through contracts
```

They can be used together:

```txt
Page explicitly composes:
  left nav
  center content
  right panel

One of those areas may render:
  extension-provided widgets/actions/tabs
```

Do not use extension points where explicit composition is clearer.

---

# 5. Patterns That Are Similar but Not the Same

## Feature Modules vs Monorepo Packages

```txt
Feature Modules:
  architectural boundary inside one project

Monorepo Packages:
  physical/package boundary across workspace packages
```

They align well, but they are not the same.

Recommended progression:

```txt
feature folder
  ↓
feature module with public API
  ↓
internal package when the boundary becomes stable
```

---

## Feature Facade vs React Adapter

```txt
Feature Facade:
  feature-level API and behavior

React Adapter:
  hook/component layer that connects the facade or tools to React
```

A pure facade should not use React hooks.

If SWR or Redux hooks are used, that layer is the React Adapter.

---

## Dependency Injection vs redux-observable dependencies

```txt
Dependency Injection:
  general principle

redux-observable dependencies:
  concrete epic middleware feature
```

redux-observable dependencies are one way to apply DI in Redux side-effect code.

---

## Composition Root vs Dependency Injection

```txt
Dependency Injection:
  pass dependencies in

Composition Root:
  create and wire dependencies in one place
```

Even if Composition Root is not a main presentation pattern, it is useful as a supporting concept.

---

## Flat Composition vs Plugin / Extension Points

```txt
Flat Composition:
  explicit static composition

Plugin / Extension Points:
  contract-based optional contribution
```

Use Flat Composition by default.

Use Extension Points when optional contribution is a real requirement.

---

## injectReducer vs lazy route loading

```txt
lazy route loading:
  delays loading UI/route code

injectReducer:
  delays registering Redux state logic
```

They often appear together but solve different problems.

---

# 6. Compatibility Recommendations

## Best Core Set

These patterns form the strongest coherent core:

```txt
Feature Modules with Public API
Flat Application Composition
Feature Facade + React Adapter
redux-observable dependencies
```

They tell a clear story:

```txt
Define feature boundaries.
Compose features explicitly.
Expose clean feature APIs to React.
Inject infrastructure into async side effects.
```

---

## Add for Multi-Route Scaling

Add:

```txt
replaceReducer / injectReducer
```

when the presentation discusses:

```txt
large route bundles
route-specific state
lazy-loaded features
multi-route SPA scaling
```

---

## Optional Pattern

Add:

```txt
Plugin / Extension Points
```

when the presentation discusses:

```txt
dashboards
configurable pages
optional widgets
page actions
tabs
platform-like extensibility
```

It is powerful, but not always needed.

---

# 7. What Can Be Shown Together

## Can be shown in one integrated example

```txt
Feature Modules with Public API
Flat Application Composition
Feature Facade + React Adapter
redux-observable dependencies
replaceReducer / injectReducer
```

These fit naturally in one large multi-route SPA.

---

## Better shown as optional or isolated

```txt
Plugin / Extension Points
```

It can be integrated, but it may distract from the core architecture story unless the page naturally needs optional contributions.

---

# 8. Main Takeaway

The selected patterns are compatible because they focus on different boundaries:

```txt
Feature Modules:
  code ownership boundary

Flat Composition:
  application structure boundary

Feature Facade + React Adapter:
  React-to-feature boundary

redux-observable dependencies:
  side-effect dependency boundary

injectReducer:
  route/state loading boundary

Plugin / Extension Points:
  host-to-extension boundary
```

Together, they support the same architectural goal:

```txt
Large React applications should be assembled from clear, stable, replaceable parts — not from uncontrolled imports and deeply nested wrappers.
```
