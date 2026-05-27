import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ReportsView } from './internal/ReportsView';
import { selectReportsView } from './model/reportsSelectors';
import {
  reportsGenerateRequested,
  reportsGenerateSucceeded,
  reportsPortfolioFilterChanged,
  reportsReportTypeChanged,
  reportsReset,
  type ReportType,
} from './model/reportsSlice';

export function ReportsEntry() {
  const dispatch = useDispatch();
  const reportsState = useSelector(selectReportsView);

  useEffect(() => {
    if (reportsState.generationStatus !== 'generating') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch(reportsGenerateSucceeded());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [dispatch, reportsState.generationStatus]);

  return (
    <ReportsView
      state={reportsState}
      onReportTypeChange={(reportType: ReportType) =>
        dispatch(reportsReportTypeChanged(reportType))
      }
      onPortfolioFilterChange={(portfolioId) =>
        dispatch(reportsPortfolioFilterChanged(portfolioId))
      }
      onGenerate={() => dispatch(reportsGenerateRequested())}
      onReset={() => dispatch(reportsReset())}
    />
  );
}
