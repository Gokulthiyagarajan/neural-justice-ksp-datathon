import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/Layout/AppLayout';
import { ErrorBoundary } from '@/components/Common/ErrorBoundary';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';
import { ToastProvider } from '@/components/Common/Toast';
import { useAuthStore } from '@/store/authStore';
import { LoginFlow } from '@/auth/LoginFlow';
import { canAccessRoute } from '@/config/navConfig';

const DashboardRouter = lazy(() => import('@/pages/dashboards/DashboardRouter').then(m => ({ default: m.DashboardRouter })));
const FIROperations = lazy(() => import('@/pages/FIROperations').then(m => ({ default: m.FIROperations })));
const FIRDetailPage = lazy(() => import('@/pages/FIRDetailPage').then(m => ({ default: m.FIRDetailPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));

// CP Command Center pages
const CPTimeline = lazy(() => import('@/pages/cp/CPTimeline').then(m => ({ default: m.CPTimeline })));
const CPGISMap = lazy(() => import('@/pages/cp/CPGISMap').then(m => ({ default: m.CPGISMap })));
const CPDistricts = lazy(() => import('@/pages/cp/CPDistricts').then(m => ({ default: m.CPDistricts })));
const CPStations = lazy(() => import('@/pages/cp/CPStations').then(m => ({ default: m.CPStations })));
const CPAnalytics2 = lazy(() => import('@/pages/cp/CPAnalytics').then(m => ({ default: m.CPAnalytics })));
const CPIntelligence = lazy(() => import('@/pages/cp/CPIntelligence').then(m => ({ default: m.CPIntelligence })));
const CPRisk = lazy(() => import('@/pages/cp/CPRisk').then(m => ({ default: m.CPRisk })));
const CPNetworks = lazy(() => import('@/pages/cp/CPNetworks').then(m => ({ default: m.CPNetworks })));
const CPForecast = lazy(() => import('@/pages/cp/CPForecast').then(m => ({ default: m.CPForecast })));
const CPWarnings = lazy(() => import('@/pages/cp/CPWarnings').then(m => ({ default: m.CPWarnings })));
const CPFinance = lazy(() => import('@/pages/cp/CPFinance').then(m => ({ default: m.CPFinance })));
const CPCoordination = lazy(() => import('@/pages/cp/CPCoordination').then(m => ({ default: m.CPCoordination })));
const CPAISituation = lazy(() => import('@/pages/cp/CPAISituation').then(m => ({ default: m.CPAISituation })));
const CPMedia = lazy(() => import('@/pages/cp/CPMedia').then(m => ({ default: m.CPMedia })));
const CPOfficers = lazy(() => import('@/pages/cp/CPOfficers').then(m => ({ default: m.CPOfficers })));
const CPReports = lazy(() => import('@/pages/cp/CPReports').then(m => ({ default: m.CPReports })));
const CPAudit = lazy(() => import('@/pages/cp/CPAudit').then(m => ({ default: m.CPAudit })));
const CPCases = lazy(() => import('@/pages/cp/CPCases').then(m => ({ default: m.CPCases })));
const CPOrders = lazy(() => import('@/pages/cp/CPOrders').then(m => ({ default: m.CPOrders })));
const CPActivity = lazy(() => import('@/pages/cp/CPActivity').then(m => ({ default: m.CPActivity })));
const CPNotifications = lazy(() => import('@/pages/cp/CPNotifications').then(m => ({ default: m.CPNotifications })));
const CPPatrol = lazy(() => import('@/pages/cp/CPPatrol').then(m => ({ default: m.CPPatrol })));
const CPPatterns = lazy(() => import('@/pages/cp/CPPatterns').then(m => ({ default: m.CPPatterns })));
const BehaviorProfilesPage = lazy(() => import('@/pages/BehaviorProfilesPage').then(m => ({ default: m.BehaviorProfilesPage })));
const CrimePatternsPage = lazy(() => import('@/pages/CrimePatternsPage').then(m => ({ default: m.CrimePatternsPage })));
const EarlyWarningsPage = lazy(() => import('@/pages/EarlyWarningsPage').then(m => ({ default: m.EarlyWarningsPage })));
const PatrolRecommendationsPage = lazy(() => import('@/pages/PatrolRecommendationsPage').then(m => ({ default: m.PatrolRecommendationsPage })));
const ForecastPage = lazy(() => import('@/pages/ForecastPage').then(m => ({ default: m.ForecastPage })));
const GeoCommandPage = lazy(() => import('@/pages/GeoCommandPage').then(m => ({ default: m.GeoCommandPage })));
const DistrictViewPage = lazy(() => import('@/pages/DistrictViewPage').then(m => ({ default: m.DistrictViewPage })));
const StationViewPage = lazy(() => import('@/pages/StationViewPage').then(m => ({ default: m.StationViewPage })));
const NetworkAnalysisPage = lazy(() => import('@/pages/NetworkAnalysisPage').then(m => ({ default: m.NetworkAnalysisPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PCMyCases = lazy(() => import('@/pages/pc/PCMyCases').then(m => ({ default: m.PCMyCases })));
const PCStation = lazy(() => import('@/pages/pc/PCStation').then(m => ({ default: m.PCStation })));
const PCActivity = lazy(() => import('@/pages/pc/PCActivity').then(m => ({ default: m.PCActivity })));
const PCNotifications = lazy(() => import('@/pages/pc/PCNotifications').then(m => ({ default: m.PCNotifications })));
const PCCaseDetail = lazy(() => import('@/pages/pc/PCCaseDetail').then(m => ({ default: m.PCCaseDetail })));
const PCCaseDiary = lazy(() => import('@/pages/pc/PCCaseDiary').then(m => ({ default: m.PCCaseDiary })));
const PCOrders = lazy(() => import('@/pages/pc/PCOrders').then(m => ({ default: m.PCOrders })));

// PSI pages
const PSIMyCases = lazy(() => import('@/pages/psi/PSIMyCases').then(m => ({ default: m.PSIMyCases })));
const PSIPatterns = lazy(() => import('@/pages/psi/PSIPatterns').then(m => ({ default: m.PSIPatterns })));
const PSIForecast = lazy(() => import('@/pages/psi/PSIForecast').then(m => ({ default: m.PSIForecast })));

// SP pages (SUPERVISOR)
const SPStations = lazy(() => import('@/pages/sp/SPStations').then(m => ({ default: m.SPStations })));
const SPStationDetail = lazy(() => import('@/pages/sp/SPStationDetail').then(m => ({ default: m.SPStationDetail })));
const SPMap = lazy(() => import('@/pages/sp/SPMap').then(m => ({ default: m.SPMap })));
const SPPatrol = lazy(() => import('@/pages/sp/SPPatrol').then(m => ({ default: m.SPPatrol })));
const SPFinance = lazy(() => import('@/pages/sp/SPFinance').then(m => ({ default: m.SPFinance })));
const SPWarnings = lazy(() => import('@/pages/sp/SPWarnings').then(m => ({ default: m.SPWarnings })));
const SPAnalytics = lazy(() => import('@/pages/sp/SPAnalytics').then(m => ({ default: m.SPAnalytics })));
const SPForecast = lazy(() => import('@/pages/sp/SPForecast').then(m => ({ default: m.SPForecast })));
const SPCases = lazy(() => import('@/pages/sp/SPCases').then(m => ({ default: m.SPCases })));
const SPOfficers = lazy(() => import('@/pages/sp/SPOfficers').then(m => ({ default: m.SPOfficers })));
const SPActivity = lazy(() => import('@/pages/sp/SPActivity').then(m => ({ default: m.SPActivity })));
const SPOrders = lazy(() => import('@/pages/sp/SPOrders').then(m => ({ default: m.SPOrders })));
const SPNotifications = lazy(() => import('@/pages/sp/SPNotifications').then(m => ({ default: m.SPNotifications })));
const SPPatterns = lazy(() => import('@/pages/sp/SPPatterns').then(m => ({ default: m.SPPatterns })));
const SPNetwork = lazy(() => import('@/pages/sp/SPNetwork').then(m => ({ default: m.SPNetwork })));

// PI pages
const PIDashboard = lazy(() => import('@/pages/dashboards/PIDashboard').then(m => ({ default: m.PIDashboard })));
const PICases = lazy(() => import('@/pages/pi/PICases').then(m => ({ default: m.PICases })));
const PICaseDetail = lazy(() => import('@/pages/pi/PICaseDetail').then(m => ({ default: m.PICaseDetail })));
const PINetwork = lazy(() => import('@/pages/pi/PINetwork').then(m => ({ default: m.PINetwork })));
// PI pages — extended
const PIPatterns = lazy(() => import('@/pages/pi/PIPatterns').then(m => ({ default: m.PIPatterns })));
const PIWarnings = lazy(() => import('@/pages/pi/PIWarnings').then(m => ({ default: m.PIWarnings })));
const PIProfiles = lazy(() => import('@/pages/pi/PIProfiles').then(m => ({ default: m.PIProfiles })));
const PIGeo = lazy(() => import('@/pages/pi/PIGeo').then(m => ({ default: m.PIGeo })));
const PIOrders = lazy(() => import('@/pages/pi/PIOrders').then(m => ({ default: m.PIOrders })));
const PIActivity = lazy(() => import('@/pages/pi/PIActivity').then(m => ({ default: m.PIActivity })));
const PINotifications = lazy(() => import('@/pages/pi/PINotifications').then(m => ({ default: m.PINotifications })));
const PIFinance = lazy(() => import('@/pages/pi/PIFinance').then(m => ({ default: m.PIFinance })));
const PIStation = lazy(() => import('@/pages/pi/PIStation').then(m => ({ default: m.PIStation })));
const PIForecast = lazy(() => import('@/pages/pi/PIForecast').then(m => ({ default: m.PIForecast })));

/**
 * Role-aware redirect — sends users to the correct role-specific path
 * based on their authenticated role. Falls back to PC-level (OFFICER).
 */
function RoleAwareRedirect({ pc, psi, pi, sp }: {
  pc: string; psi?: string; pi?: string; sp?: string
}) {
  const role = useAuthStore((s) => s.user?.roles?.[0] ?? 'OFFICER');
  const target =
    role === 'ANALYST'      ? (psi ?? pc) :
    role === 'INVESTIGATOR' ? (pi ?? pc) :
    role === 'SUPERVISOR'   ? (sp ?? pc) :
    role === 'SUPER_ADMIN'  ? (sp ?? pc) : pc;
  return <Navigate to={target} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return <LoadingSpinner message="Verifying session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * RoleRoute — gates page access by the user's role.
 * Must be INSIDE ProtectedRoute (auth is already verified).
 * Redirects to / if the user's role doesn't have access to this route.
 */
function RoleRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const userRoles = user?.roles || ['OFFICER'];

  if (!canAccessRoute(location.pathname, userRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    {children}
  </Suspense>
);

/** Role-aware station redirect: PI goes to /pi/cases, PSI goes to /psi/station, SP+ goes to /sp/stations */
function StationRedirect() {
  const role = useAuthStore((s) => s.user?.roles?.[0] ?? 'OFFICER');
  const target =
    ['SUPER_ADMIN', 'SUPERVISOR'].includes(role) ? '/sp/stations' :
    role === 'INVESTIGATOR' ? '/pi/station' :
    role === 'ANALYST' ? '/psi/station' :
    '/pc/station';
  return <Navigate to={target} replace />;
}

export default function App() {
  // Open BloomSearch on ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('bloom-search-focus'));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginFlow />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleRoute><SuspenseWrapper><DashboardRouter /></SuspenseWrapper></RoleRoute>} />
          <Route path="firs" element={<RoleRoute><SuspenseWrapper><FIROperations /></SuspenseWrapper></RoleRoute>} />
          <Route path="firs/:crimeNo" element={<RoleRoute><SuspenseWrapper><FIRDetailPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="analytics" element={<RoleRoute><SuspenseWrapper><AnalyticsPage /></SuspenseWrapper></RoleRoute>} />

          <Route path="intelligence/profiles" element={<RoleRoute><SuspenseWrapper><BehaviorProfilesPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="intelligence/patterns" element={<RoleRoute><SuspenseWrapper><CrimePatternsPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="intelligence/warnings" element={<RoleRoute><SuspenseWrapper><EarlyWarningsPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="intelligence/patrol" element={<RoleRoute><SuspenseWrapper><PatrolRecommendationsPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="intelligence/forecast" element={<RoleRoute><SuspenseWrapper><ForecastPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="geo" element={<RoleRoute><SuspenseWrapper><GeoCommandPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="geo/district" element={<RoleRoute><SuspenseWrapper><DistrictViewPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="geo/district/:districtId" element={<RoleRoute><SuspenseWrapper><DistrictViewPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="geo/station" element={<Navigate to="/geo/station/1" replace />} />
          <Route path="geo/station/:stationId" element={<RoleRoute><SuspenseWrapper><StationViewPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="intelligence/networks" element={<RoleRoute><SuspenseWrapper><NetworkAnalysisPage /></SuspenseWrapper></RoleRoute>} />
          <Route path="settings" element={<RoleRoute><SuspenseWrapper><SettingsPage /></SuspenseWrapper></RoleRoute>} />
          {/* ═══════════════════════════════════════════════════════════
           *  CANONICAL ROUTES — role-aware redirects.
           *  Each role sees the correct role-specific page via
           *  RoleAwareRedirect. No hardcoded role-to-page mapping.
           *  ═══════════════════════════════════════════════════════════ */}
          <Route path="cases" element={<RoleAwareRedirect pc="/pc/my-cases" psi="/psi/my-cases" pi="/pi/cases" sp="/sp/cases" />} />
          <Route path="activity" element={<RoleAwareRedirect pc="/pc/activity" psi="/psi/activity" pi="/pi/activity" sp="/sp/activity" />} />
          <Route path="orders" element={<RoleAwareRedirect pc="/pc/orders" psi="/psi/orders" pi="/pi/orders" sp="/sp/orders" />} />
          <Route path="notifications" element={<RoleAwareRedirect pc="/pc/notifications" psi="/psi/notifications" pi="/pi/notifications" sp="/sp/notifications" />} />

          {/* Legacy PC routes */}
          <Route path="pc/my-cases" element={<RoleRoute><SuspenseWrapper><PCMyCases /></SuspenseWrapper></RoleRoute>} />
          <Route path="pc/station" element={<RoleRoute><SuspenseWrapper><PCStation /></SuspenseWrapper></RoleRoute>} />
          <Route path="pc/activity" element={<RoleRoute><SuspenseWrapper><PCActivity /></SuspenseWrapper></RoleRoute>} />
          <Route path="pc/cases/:crimeNo" element={<RoleRoute><SuspenseWrapper><PCCaseDetail /></SuspenseWrapper></RoleRoute>} />
          <Route path="pc/cases/:crimeNo/diary" element={<RoleRoute><SuspenseWrapper><PCCaseDiary /></SuspenseWrapper></RoleRoute>} />
          <Route path="pc/orders" element={<RoleRoute><SuspenseWrapper><PCOrders /></SuspenseWrapper></RoleRoute>} />
          <Route path="pc/notifications" element={<RoleRoute><SuspenseWrapper><PCNotifications /></SuspenseWrapper></RoleRoute>} />

          {/* ── Canonical routes (legacy redirects, now role-aware) ─── */}
          <Route path="patterns" element={<RoleAwareRedirect pc="/psi/patterns" psi="/psi/patterns" pi="/pi/patterns" sp="/sp/patterns" />} />
          <Route path="forecast" element={<RoleAwareRedirect pc="/psi/forecast" psi="/psi/forecast" pi="/pi/forecast" sp="/sp/forecast" />} />
          <Route path="stations" element={<StationRedirect />} />
          <Route path="districts" element={<Navigate to="/cp/districts" replace />} />
          <Route path="risk" element={<RoleAwareRedirect pc="/psi/warnings" psi="/psi/warnings" pi="/pi/warnings" sp="/sp/warnings" />} />
          <Route path="network" element={<RoleAwareRedirect pc="/psi/network" psi="/psi/network" pi="/pi/network" sp="/sp/network" />} />
          <Route path="profiles" element={<RoleAwareRedirect pc="/" psi="/" pi="/pi/profiles" sp="/sp/officers" />} />
          <Route path="patrol" element={<RoleAwareRedirect pc="/sp/patrol" psi="/sp/patrol" pi="/sp/patrol" sp="/sp/patrol" />} />
          <Route path="finance" element={<RoleAwareRedirect pc="/psi/finance" psi="/psi/finance" pi="/pi/finance" sp="/sp/finance" />} />
          <Route path="warnings" element={<RoleAwareRedirect pc="/psi/warnings" psi="/psi/warnings" pi="/pi/warnings" sp="/sp/warnings" />} />
          <Route path="officers" element={<Navigate to="/sp/officers" replace />} />
          <Route path="audit" element={<Navigate to="/cp/audit" replace />} />

          {/* PSI routes (ANALYST) */}
          <Route path="psi/my-cases" element={<RoleRoute><SuspenseWrapper><PSIMyCases /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/patterns" element={<RoleRoute><SuspenseWrapper><PSIPatterns /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/forecast" element={<RoleRoute><SuspenseWrapper><PSIForecast /></SuspenseWrapper></RoleRoute>} />

          {/* PSI shared-ownership routes — reuse PC component for station-level pages */}
          <Route path="psi/station" element={<RoleRoute><SuspenseWrapper><PCStation /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/orders" element={<RoleRoute><SuspenseWrapper><PCOrders /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/activity" element={<RoleRoute><SuspenseWrapper><PCActivity /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/notifications" element={<RoleRoute><SuspenseWrapper><PCNotifications /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/network" element={<RoleRoute><SuspenseWrapper><PINetwork /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/warnings" element={<RoleRoute><SuspenseWrapper><PIWarnings /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/finance" element={<RoleRoute><SuspenseWrapper><SPFinance /></SuspenseWrapper></RoleRoute>} />
          <Route path="psi/geo" element={<RoleRoute><SuspenseWrapper><PIGeo /></SuspenseWrapper></RoleRoute>} />

          {/* SP routes (SUPERVISOR) */}
          <Route path="sp/stations" element={<RoleRoute><SuspenseWrapper><SPStations /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/station/:id" element={<RoleRoute><SuspenseWrapper><SPStationDetail /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/map" element={<RoleRoute><SuspenseWrapper><SPMap /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/patrol" element={<RoleRoute><SuspenseWrapper><SPPatrol /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/finance" element={<RoleRoute><SuspenseWrapper><SPFinance /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/warnings" element={<RoleRoute><SuspenseWrapper><SPWarnings /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/analytics" element={<RoleRoute><SuspenseWrapper><SPAnalytics /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/forecast" element={<RoleRoute><SuspenseWrapper><SPForecast /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/cases" element={<RoleRoute><SuspenseWrapper><SPCases /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/officers" element={<RoleRoute><SuspenseWrapper><SPOfficers /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/activity" element={<RoleRoute><SuspenseWrapper><SPActivity /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/orders" element={<RoleRoute><SuspenseWrapper><SPOrders /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/notifications" element={<RoleRoute><SuspenseWrapper><SPNotifications /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/patterns" element={<RoleRoute><SuspenseWrapper><SPPatterns /></SuspenseWrapper></RoleRoute>} />
          <Route path="sp/network" element={<RoleRoute><SuspenseWrapper><SPNetwork /></SuspenseWrapper></RoleRoute>} />

          {/* PI routes (INVESTIGATOR) */}
          <Route path="pi/dashboard" element={<RoleRoute><SuspenseWrapper><PIDashboard /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/cases" element={<RoleRoute><SuspenseWrapper><PICases /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/case/:crimeNo" element={<RoleRoute><SuspenseWrapper><PICaseDetail /></SuspenseWrapper></RoleRoute>} />
          <Route path="ai" element={<Navigate to="/" replace />} />
          <Route path="pi/copilot" element={<Navigate to="/pi/dashboard" replace />} />
          <Route path="pi/network" element={<RoleRoute><SuspenseWrapper><PINetwork /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/patterns" element={<RoleRoute><SuspenseWrapper><PIPatterns /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/warnings" element={<RoleRoute><SuspenseWrapper><PIWarnings /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/profiles" element={<RoleRoute><SuspenseWrapper><PIProfiles /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/geo" element={<RoleRoute><SuspenseWrapper><PIGeo /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/orders" element={<RoleRoute><SuspenseWrapper><PIOrders /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/activity" element={<RoleRoute><SuspenseWrapper><PIActivity /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/notifications" element={<RoleRoute><SuspenseWrapper><PINotifications /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/finance" element={<RoleRoute><SuspenseWrapper><PIFinance /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/station" element={<RoleRoute><SuspenseWrapper><PIStation /></SuspenseWrapper></RoleRoute>} />
          <Route path="pi/forecast" element={<RoleRoute><SuspenseWrapper><PIForecast /></SuspenseWrapper></RoleRoute>} />

          {/* ── CP Command Center routes (SUPER_ADMIN only) ─────────────── */}
          {/* CP Dashboard is handled by the index route (DashboardRouter → CPDashboard for SUPER_ADMIN) */}
          <Route path="cp/dashboard" element={<Navigate to="/" replace />} />
          <Route path="cp/timeline" element={<RoleRoute><SuspenseWrapper><CPTimeline /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/gis-map" element={<RoleRoute><SuspenseWrapper><CPGISMap /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/districts" element={<RoleRoute><SuspenseWrapper><CPDistricts /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/stations" element={<RoleRoute><SuspenseWrapper><CPStations /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/analytics" element={<RoleRoute><SuspenseWrapper><CPAnalytics2 /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/intelligence" element={<RoleRoute><SuspenseWrapper><CPIntelligence /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/risk" element={<RoleRoute><SuspenseWrapper><CPRisk /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/networks" element={<RoleRoute><SuspenseWrapper><CPNetworks /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/forecast" element={<RoleRoute><SuspenseWrapper><CPForecast /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/warnings" element={<RoleRoute><SuspenseWrapper><CPWarnings /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/finance" element={<RoleRoute><SuspenseWrapper><CPFinance /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/coordination" element={<RoleRoute><SuspenseWrapper><CPCoordination /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/ai-situation" element={<RoleRoute><SuspenseWrapper><CPAISituation /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/media" element={<RoleRoute><SuspenseWrapper><CPMedia /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/officers" element={<RoleRoute><SuspenseWrapper><CPOfficers /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/reports" element={<RoleRoute><SuspenseWrapper><CPReports /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/audit" element={<RoleRoute><SuspenseWrapper><CPAudit /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/cases" element={<RoleRoute><SuspenseWrapper><CPCases /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/orders" element={<RoleRoute><SuspenseWrapper><CPOrders /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/activity" element={<RoleRoute><SuspenseWrapper><CPActivity /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/notifications" element={<RoleRoute><SuspenseWrapper><CPNotifications /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/patrol" element={<RoleRoute><SuspenseWrapper><CPPatrol /></SuspenseWrapper></RoleRoute>} />
          <Route path="cp/patterns" element={<RoleRoute><SuspenseWrapper><CPPatterns /></SuspenseWrapper></RoleRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ToastProvider>
    </ErrorBoundary>
  );
}
