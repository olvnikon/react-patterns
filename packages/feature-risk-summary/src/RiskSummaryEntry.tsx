type RiskSummaryEntryProps = {
  selectedPortfolioId: string;
};

export function RiskSummaryEntry({
  selectedPortfolioId,
}: RiskSummaryEntryProps) {
  return (
    <article className="workspace-panel">
      <h2>Risk Summary</h2>
      <p>Generic placeholder metrics for {selectedPortfolioId}.</p>
    </article>
  );
}
