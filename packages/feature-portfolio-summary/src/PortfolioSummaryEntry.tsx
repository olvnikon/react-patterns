type PortfolioSummaryEntryProps = {
  selectedPortfolioId: string;
};

export function PortfolioSummaryEntry({
  selectedPortfolioId,
}: PortfolioSummaryEntryProps) {
  return (
    <article className="workspace-panel">
      <h2>Portfolio Summary</h2>
      <p>{selectedPortfolioId}</p>
    </article>
  );
}
