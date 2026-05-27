const dashboardItems = [
  {
    href: '/orders',
    label: 'Orders',
    value: '12',
    summary: 'Open generic orders',
  },
  {
    href: '/orders/ORD-1001/approval',
    label: 'Approvals',
    value: '3',
    summary: 'Pending demo reviews',
  },
  {
    href: '/reports',
    label: 'Reports',
    value: '5',
    summary: 'Saved generic views',
  },
  {
    href: '/orders',
    label: 'Portfolios',
    value: '2',
    summary: 'Mock portfolios',
  },
];

export function DashboardEntry() {
  return (
    <section className="page-section">
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>Demo Desk Overview</h1>
      </div>
      <p>
        Local placeholder data for orders, approvals, reports, and portfolios.
      </p>
      <div className="summary-grid">
        {dashboardItems.map((item) => (
          <a className="summary-card" href={item.href} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.summary}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
