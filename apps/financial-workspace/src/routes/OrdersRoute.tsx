import { ActivityFeedEntry } from '@demo/feature-activity-feed';
import { OrdersEntry } from '@demo/feature-orders';
import { PortfolioSummaryEntry } from '@demo/feature-portfolio-summary';
import { RiskSummaryEntry } from '@demo/feature-risk-summary';
import {
  CenterContent,
  LeftNav,
  RightContent,
  WorkspaceLayout,
} from '@demo/ui-layouts';

export function OrdersRoute() {
  const selectedDeskId = 'DESK-GLOBAL';
  const selectedPortfolioId = 'PF-001';
  const userId = 'USR-DEMO';

  return (
    <WorkspaceLayout
      leftNav={
        <LeftNav>
          <PortfolioSummaryEntry selectedPortfolioId={selectedPortfolioId} />
        </LeftNav>
      }
      centerContent={
        <CenterContent>
          <section className="route-note" aria-label="Orders route pattern">
            <div className="pattern-tags">
              <span className="pattern-tag">Flat composition</span>
              <span className="pattern-tag">Slot layout</span>
              <span className="pattern-tag">Public feature entries</span>
            </div>
            <p>
              This route composes the left, center, and right workspace regions
              directly.
            </p>
          </section>
          <OrdersEntry
            selectedDeskId={selectedDeskId}
            selectedPortfolioId={selectedPortfolioId}
          />
        </CenterContent>
      }
      rightContent={
        <RightContent>
          <RiskSummaryEntry selectedPortfolioId={selectedPortfolioId} />
          <ActivityFeedEntry userId={userId} />
        </RightContent>
      }
    />
  );
}
