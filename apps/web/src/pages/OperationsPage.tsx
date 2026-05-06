import { EmptyState } from '../components/primitives/EmptyState';
import { SurfaceCard } from '../components/primitives/SurfaceCard';

export function OperationsPage(): JSX.Element {
  return (
    <div className="page-stack">
      <SurfaceCard className="operations-rail">
        <h2>Operations foundation</h2>
        <p>
          This route exists so Stage 8 can prove navigation, protection, and shell
          behavior without prematurely building orders or promocode workflows.
        </p>
      </SurfaceCard>
      <SurfaceCard>
        <EmptyState
          title="Operations UI is intentionally deferred"
          description="Stage 10 will own create-order, apply-promocode, and management interactions. This placeholder keeps the route map real without leaking future implementation."
        />
      </SurfaceCard>
    </div>
  );
}
