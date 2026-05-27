# Pattern: Flat Application Composition / Slot-Based Layouts

## 1. One sentence

**Flat Application Composition** means building the visible application structure at the level where the required data already exists, while layout components only arrange the UI.

In short:

```txt
Compose the application, not a chain of wrappers.
```

A layout should usually say:

```txt
I have a navigation area.
I have a main content area.
I have a right-side area.
```

It should not necessarily decide which business widgets live inside those areas.

---

## 2. Problem

In large React applications, page structure often becomes hidden behind several nested components.

### Before

```tsx
function App() {
  return <TradingWorkspace />;
}

function TradingWorkspace() {
  return (
    <div>
      <MainNav />
      <WorkspaceLayout />
    </div>
  );
}

function WorkspaceLayout() {
  return (
    <main>
      <LeftColumn />
      <CenterColumn />
      <RightColumn />
    </main>
  );
}

function CenterColumn() {
  return (
    <section>
      <OrderBlotter />
      <RecentTrades />
      <ActivityFeed />
    </section>
  );
}
```

This looks organized, but it creates hidden coupling:

```txt
App does not show what the application actually contains.
Layout components import business features.
Data may be passed through components that do not use it.
Teams may introduce Context only to avoid prop drilling.
The app becomes a tree of wrappers instead of a visible application composition.
```

Example: `OrderBlotter`, `RecentTrades`, and `RiskSummary` may all need `selectedDesk`, but the value has to travel through `TradingWorkspace`, `WorkspaceLayout`, `CenterColumn`, and `RightColumn` even though those components may only arrange markup.

---

## 3. Use case / avoid when

### Use it when

Use this pattern for large pages with meaningful application sections:

```txt
application shell
workspace layout
dashboard
overview page
details page
multi-column page
page with header/content/sidebar
page composed from feature or package entries
```

It is especially useful when:

```txt
page structure is hard to see
layout components import many business features
props are drilled through structural wrappers
Context is used only to avoid passing data through layout components
you want route/page components to show the real application composition
```

### Avoid or limit it when

Avoid forcing it into tiny leaf components:

```txt
button
small modal body
small form field
simple presentational component
one-off local UI
```

Also avoid turning `App.tsx` or a route component into a giant wiring file. Compose meaningful application sections, not every small piece of markup.

---

## 4. Mental model

### Nested ownership model

```txt
App
  → TradingWorkspace
    → WorkspaceLayout
      → CenterColumn
        → OrderBlotter
        → RecentTrades
      → RightColumn
        → RiskSummary
```

In this model, structural components own and import business children.

### Flat composition model

```txt
App or Route
  → knows shared data
  → composes major business sections
  → passes sections into layout components
```

Example:

```txt
TradesRoute
  selectedDesk
  permissions
  user

  → TradingWorkspace
      leftNav: DeskSelector + PortfolioList
      centerContent: OrderBlotter + RecentTrades
      rightContent: RiskSummary + PendingApprovals
```

The route/page becomes the composition point.

---

## 5. File structure

```txt
src/
  app/
    App.tsx

  layouts/
    AppShell.tsx
    MainNav.tsx
    TradingWorkspace.tsx
    WorkspaceColumns.tsx

  features/
    global-search/
      GlobalSearch.tsx

    navigation/
      NavigationLinks.tsx
      UserMenu.tsx

    desk-selection/
      DeskSelector.tsx

    portfolios/
      PortfolioList.tsx

    orders/
      OrderBlotter.tsx

    trades/
      RecentTrades.tsx
      TradeActivityFeed.tsx

    risk/
      RiskSummary.tsx

    approvals/
      PendingApprovals.tsx

    notices/
      MarketNotices.tsx
```

The important separation:

```txt
layouts/
  structural components only

features/
  business sections and widgets

App or route component
  composes the page from layouts + feature sections
```

---

## 6. Code example

### Layout components

The layout components are intentionally boring.

```tsx
// layouts/AppShell.tsx

import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return <div className="app-shell">{children}</div>;
}
```

```tsx
// layouts/MainNav.tsx

import type { ReactNode } from 'react';

type MainNavProps = {
  children: ReactNode;
};

export function MainNav({ children }: MainNavProps) {
  return <header className="main-nav">{children}</header>;
}
```

```tsx
// layouts/TradingWorkspace.tsx

import type { ReactNode } from 'react';

type TradingWorkspaceProps = {
  leftNav: ReactNode;
  centerContent: ReactNode;
  rightContent: ReactNode;
};

export function TradingWorkspace({
  leftNav,
  centerContent,
  rightContent,
}: TradingWorkspaceProps) {
  return (
    <main className="trading-workspace">
      <aside className="trading-workspace__left">{leftNav}</aside>
      <section className="trading-workspace__center">{centerContent}</section>
      <aside className="trading-workspace__right">{rightContent}</aside>
    </main>
  );
}
```

```tsx
// layouts/WorkspaceColumns.tsx

import type { ReactNode } from 'react';

export function LeftNav({ children }: { children: ReactNode }) {
  return <div className="left-nav">{children}</div>;
}

export function CenterContent({ children }: { children: ReactNode }) {
  return <div className="center-content">{children}</div>;
}

export function RightContent({ children }: { children: ReactNode }) {
  return <div className="right-content">{children}</div>;
}
```

These components know only about structure.

They do not import `OrderBlotter`, `RiskSummary`, `PortfolioList`, or any other business feature.

---

### Application-level composition

```tsx
// app/App.tsx

import { AppShell } from '@/layouts/AppShell';
import { MainNav } from '@/layouts/MainNav';
import {
  CenterContent,
  LeftNav,
  RightContent,
} from '@/layouts/WorkspaceColumns';
import { TradingWorkspace } from '@/layouts/TradingWorkspace';

import { GlobalSearch } from '@/features/global-search/GlobalSearch';
import { NavigationLinks } from '@/features/navigation/NavigationLinks';
import { UserMenu } from '@/features/navigation/UserMenu';
import { DeskSelector } from '@/features/desk-selection/DeskSelector';
import { PortfolioList } from '@/features/portfolios/PortfolioList';
import { OrderBlotter } from '@/features/orders/OrderBlotter';
import { RecentTrades } from '@/features/trades/RecentTrades';
import { TradeActivityFeed } from '@/features/trades/TradeActivityFeed';
import { MarketNotices } from '@/features/notices/MarketNotices';
import { RiskSummary } from '@/features/risk/RiskSummary';
import { PendingApprovals } from '@/features/approvals/PendingApprovals';

export function App() {
  const user = useCurrentUser();
  const selectedDesk = useSelectedDesk();
  const permissions = usePermissions();

  return (
    <AppShell>
      <MainNav>
        <ProductLogo />
        <GlobalSearch user={user} />
        <NavigationLinks permissions={permissions} />
        <NotificationBell userId={user.id} />
        <CreateActionMenu permissions={permissions} />
        <UserMenu user={user} />
      </MainNav>

      <TradingWorkspace
        leftNav={
          <LeftNav>
            <DeskSelector selectedDesk={selectedDesk} />
            <PortfolioList deskId={selectedDesk.id} />
            <Watchlists userId={user.id} />
          </LeftNav>
        }
        centerContent={
          <CenterContent>
            <OrderBlotter deskId={selectedDesk.id} />
            <RecentTrades deskId={selectedDesk.id} />
            <TradeActivityFeed userId={user.id} />
          </CenterContent>
        }
        rightContent={
          <RightContent>
            <MarketNotices deskId={selectedDesk.id} />
            <RiskSummary deskId={selectedDesk.id} />
            <PendingApprovals permissions={permissions} />
          </RightContent>
        }
      />
    </AppShell>
  );
}
```

The important part is not the exact component names. The important part is the dependency flow:

```txt
App has user, selectedDesk, permissions.
App passes those values directly to the components that need them.
Layout components do not receive or forward data they do not use.
```

That is the main benefit.

---

## 7. Scaling version

For a huge multi-route SPA, `App` should usually not compose every route in detail.

A better structure:

```txt
App
  → global shell
  → route outlet

Route component
  → composes the page/workspace for that route
```

Example:

```tsx
// routes/TradesRoute.tsx

export function TradesRoute() {
  const user = useCurrentUser();
  const selectedDesk = useSelectedDesk();
  const permissions = usePermissions();

  return (
    <TradingWorkspace
      leftNav={
        <LeftNav>
          <DeskSelector selectedDesk={selectedDesk} />
          <PortfolioList deskId={selectedDesk.id} />
        </LeftNav>
      }
      centerContent={
        <CenterContent>
          <OrderBlotter deskId={selectedDesk.id} />
          <RecentTrades deskId={selectedDesk.id} />
        </CenterContent>
      }
      rightContent={
        <RightContent>
          <RiskSummary deskId={selectedDesk.id} />
          <PendingApprovals permissions={permissions} />
        </RightContent>
      }
    />
  );
}
```

Another route can use the same layout differently:

```tsx
// routes/ReportsRoute.tsx

export function ReportsRoute() {
  const user = useCurrentUser();
  const selectedDesk = useSelectedDesk();

  return (
    <TradingWorkspace
      leftNav={
        <LeftNav>
          <DeskSelector selectedDesk={selectedDesk} />
          <ReportFolders userId={user.id} />
        </LeftNav>
      }
      centerContent={
        <CenterContent>
          <ReportBuilder deskId={selectedDesk.id} />
          <SavedReports userId={user.id} />
        </CenterContent>
      }
      rightContent={
        <RightContent>
          <ReportHelp />
          <ReportExportStatus userId={user.id} />
        </RightContent>
      }
    />
  );
}
```

The same layout can support multiple pages because it does not own the business content.

---

## 8. Monorepo / package-level version

If the app becomes huge, feature entries may come from internal packages.

```txt
repo/
  apps/
    financial-spa/
      src/
        routes/
          TradesRoute.tsx

  packages/
    workspace-layout/
      src/
        TradingWorkspace.tsx

    order-blotter/
      src/
        OrderBlotterEntry.tsx

    risk-summary/
      src/
        RiskSummaryEntry.tsx
```

Route composition then looks like this:

```tsx
import {
  TradingWorkspace,
  LeftNav,
  CenterContent,
  RightContent,
} from '@company/workspace-layout';

import { OrderBlotterEntry } from '@company/order-blotter';
import { RiskSummaryEntry } from '@company/risk-summary';
import { PortfolioListEntry } from '@company/portfolio-list';

export function TradesRoute() {
  const user = useCurrentUser();
  const selectedDesk = useSelectedDesk();
  const permissions = usePermissions();

  return (
    <TradingWorkspace
      leftNav={
        <LeftNav>
          <PortfolioListEntry deskId={selectedDesk.id} />
        </LeftNav>
      }
      centerContent={
        <CenterContent>
          <OrderBlotterEntry deskId={selectedDesk.id} />
        </CenterContent>
      }
      rightContent={
        <RightContent>
          <RiskSummaryEntry
            deskId={selectedDesk.id}
            userId={user.id}
            permissions={permissions}
          />
        </RightContent>
      }
    />
  );
}
```

Each package owns its internals.

The route owns the application composition.

---

## 9. Platform relevance

This pattern fits CSR SPA / microFE-style platforms well.

A platform may provide the outer runtime boundary:

```txt
Platform Shell
  → SPA / microFE
```

Inside the SPA, flat application composition helps define the visible app structure:

```txt
SPA / microFE
  → App shell
  → Route composition
  → Layout sections
  → Feature entries
```

It is especially useful when a single SPA contains several large pages or workspaces. The page composition stays visible instead of being scattered across many layout wrappers.

---

## 10. Benefits

### 1. Less prop drilling

Data can go directly from the composition point to the component that needs it.

```tsx
<OrderBlotter deskId={selectedDesk.id} />
<RiskSummary deskId={selectedDesk.id} />
<UserMenu user={user} />
```

No need to pass `selectedDesk` through layout components that only render columns.

---

### 2. Less unnecessary Context

Context is still useful for truly cross-cutting data.

But this pattern reduces cases where Context is added only because the component tree is unnecessarily nested.

---

### 3. Page structure is visible

You can open the route and see the main application sections immediately:

```tsx
<TradingWorkspace
  leftNav={...}
  centerContent={...}
  rightContent={...}
/>
```

This is easier to reason about than discovering the page structure across multiple nested files.

---

### 4. Layouts stay reusable

`TradingWorkspace` can be reused by multiple routes because it does not import route-specific features.

It only owns structure.

---

### 5. Good fit for feature entries and packages

Feature or package entries can be composed explicitly:

```tsx
<OrderBlotterEntry />
<RiskSummaryEntry />
<ReportBuilderEntry />
```

The route does not need to know their internals.

---

## 11. Drawbacks / risks

### 1. The route can become too large

If a route composes 50 tiny components, it becomes noisy.

Prefer composing meaningful sections:

```txt
Good:
  OrderBlotterEntry
  RiskSummaryEntry
  PortfolioListEntry

Too detailed:
  TableHeaderCell
  TableBody
  TableFooter
  ButtonIcon
```

---

### 2. Too many named slots can be awkward

This is fine:

```tsx
<TradingWorkspace
  leftNav={...}
  centerContent={...}
  rightContent={...}
/>
```

This is probably too much:

```tsx
<Workspace
  topLeft={...}
  topRight={...}
  centerHeader={...}
  centerBody={...}
  centerFooter={...}
  rightTop={...}
  rightMiddle={...}
  rightBottom={...}
/>
```

If the layout API has too many slots, split the layout or introduce smaller composition points.

---

### 3. Not every component should be passed from above

This pattern is for application-level composition.

It does not mean every small subcomponent must be created in `App` or route files.

Feature components should still own their internal UI.

---

## 12. Related patterns

### Feature Modules with Public API

Flat composition works well when each feature exposes a clean entry point:

```tsx
import { OrderBlotterEntry } from '@/features/order-blotter';
```

The route composes entries, not feature internals.

---

### Plugin / Extension Points

Flat Composition is explicit:

```tsx
<Workspace rightContent={<RiskSummary />} />
```

Plugin / Extension Points are more dynamic:

```ts
const widgets = registry.getDashboardWidgets();
```

Use flat composition when the page structure is known. Use extension points when many features need to register contributions dynamically.

---

### Compound Components

Compound Components are usually component-level composition:

```tsx
<Tabs>
  <Tabs.List />
  <Tabs.Panel />
</Tabs>
```

Flat Application Composition is route/page-level composition:

```tsx
<TradingWorkspace
  leftNav={...}
  centerContent={...}
  rightContent={...}
/>
```

They are related, but they solve different scales of composition.

---

## 13. Key takeaway

```txt
Do not hide the application behind a deep tree of wrappers.
Compose meaningful application sections where the data already exists.
Let layout components arrange UI, not own business content.
```

A short slide phrase:

```txt
Build the application, not just the markup.
```
