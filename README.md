# Financial Workspace SPA

This repository is a generic React architecture showcase for a client-side financial workspace. It uses only mocked local examples such as orders, portfolios, approvals, reports, dashboards, risk summary, and activity feed.

The application is intentionally small so the package boundaries and scaling patterns can be explained in a live architecture walkthrough.

## Run

```sh
corepack pnpm install
corepack pnpm dev
```

Validation commands:

```sh
corepack pnpm typecheck
corepack pnpm build
```

## Public API Rule

Every package exposes its public contract from `src/index.ts`. Application code imports packages from the package root, for example:

```ts
import { OrdersEntry } from '@demo/feature-orders';
import { AppShell } from '@demo/ui-layouts';
```

`src/index.ts` is a contract, not a barrel file. It should export only the entry points, types, helpers, or wiring metadata that consumers are meant to use. Internal UI, model, React adapter, fixture, and helper files stay private by convention unless a later phase intentionally promotes a symbol to the public API.

Avoid deep imports such as:

```ts
import { SomethingInternal } from '@demo/feature-orders/src/internal/SomethingInternal';
```

## Flat Application Composition

The `/orders` route demonstrates Flat Application Composition. The route owns
the mocked workspace context:

```txt
selectedDeskId: DESK-GLOBAL
selectedPortfolioId: PF-001
userId: USR-DEMO
```

It passes that data directly to the feature entries that need it and gives the
layout package only React-node slots:

```tsx
<WorkspaceLayout
  leftNav={<LeftNav>{/* portfolio summary */}</LeftNav>}
  centerContent={<CenterContent>{/* orders workspace */}</CenterContent>}
  rightContent={<RightContent>{/* risk + activity */}</RightContent>}
/>
```

Build the application, not wrapper trees: route components should show the
meaningful application sections, while layout components arrange regions only.
`@demo/ui-layouts` is business-agnostic and does not import orders, portfolios,
reports, approvals, risk, or activity feed features.

## Package Map

| Package | Public API |
| --- | --- |
| `@demo/ui-layouts` | `AppShell`, `WorkspaceLayout`, `LeftNav`, `CenterContent`, `RightContent` |
| `@demo/feature-dashboard` | `DashboardEntry` |
| `@demo/feature-orders` | `OrdersEntry` |
| `@demo/feature-order-approval` | `OrderApprovalEntry` |
| `@demo/feature-reports` | `ReportsEntry` |
| `@demo/feature-portfolio-summary` | `PortfolioSummaryEntry` |
| `@demo/feature-risk-summary` | `RiskSummaryEntry` |
| `@demo/feature-activity-feed` | `ActivityFeedEntry` |
| `@demo/shared-types` | Generic demo ID, money, currency, and status types |
| `@demo/shared-formatting` | `formatDate`, `formatMoney`, `formatStatus` |
| `@demo/shared-api` | Mock-only repository/logger/clock placeholders and `delay` |

## Current Routes

| Route | Placeholder entry |
| --- | --- |
| `/` | `DashboardEntry` |
| `/orders` | `OrdersEntry` |
| `/orders/:orderId/approval` | `OrderApprovalEntry` |
| `/reports` | `ReportsEntry` |

## Pattern Roadmap

| Pattern | Current preparation |
| --- | --- |
| Feature Modules with Public API | All packages expose a small `src/index.ts` contract. |
| Flat Application Composition | `/orders` composes feature entries into layout slots. |
| Feature Facade + React Adapter | Reserved for the Order Approval feature in a later phase. |
| redux-observable dependencies | Reserved for the Order Approval async flow in a later phase. |
| replaceReducer / injectReducer | Reserved for the Reports route in a later phase. |

Plugin / Extension Points are intentionally not implemented in this showcase.

## Safety Note

All data is fake, generic, local, and mocked. The repository must not contain real company names, internal system names, real APIs, real endpoints, credentials, real users, or proprietary workflows.
