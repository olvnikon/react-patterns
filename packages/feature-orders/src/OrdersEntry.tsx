type OrdersEntryProps = {
  selectedDeskId: string;
  selectedPortfolioId: string;
};

export function OrdersEntry({
  selectedDeskId,
  selectedPortfolioId,
}: OrdersEntryProps) {
  return (
    <section className="page-section">
      <div>
        <p className="eyebrow">Orders</p>
        <h1>Orders Workspace</h1>
      </div>
      <div className="workspace-grid">
        <article className="workspace-panel">
          <h2>Selection</h2>
          <dl>
            <div>
              <dt>Desk</dt>
              <dd>{selectedDeskId}</dd>
            </div>
            <div>
              <dt>Portfolio</dt>
              <dd>{selectedPortfolioId}</dd>
            </div>
          </dl>
        </article>
        <article className="workspace-panel">
          <h2>Order Blotter</h2>
          <ul className="placeholder-list">
            <li>
              <span>ORD-1001</span>
              <strong>Pending</strong>
            </li>
            <li>
              <span>ORD-1002</span>
              <strong>Reviewed</strong>
            </li>
          </ul>
        </article>
        <article className="workspace-panel">
          <h2>Recent Activity</h2>
          <ul className="placeholder-list">
            <li>
              <span>Order reviewed</span>
              <strong>Today</strong>
            </li>
            <li>
              <span>Portfolio viewed</span>
              <strong>Today</strong>
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
