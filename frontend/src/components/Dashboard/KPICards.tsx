import {
  FileText, Activity, TrendingUp, ShieldAlert, Scale, Brain,
} from 'lucide-react';
import KPICard from './KPICard';
import type { TrendPoint, InsightItem, EarlyWarning } from '@/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { KPI_CARDS, canAccess } from '@/config/navConfig';

interface KPICardsData {
  caseVolume: number;
  openCases: number;
  activeCases: number;
  criticalWarnings: number;
  crimeIndex: number;
  predictionAccuracy: number | null;
  trendData: TrendPoint[];
  insights: InsightItem[];
  warnings: EarlyWarning[];
}

interface KPICardsProps {
  data: KPICardsData;
  isLoading: boolean;
}

/** Map from metricKey to the lucide icon used for rendering. */
const ICON_MAP: Record<string, typeof FileText> = {
  todays_firs: FileText,
  active_investigations: Scale,
  crime_index: TrendingUp,
  ai_alerts: ShieldAlert,
  active_cases: Activity,
  prediction_accuracy: Brain,
};

/** Map from metricKey to the accent color. */
const COLOR_MAP: Record<string, string> = {
  todays_firs: 'var(--accent-cyan)',
  active_investigations: '#8b5cf6',
  crime_index: 'var(--alert-amber)',
  ai_alerts: 'var(--alert-red)',
  active_cases: '#06b6d4',
  prediction_accuracy: 'var(--alert-green)',
};

export function KPICards({ data, isLoading }: KPICardsProps) {
  const { t } = useTranslation();
  const { getPrimaryRole } = useAuth();
  const userRole = getPrimaryRole();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-4 animate-pulse">
            <div className="h-3 w-20 bg-bg-tertiary rounded mb-3" />
            <div className="h-8 w-16 bg-bg-tertiary rounded mb-2" />
            <div className="h-6 w-full bg-bg-tertiary rounded mb-2" />
            <div className="h-2 w-24 bg-bg-tertiary rounded" />
          </div>
        ))}
      </div>
    );
  }

  const sparklineData = data.trendData.map(t => t.count).slice(-14);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /** All possible KPI configs — matched 1:1 with KPI_CARDS entries by metricKey. */
  const allKpiConfigs: Record<string, {
    label: string;
    value: number | null;
    trend: number;
    status: 'active' | 'warning' | 'normal';
    confidence: number;
    aiInsight: string;
    exhibitId: string;
    copilotCardId: string;
  }> = {
    todays_firs: {
      label: t('kpi.todaysFirs'),
      value: data.caseVolume,
      trend: 12,
      status: data.caseVolume > 20 ? 'warning' : 'active',
      confidence: 94,
      aiInsight: t('kpi.fromLastWeek', { count: Math.round(data.caseVolume * 0.15) }),
      exhibitId: 'EXHIBIT A',
      copilotCardId: 'todays-firs',
    },
    active_investigations: {
      label: t('kpi.activeInvestigations'),
      value: data.openCases,
      trend: -5,
      status: 'active',
      confidence: 89,
      aiInsight: t('kpi.assignedPending', { assigned: Math.round(data.openCases * 0.4), pending: Math.round(data.openCases * 0.6) }),
      exhibitId: 'EXHIBIT B',
      copilotCardId: 'active-investigations',
    },
    crime_index: {
      label: t('kpi.crimeIndex'),
      value: data.crimeIndex,
      trend: 3,
      status: data.crimeIndex > 150 ? 'warning' : 'normal',
      confidence: 87,
      aiInsight: t('kpi.drivingIncrease'),
      exhibitId: 'EXHIBIT C',
      copilotCardId: 'crime-index',
    },
    ai_alerts: {
      label: t('kpi.aiAlerts'),
      value: data.criticalWarnings,
      trend: data.criticalWarnings > 2 ? 40 : -20,
      status: data.criticalWarnings > 2 ? 'warning' : 'normal',
      confidence: 96,
      aiInsight: t('kpi.requireAttention', { count: data.criticalWarnings }),
      exhibitId: 'EXHIBIT D',
      copilotCardId: 'ai-alerts',
    },
    active_cases: {
      label: t('kpi.activeCases'),
      value: data.activeCases,
      trend: -2,
      status: 'normal',
      confidence: 92,
      aiInsight: t('kpi.investigationPhase'),
      exhibitId: 'EXHIBIT E',
      copilotCardId: 'active-cases',
    },
    prediction_accuracy: {
      label: t('kpi.predictionAccuracy'),
      value: data.predictionAccuracy,
      trend: 1,
      status: 'active',
      confidence: 97,
      aiInsight: t('kpi.modelPerforming'),
      exhibitId: 'EXHIBIT F',
      copilotCardId: 'prediction-accuracy',
    },
  };

  /** Filter cards based on role — only show cards the user's role has access to. */
  const visibleCards = KPI_CARDS
    .filter(kpiCard => canAccess(userRole, kpiCard.minRole))
    .map(kpiCard => {
      const config = allKpiConfigs[kpiCard.metricKey];
      if (!config) return null;
      return {
        ...config,
        label: kpiCard.label,
        icon: ICON_MAP[kpiCard.metricKey] ?? FileText,
        accentColor: COLOR_MAP[kpiCard.metricKey] ?? 'var(--accent-cyan)',
        metricKey: kpiCard.metricKey,
      };
    })
    .filter(Boolean);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${
      visibleCards.length <= 2 ? 'xl:grid-cols-2' :
      visibleCards.length <= 4 ? 'xl:grid-cols-4' :
      'xl:grid-cols-6'
    }`}>
      {visibleCards.map((kpi, idx) => (
        <div key={kpi!.metricKey} className="animate-fade-in-up-stagger" style={{ animationDelay: `${idx * 60}ms` }}>
          <KPICard
            label={kpi!.label}
            value={kpi!.value}
            trend={kpi!.trend}
            sparklineData={sparklineData}
            status={kpi!.status}
            confidence={kpi!.confidence}
            lastUpdated={timeStr}
            aiInsight={kpi!.aiInsight}
            icon={kpi!.icon}
            accentColor={kpi!.accentColor}
            exhibitId={kpi!.exhibitId}
            copilotCardId={kpi!.copilotCardId}
          />
        </div>
      ))}
    </div>
  );
}
