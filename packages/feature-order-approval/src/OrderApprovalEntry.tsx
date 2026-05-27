type OrderApprovalEntryProps = {
  orderId: string;
};

export function OrderApprovalEntry({ orderId }: OrderApprovalEntryProps) {
  return (
    <section className="page-section">
      <div>
        <p className="eyebrow">Approval</p>
        <h1>Order Approval</h1>
      </div>
      <article className="workspace-panel">
        <h2>{orderId}</h2>
        <p>Approval workflow shell with local placeholder content.</p>
        <ul className="placeholder-list">
          <li>
            <span>Portfolio</span>
            <strong>PF-001</strong>
          </li>
          <li>
            <span>Status</span>
            <strong>Pending review</strong>
          </li>
        </ul>
      </article>
    </section>
  );
}
