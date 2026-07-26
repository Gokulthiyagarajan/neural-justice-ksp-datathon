/**
 * DashboardRouter — switches between role-specific dashboards.
 *
 * CP (SUPER_ADMIN)   → CPDashboard — state-wide command center
 * SP (SUPERVISOR)     → SPDashboard — district command view
 * PI (INVESTIGATOR)   → PIDashboard — active investigation workspace
 * PSI (ANALYST)       → PSIDashboard — analytics desk
 * PC (OFFICER)        → PCDashboard — field officer daily duty
 *
 * This is the index route component used in App.tsx.
 */
import { useAuth } from '@/hooks/useAuth';
import { CPDashboard } from './CPDashboard';
import { SPDashboard } from './SPDashboard';
import { PIDashboard } from './PIDashboard';
import { PSIDashboard } from './PSIDashboard';
import { PCDashboard } from './PCDashboard';

export function DashboardRouter() {
  const { getPrimaryRole } = useAuth();
  const role = getPrimaryRole();

  if (role === 'SUPER_ADMIN') {
    return <CPDashboard />;
  }

  if (role === 'SUPERVISOR') {
    return <SPDashboard />;
  }

  if (role === 'INVESTIGATOR') {
    return <PIDashboard />;
  }

  if (role === 'ANALYST') {
    return <PSIDashboard />;
  }

  if (role === 'OFFICER') {
    return <PCDashboard />;
  }

  // Fallback shouldn't normally be reached, but safety net
  return <PCDashboard />;
}
