import type { ReportsViewState } from '../model/reportsSelectors';
import type { ReportType } from '../model/reportsSlice';
import { ReportFilters } from './ReportFilters';
import { ReportResults } from './ReportResults';

type ReportsViewProps = {
  state: ReportsViewState;
  onReportTypeChange: (reportType: ReportType) => void;
  onPortfolioFilterChange: (portfolioId: string) => void;
  onGenerate: () => void;
  onReset: () => void;
};

export function ReportsView({
  state,
  onReportTypeChange,
  onPortfolioFilterChange,
  onGenerate,
  onReset,
}: ReportsViewProps) {
  return (
    <section className="page-section">
      <div>
        <p className="eyebrow">Reports</p>
        <h1>Reports Workspace</h1>
      </div>
      <div className="workspace-grid">
        <ReportFilters
          selectedReportType={state.selectedReportType}
          portfolioId={state.portfolioId}
          reportTypes={state.availableReportTypes}
          onReportTypeChange={onReportTypeChange}
          onPortfolioFilterChange={onPortfolioFilterChange}
        />
        <ReportResults
          state={state}
          onGenerate={onGenerate}
          onReset={onReset}
        />
      </div>
    </section>
  );
}
