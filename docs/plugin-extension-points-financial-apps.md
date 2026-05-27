# Pattern: Plugin / Extension Points

## 1. One sentence

**Plugin / Extension Points** let a host page define *where* other features may contribute UI or behavior, without the host directly importing and hardcoding every contributing feature.

In simple words:

```txt
Host defines a contract.
Features provide contributions.
Application composition decides what is active.
```

---

## 2. Problem

In large React applications, some pages naturally become “central” pages:

```txt
Dashboard
Trade details
Client details
Portfolio overview
Report builder
Admin console
Settings page
```

Many independent features want to add something to those pages:

```txt
Dashboard
  open orders widget
  portfolio exposure widget
  risk alerts widget
  pending approvals widget
  market notices widget
```

A naive implementation makes the host page import everything:

```tsx
// pages/dashboard/DashboardPage.tsx

import { OpenOrdersWidget } from '@/features/open-orders/OpenOrdersWidget';
import { RiskAlertsWidget } from '@/features/risk-alerts/RiskAlertsWidget';
import { PendingApprovalsWidget } from '@/features/pending-approvals/PendingApprovalsWidget';
import { MarketNoticesWidget } from '@/features/market-notices/MarketNoticesWidget';

export function DashboardPage() {
  return (
    <section>
      <h1>Dashboard</h1>

      <OpenOrdersWidget />
      <RiskAlertsWidget />
      <PendingApprovalsWidget />
      <MarketNoticesWidget />
    </section>
  );
}
```

This works at first, but it does not scale well.

Problems:

```txt
Dashboard knows every feature.
Every new widget requires editing DashboardPage.
Optional features become messy.
Permission-based UI becomes scattered.
The host page becomes a merge-conflict hotspot.
The host owns too much feature knowledge.
```

The page becomes a “feature magnet”.

---

## 3. Use case / avoid when

### Use it when

Use this pattern when many features need to contribute to the same host:

```txt
dashboard widgets
details-page actions
client/portfolio tabs
toolbar buttons
context-menu items
admin panels
settings sections
report builder tools
navigation entries
```

Good examples in financial applications:

```txt
Portfolio overview:
  exposure widget
  recent transactions widget
  risk summary widget
  alerts widget

Order details:
  cancel action
  amend action
  duplicate action
  export action
  audit log action

Client details:
  profile tab
  accounts tab
  documents tab
  activity tab
  suitability tab
```

### Avoid when

Avoid this pattern when:

```txt
the page is small
one team owns all content
contributions are fixed and unlikely to change
simple explicit composition is clearer
the extension point would hide important control flow
```

For example, this does not need a plugin system:

```tsx
function SimpleProfilePage() {
  return (
    <>
      <ProfileHeader />
      <ProfileForm />
    </>
  );
}
```

---

## 4. Mental model

```txt
Application composition
  ↓
collects active extensions

Host page
  ↓
renders extension point

Feature A
  ↓
contributes widget/action/tab

Feature B
  ↓
contributes widget/action/tab
```

The dependency direction changes.

Without extension points:

```txt
Host imports every feature.
```

With extension points:

```txt
Features implement host contract.
Composition layer decides which contributions are active.
```

The host is stable. Features are pluggable.

---

## 5. File structure

Example: dashboard widget extension point.

```txt
src/
  pages/
    dashboard/
      DashboardPage.tsx
      dashboardExtensions.ts

  features/
    open-orders/
      OpenOrdersWidget.tsx
      openOrders.dashboardExtension.tsx

    risk-alerts/
      RiskAlertsWidget.tsx
      riskAlerts.dashboardExtension.tsx

    pending-approvals/
      PendingApprovalsWidget.tsx
      pendingApprovals.dashboardExtension.tsx

  app/
    dashboardExtensionRegistry.ts
    App.tsx
```

Important separation:

```txt
pages/dashboard/
  defines the extension contract and renders extensions

features/*/
  provide concrete extensions

app/
  decides which extensions are active
```

---

## 6. Code example

### Step 1: Define the extension contract

```tsx
// pages/dashboard/dashboardExtensions.ts

import type { ReactNode } from 'react';

export type DashboardWidgetExtension = {
  id: string;
  title: string;
  order?: number;
  isVisible?: () => boolean;
  render: () => ReactNode;
};
```

This says:

```txt
A dashboard widget has an id, title, optional order,
optional visibility rule, and render function.
```

The dashboard page does not need to know which feature provides it.

---

### Step 2: Host page renders the extension point

```tsx
// pages/dashboard/DashboardPage.tsx

import type { DashboardWidgetExtension } from './dashboardExtensions';

type DashboardPageProps = {
  widgets: DashboardWidgetExtension[];
};

export function DashboardPage({ widgets }: DashboardPageProps) {
  const visibleWidgets = widgets
    .filter(widget => widget.isVisible?.() ?? true)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <section>
      <h1>Dashboard</h1>

      <div className="dashboard-grid">
        {visibleWidgets.map(widget => (
          <article key={widget.id} className="dashboard-widget">
            <h2>{widget.title}</h2>
            {widget.render()}
          </article>
        ))}
      </div>
    </section>
  );
}
```

The dashboard only knows:

```txt
I can render dashboard widgets.
```

It does not import:

```txt
OpenOrdersWidget
RiskAlertsWidget
PendingApprovalsWidget
```

---

### Step 3: Feature provides an extension

```tsx
// features/open-orders/OpenOrdersWidget.tsx

export function OpenOrdersWidget() {
  return (
    <div>
      <p>Open orders: 24</p>
      <button>View orders</button>
    </div>
  );
}
```

```tsx
// features/open-orders/openOrders.dashboardExtension.tsx

import type { DashboardWidgetExtension } from '@/pages/dashboard/dashboardExtensions';
import { OpenOrdersWidget } from './OpenOrdersWidget';

export const openOrdersDashboardExtension: DashboardWidgetExtension = {
  id: 'open-orders',
  title: 'Open Orders',
  order: 10,
  render: () => <OpenOrdersWidget />,
};
```

The feature says:

```txt
I can contribute a dashboard widget.
```

---

### Step 4: Another feature provides another extension

```tsx
// features/risk-alerts/RiskAlertsWidget.tsx

export function RiskAlertsWidget() {
  return (
    <div>
      <p>High priority alerts: 3</p>
      <button>Review alerts</button>
    </div>
  );
}
```

```tsx
// features/risk-alerts/riskAlerts.dashboardExtension.tsx

import type { DashboardWidgetExtension } from '@/pages/dashboard/dashboardExtensions';
import { RiskAlertsWidget } from './RiskAlertsWidget';

export const riskAlertsDashboardExtension: DashboardWidgetExtension = {
  id: 'risk-alerts',
  title: 'Risk Alerts',
  order: 20,
  render: () => <RiskAlertsWidget />,
};
```

---

### Step 5: Application composition collects extensions

```tsx
// app/dashboardExtensionRegistry.ts

import { openOrdersDashboardExtension } from '@/features/open-orders/openOrders.dashboardExtension';
import { riskAlertsDashboardExtension } from '@/features/risk-alerts/riskAlerts.dashboardExtension';
import { pendingApprovalsDashboardExtension } from '@/features/pending-approvals/pendingApprovals.dashboardExtension';

export const dashboardWidgetExtensions = [
  openOrdersDashboardExtension,
  riskAlertsDashboardExtension,
  pendingApprovalsDashboardExtension,
];
```

Then the app passes them to the host page:

```tsx
// app/App.tsx

import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { dashboardWidgetExtensions } from './dashboardExtensionRegistry';

export function App() {
  return (
    <DashboardPage widgets={dashboardWidgetExtensions} />
  );
}
```

Now adding a new dashboard widget usually means:

```txt
1. Create widget inside feature.
2. Export extension object.
3. Register extension in one registry/composition place.
```

You do not edit `DashboardPage`.

---

## 7. Scaling version

The previous example is intentionally simple.

In a larger application, extension points usually need context.

For example, dashboard widgets may need:

```txt
current user
permissions
selected portfolio
selected desk
runtime config
```

A better extension contract can accept context:

```tsx
// pages/dashboard/dashboardExtensions.ts

import type { ReactNode } from 'react';

export type DashboardContext = {
  userId: string;
  selectedPortfolioId?: string;
  permissions: {
    canViewRisk: boolean;
    canViewApprovals: boolean;
  };
};

export type DashboardWidgetExtension = {
  id: string;
  title: string;
  order?: number;
  isVisible?: (context: DashboardContext) => boolean;
  render: (context: DashboardContext) => ReactNode;
};
```

Host page:

```tsx
// pages/dashboard/DashboardPage.tsx

import type {
  DashboardContext,
  DashboardWidgetExtension,
} from './dashboardExtensions';

type DashboardPageProps = {
  context: DashboardContext;
  widgets: DashboardWidgetExtension[];
};

export function DashboardPage({
  context,
  widgets,
}: DashboardPageProps) {
  const visibleWidgets = widgets
    .filter(widget => widget.isVisible?.(context) ?? true)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <section>
      <h1>Dashboard</h1>

      <div className="dashboard-grid">
        {visibleWidgets.map(widget => (
          <article key={widget.id}>
            <h2>{widget.title}</h2>
            {widget.render(context)}
          </article>
        ))}
      </div>
    </section>
  );
}
```

Feature extension:

```tsx
// features/risk-alerts/riskAlerts.dashboardExtension.tsx

import type { DashboardWidgetExtension } from '@/pages/dashboard/dashboardExtensions';
import { RiskAlertsWidget } from './RiskAlertsWidget';

export const riskAlertsDashboardExtension: DashboardWidgetExtension = {
  id: 'risk-alerts',
  title: 'Risk Alerts',
  order: 20,

  isVisible: context => context.permissions.canViewRisk,

  render: context => (
    <RiskAlertsWidget
      portfolioId={context.selectedPortfolioId}
    />
  ),
};
```

This keeps the host generic while still allowing feature-specific behavior.

---

## 8. Platform relevance

This pattern is useful in large financial applications because many screens become shared business workspaces.

Typical examples:

```txt
dashboard with multiple widgets
portfolio overview with optional panels
order details with action extensions
client overview with tab extensions
admin page with configurable sections
report builder with tool plugins
```

It also fits well with platform-style applications:

```txt
The platform or host page defines extension points.
Feature modules contribute extensions.
Runtime config, permissions, and feature flags decide what is active.
```

This is useful when the application must support:

```txt
different roles
different products
different regions
gradual rollout
optional capabilities
large teams contributing to the same page
```

The important part is that the extension contract should be local and explicit.

Good:

```txt
DashboardWidgetExtension
OrderDetailsActionExtension
ClientDetailsTabExtension
```

Bad:

```txt
GenericPluginThatCanDoAnything
```

---

## 9. Benefits

### 1. Host page stays stable

The host page renders a known extension contract.

It does not need to import every feature directly.

```txt
DashboardPage does not know every widget.
OrderDetailsPage does not know every action.
ClientDetailsPage does not know every tab.
```

---

### 2. Feature contributions are isolated

Each feature owns its contribution:

```txt
features/risk-alerts/riskAlerts.dashboardExtension.tsx
features/pending-approvals/pendingApprovals.dashboardExtension.tsx
```

This improves ownership and reduces accidental coupling.

---

### 3. Optional features are easier

Extensions can be controlled by:

```txt
permissions
feature flags
runtime config
user role
selected product/context
```

Example:

```ts
isVisible: context => context.permissions.canViewApprovals
```

---

### 4. Reduced merge conflicts

Without extension points, many teams edit the same host page.

With extension points, teams usually add or change their own extension files.

---

### 5. Clear application contracts

Extension points make supported customization points explicit:

```txt
Dashboard supports widgets.
Order details supports actions.
Client overview supports tabs.
```

That is easier to reason about than random imports inside host pages.

---

## 10. Drawbacks / risks

### 1. Can hide the page structure

If everything is registered dynamically, it may become harder to see what the page contains.

Mitigation:

```txt
Keep a simple registry file.
Avoid magical auto-discovery unless there is a strong need.
```

Good:

```ts
export const dashboardWidgetExtensions = [
  openOrdersDashboardExtension,
  riskAlertsDashboardExtension,
];
```

This is explicit and readable.

---

### 2. Contracts can become too generic

Avoid one universal plugin interface.

Bad:

```ts
type Plugin = {
  id: string;
  render: () => ReactNode;
  execute?: () => void;
  metadata?: Record<string, unknown>;
};
```

Better:

```ts
type DashboardWidgetExtension = { ... };
type OrderDetailsActionExtension = { ... };
type ClientDetailsTabExtension = { ... };
```

Specific extension points are easier to type and maintain.

---

### 3. Ordering and conflicts need rules

If many extensions contribute to the same place, you need decisions about:

```txt
ordering
duplicates
visibility
permissions
empty states
error boundaries
```

Example:

```ts
order: 20
```

Simple ordering is usually enough.

---

### 4. Can be overkill

If a page has only two fixed sections, explicit composition is better.

Use extension points when there is real variability or multi-team contribution.

---

### 5. Extension failures can affect the host

A broken widget should not break the whole page.

For larger apps, consider wrapping extension rendering:

```tsx
<ExtensionErrorBoundary extensionId={widget.id}>
  {widget.render(context)}
</ExtensionErrorBoundary>
```

---

## 11. Related patterns

### Feature Modules with Public API

Extensions work best when each feature exposes only a clear public contribution:

```ts
export { riskAlertsDashboardExtension } from './riskAlerts.dashboardExtension';
```

This avoids the host importing internal feature components directly.

---

### Flat Application Composition

Flat Composition is explicit:

```tsx
<Dashboard
  left={<PortfolioList />}
  center={<OrderBlotter />}
  right={<RiskSummary />}
/>
```

Plugin / Extension Points are more registry-based:

```tsx
<Dashboard widgets={dashboardWidgetExtensions} />
```

Use Flat Composition when the structure is known and stable.

Use Extension Points when the host should allow optional or independently owned contributions.

---

### Dependency Inversion

This pattern is another form of dependency inversion.

Instead of:

```txt
Host depends on every feature.
```

you get:

```txt
Host depends on extension contract.
Feature depends on host contract.
Composition layer wires them together.
```

---

### Feature Flags and Permissions

Extension points often combine naturally with runtime conditions:

```ts
isVisible: context => context.permissions.canViewRisk
```

or:

```ts
isVisible: context => context.flags.enableNewRiskWidget
```

---

## 12. Key takeaway

```txt
Use Plugin / Extension Points when many independent features need to contribute to the same host page.
```

The host should define a small, specific contract.

Features should implement that contract.

Application composition should decide which contributions are active.

Short version for a slide:

```txt
Host defines the slot.
Features bring the content.
Composition decides what is enabled.
```
