# Pattern: Flat Composition / Slot-Based Layouts

## 1. One sentence

**Flat Composition / Slot-Based Layouts** keeps structural components focused on arranging UI areas, while routes/pages compose the actual feature entries and pass them into those areas as `children` or named slots.

In short:

```txt
Layouts arrange.
Pages compose.
Features own behavior.
```

---

## 2. Problem

In large React applications, components often become deeply nested because structural components import and own their children.

### Before

```tsx
function App() {
  return <DashboardPage />;
}

function DashboardPage() {
  return <DashboardLayout />;
}

function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <NavigationPanel />
      <DashboardMain />
      <DashboardSidebar />
    </div>
  );
}

function DashboardMain() {
  return (
    <main>
      <PortfolioSummary />
      <RecentActivity />
    </main>
  );
}

function DashboardSidebar() {
  return (
    <aside>
      <RiskAlerts />
      <MarketNews />
    </aside>
  );
}
```

At first this looks clean, but it creates several problems:

```txt
DashboardLayout imports business features.
The real page structure is hidden across many files.
Props often need to travel through components that do not use them.
Teams may introduce Context too early just to avoid prop drilling.
Structural components become less reusable.
```

Example: if `PortfolioSummary` and `RiskAlerts` both need the current portfolio ID, the value may need to be passed through `DashboardPage`, `DashboardLayout`, `DashboardMain`, and `DashboardSidebar`, even though most of those components do not use it.

---

## 3. Use case / avoid when

### Use it when

Use this pattern when building large pages with clear areas:

```txt
application shell
route layout
dashboard
overview page
details page
multi-column layout
page with header/content/sidebar
page composed from package or feature entries
```

It is especially useful when:

```txt
layout components are importing too many business features
page structure is hard to see
props are drilled through structural wrappers
Context is used only to avoid passing props through layout components
several large feature entries need to be arranged on the same page
```

### Avoid or limit it when

Avoid forcing this pattern into small leaf components:

```txt
simple button
small modal body
small form section
one-off local UI
pure presentational component with no composition problem
```

Also avoid it when the root/page becomes a huge manual wiring file. The goal is flatter composition, not a 1,000-line `App.tsx`.

---

## 4. Mental model

### Nested ownership model

```txt
App
  └─ DashboardPage
      └─ DashboardLayout
          ├─ NavigationPanel
          ├─ DashboardMain
          │   ├─ PortfolioSummary
          │   └─ RecentActivity
          └─ DashboardSidebar
              ├─ RiskAlerts
              └─ MarketNews
```

Here `DashboardLayout` decides what business sections exist.

### Flat composition model

```txt
DashboardRoute
  └─ DashboardLayout
      ├─ navigation: <NavigationEntry />
      ├─ content:    <DashboardContentEntry />
      └─ sidebar:    <DashboardSidebarEntry />
```

Here `DashboardLayout` only defines where things go. The route/page decides what goes into each slot.

---

## 5. File structure

### Project-level structure

```txt
src/
  app/
    App.tsx

  layouts/
    AppLayout.tsx
    DashboardLayout.tsx
    DetailsLayout.tsx

  pages/
    DashboardRoute.tsx
    PortfolioRoute.tsx
    ReportsRoute.tsx

  features/
    navigation/
      NavigationEntry.tsx

    portfolio-summary/
      PortfolioSummaryEntry.tsx

    risk-alerts/
      RiskAlertsEntry.tsx

    recent-activity/
      RecentActivityEntry.tsx

    reports/
      ReportsEntry.tsx
```

### Monorepo/package-level structure

```txt
repo/
  apps/
    main-spa/
      src/
        App.tsx
        pages/
          DashboardRoute.tsx
          ReportsRoute.tsx

  packages/
    app-layout/
      src/
        AppLayout.tsx
        DashboardLayout.tsx
        index.ts

    navigation/
      src/
        NavigationEntry.tsx
        index.ts

    portfolio-summary/
      src/
        PortfolioSummaryEntry.tsx
        index.ts

    risk-alerts/
      src/
        RiskAlertsEntry.tsx
        index.ts

    reports/
      src/
        ReportsEntry.tsx
        index.ts
```

At package level, the app composes high-level package entries:

```tsx
import { AppLayout } from '@company/app-layout';
import { NavigationEntry } from '@company/navigation';
import { PortfolioSummaryEntry } from '@company/portfolio-summary';
import { RiskAlertsEntry } from '@company/risk-alerts';
```

The root app sees the major building blocks, not their internals.

---

## 6. Minimal code example

### Bad: layout imports business features

```tsx
// layouts/DashboardLayout.tsx

import { NavigationEntry } from '../features/navigation/NavigationEntry';
import { PortfolioSummaryEntry } from '../features/portfolio-summary/PortfolioSummaryEntry';
import { RiskAlertsEntry } from '../features/risk-alerts/RiskAlertsEntry';

export function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <nav>
        <NavigationEntry />
      </nav>

      <main>
        <PortfolioSummaryEntry />
      </main>

      <aside>
        <RiskAlertsEntry />
      </aside>
    </div>
  );
}
```

The problem is that `DashboardLayout` is not just a layout anymore. It knows specific business features.

---

### Good: layout receives slots

```tsx
// layouts/DashboardLayout.tsx

import type { ReactNode } from 'react';

type DashboardLayoutProps = {
  navigation: ReactNode;
  content: ReactNode;
  sidebar?: ReactNode;
};

export function DashboardLayout({
  navigation,
  content,
  sidebar,
}: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <nav className="dashboard-layout__navigation">
        {navigation}
      </nav>

      <main className="dashboard-layout__content">
        {content}
      </main>

      {sidebar ? (
        <aside className="dashboard-layout__sidebar">
          {sidebar}
        </aside>
      ) : null}
    </div>
  );
}
```

The layout now only knows about three areas:

```txt
navigation
content
sidebar
```

It does not know which business features fill those areas.

---

### Page composes the layout

```tsx
// pages/DashboardRoute.tsx

import { DashboardLayout } from '../layouts/DashboardLayout';
import { NavigationEntry } from '../features/navigation/NavigationEntry';
import { PortfolioSummaryEntry } from '../features/portfolio-summary/PortfolioSummaryEntry';
import { RiskAlertsEntry } from '../features/risk-alerts/RiskAlertsEntry';

export function DashboardRoute() {
  const portfolioId = 'P-123';

  return (
    <DashboardLayout
      navigation={<NavigationEntry />}
      content={<PortfolioSummaryEntry portfolioId={portfolioId} />}
      sidebar={<RiskAlertsEntry portfolioId={portfolioId} />}
    />
  );
}
```

Now `portfolioId` goes directly to the components that need it.

It does not need to travel through `DashboardLayout` unless the layout itself uses it.

---

## 7. Scaling version

In a larger application, avoid putting every tiny section directly in the route. Instead, expose meaningful feature entries.

### Good large-app composition

```tsx
// pages/PortfolioRoute.tsx

import { DetailsLayout } from '../layouts/DetailsLayout';
import { NavigationEntry } from '../features/navigation/NavigationEntry';
import { PortfolioHeaderEntry } from '../features/portfolio-header/PortfolioHeaderEntry';
import { PortfolioPositionsEntry } from '../features/portfolio-positions/PortfolioPositionsEntry';
import { PortfolioRiskEntry } from '../features/portfolio-risk/PortfolioRiskEntry';

export function PortfolioRoute() {
  const portfolioId = 'P-123';

  return (
    <DetailsLayout
      navigation={<NavigationEntry />}
      header={<PortfolioHeaderEntry portfolioId={portfolioId} />}
      content={<PortfolioPositionsEntry portfolioId={portfolioId} />}
      sidePanel={<PortfolioRiskEntry portfolioId={portfolioId} />}
    />
  );
}
```

The page is explicit but still high-level.

It does not compose every button, row, field, and widget manually.

### Avoid too much root wiring

```tsx
// Too much detail in the route

<DetailsLayout
  navigation={<NavigationEntry />}
  header={
    <>
      <PortfolioName portfolioId={portfolioId} />
      <PortfolioStatus portfolioId={portfolioId} />
      <PortfolioOwner portfolioId={portfolioId} />
      <PortfolioActions portfolioId={portfolioId} />
    </>
  }
  content={
    <>
      <PositionsFilters portfolioId={portfolioId} />
      <PositionsTable portfolioId={portfolioId} />
      <PositionsPagination portfolioId={portfolioId} />
    </>
  }
/>
```

This is too detailed. In a big app, prefer high-level entries:

```tsx
<DetailsLayout
  navigation={<NavigationEntry />}
  header={<PortfolioHeaderEntry portfolioId={portfolioId} />}
  content={<PortfolioPositionsEntry portfolioId={portfolioId} />}
  sidePanel={<PortfolioRiskEntry portfolioId={portfolioId} />}
/>
```

---

## 8. Platform relevance

This pattern fits large CSR SPAs well because such applications often have:

```txt
large route layouts
many independently owned feature areas
shared application shell
platform-provided navigation/header/sidebar areas
multiple packages or feature entries
```

A platform may provide the outer runtime boundary, but inside the SPA you still need clear application composition.

Useful mental split:

```txt
Platform shell
  loads the SPA

SPA root / route
  composes major feature entries

Layout components
  arrange areas

Feature entries
  own behavior and internal UI
```

This is especially useful when an application has many pages and each page is assembled from large feature sections.

---

## 9. Benefits

### 1. Layouts stay reusable

A layout like this is reusable:

```tsx
<DashboardLayout
  navigation={...}
  content={...}
  sidebar={...}
/>
```

A layout that imports `PortfolioSummaryEntry` and `RiskAlertsEntry` is tied to one business page.

---

### 2. Page structure becomes visible

You can open the route/page and quickly see the major sections:

```tsx
<DetailsLayout
  header={<PortfolioHeaderEntry />}
  content={<PortfolioPositionsEntry />}
  sidePanel={<PortfolioRiskEntry />}
/>
```

This is easier to understand than chasing nested imports across many structural wrappers.

---

### 3. Less prop drilling through structural components

Data can be passed directly to the feature that needs it:

```tsx
<PortfolioRiskEntry portfolioId={portfolioId} />
```

instead of:

```txt
PortfolioRoute
  → DetailsLayout
    → SidePanel
      → PortfolioRiskEntry
```

where intermediate components only forward props.

---

### 4. Less unnecessary Context

Context is useful for truly shared data. But if Context is used only because props pass through several layout wrappers, flat composition may be simpler.

Composition can turn this:

```txt
App → Layout → Panel → Widget
```

into this:

```txt
App → Widget
```

from the data-flow perspective.

---

### 5. Works well with feature/package entries

A huge app can expose each major area as an entry:

```tsx
<ReportsEntry />
<PortfolioSummaryEntry />
<RiskAlertsEntry />
```

The page/root composes entries. Each entry hides internal complexity.

---

## 10. Drawbacks / risks

### 1. The route can become too large

If every small element is composed at route level, the route becomes noisy.

Avoid composing leaf UI there. Compose meaningful sections.

Good:

```tsx
content={<PortfolioPositionsEntry portfolioId={portfolioId} />}
```

Too detailed:

```tsx
content={
  <>
    <FilterA />
    <FilterB />
    <TableToolbar />
    <Table />
    <Pagination />
  </>
}
```

---

### 2. Slot APIs can become too wide

This is okay:

```tsx
<DetailsLayout
  header={...}
  content={...}
  sidePanel={...}
/>
```

This is a smell:

```tsx
<DetailsLayout
  topLeft={...}
  topCenter={...}
  topRight={...}
  middleLeft={...}
  middleCenter={...}
  middleRight={...}
  bottomLeft={...}
  bottomCenter={...}
  bottomRight={...}
/>
```

Too many slots usually means the layout is too generic or the page needs smaller layout components.

---

### 3. It does not replace feature boundaries

Flat composition shows what goes where, but it does not automatically protect feature internals.

Combine it with feature public APIs:

```tsx
import { PortfolioSummaryEntry } from '@/features/portfolio-summary';
```

not:

```tsx
import { PortfolioSummaryTable } from '@/features/portfolio-summary/internal/PortfolioSummaryTable';
```

---

### 4. It can be confused with Plugin / Extension Points

Flat Composition is explicit:

```tsx
<DashboardLayout
  content={<PortfolioSummaryEntry />}
  sidebar={<RiskAlertsEntry />}
/>
```

Plugin / Extension Points are more dynamic:

```ts
const dashboardWidgets = [
  portfolioSummaryWidget,
  riskAlertsWidget,
  marketNewsWidget,
];
```

Both are useful, but they solve different problems.

---

## 11. Related patterns

### Feature Modules with Public API

Flat composition works best when the page imports feature entries from their public APIs:

```tsx
import { RiskAlertsEntry } from '@/features/risk-alerts';
```

The page composes high-level entries, not internals.

---

### Internal Packages / Monorepo

At monorepo scale, slot-based layouts are often used with package entry points:

```tsx
import { DashboardLayout } from '@company/app-layout';
import { PortfolioSummaryEntry } from '@company/portfolio-summary';
import { RiskAlertsEntry } from '@company/risk-alerts';
```

This keeps the app root/page explicit while each package owns its internal implementation.

---

### Plugin / Extension Points

Flat Composition is better when the page knows exactly what sections it wants.

Plugin / Extension Points are better when features should register optional contributions, such as dashboard widgets, page actions, or tabs.

---

### Compound Components

Compound Components are usually a component API pattern:

```tsx
<Tabs>
  <Tabs.List />
  <Tabs.Panel />
</Tabs>
```

Flat Composition / Slot-Based Layouts are more about application/page structure:

```tsx
<PageLayout
  header={<HeaderEntry />}
  content={<MainFeatureEntry />}
  sidebar={<SideFeatureEntry />}
/>
```

---

## 12. Key takeaway

```txt
Do not make layout components own business structure.
Let layouts arrange areas.
Let routes/pages compose feature entries.
```

A good final phrase for the session:

```txt
People often build markup trees.
For large React applications, we should build application composition trees.
```

---

## References

- Kent C. Dodds, “One React mistake that’s slowing you down” — https://www.epicreact.dev/one-react-mistake-thats-slowing-you-down
- React docs, “Passing Props to a Component” — https://react.dev/learn/passing-props-to-a-component
