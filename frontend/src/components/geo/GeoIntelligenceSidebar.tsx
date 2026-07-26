import { useState } from 'react';
import { Gauge, TrendingUp, TrendingDown, AlertTriangle, Users, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GeoIntelligenceSidebarProps {
  crimeIndex: number;
  hotspots: Array<{
    id: string;
    name: string;
    count: number;
    change: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  patrolCoverage: number;
  availableUnits: number;
  responseReadiness: number;
  recentAlerts: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  aiInsights: string;
}

export function GeoIntelligenceSidebar(props: GeoIntelligenceSidebarProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'hotspots' | 'patrol' | 'alerts' | 'insights'>('hotspots');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-nj-critical/20 text-nj-critical';
      case 'high': return 'bg-nj-critical/10 text-nj-critical';
      case 'medium': return 'bg-nj-warning/20 text-nj-warning';
      case 'low': return 'bg-nj-success/20 text-nj-success';
      default: return 'bg-text-secondary/20 text-text-secondary';
    }
  };

  const getChangeIcon = (change: number) => {
    return change > 0 ? <TrendingUp size={14} className="text-nj-critical" /> : <TrendingDown size={14} className="text-nj-success" />;
  };

  return (
    <div className="w-80 bg-bg-card rounded-xl p-4 border border-border-primary/50 shadow-lg">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t('geo.intelligence_center')}
        </h2>
        <p className="text-sm text-text-secondary">
          {t('geo.realtime_insights')}
        </p>
      </div>

      {/* Crime Index Gauge */}
      <div className="mb-6 p-4 bg-bg-secondary rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">{t('geo.crime_index')}</span>
          <Gauge size={16} className="text-nj-info" />
        </div>
        <div className="relative w-24 h-24 mx-auto mb-2">
          <div className="w-full h-full rounded-full border-8 border-nj-info/20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-nj-info flex items-center justify-center">
              <span className="text-lg font-bold text-text-primary">{props.crimeIndex}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          {getChangeIcon(5)}
          <span className="text-xs text-text-secondary">+5% vs last week</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('hotspots')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'hotspots' ? 'bg-nj-info/20 text-nj-info' : 'bg-bg-secondary text-text-secondary hover:bg-hover-bg'}`}
        >
          {t('geo.hotspots')}
        </button>
        <button
          onClick={() => setActiveTab('patrol')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'patrol' ? 'bg-nj-info/20 text-nj-info' : 'bg-bg-secondary text-text-secondary hover:bg-hover-bg'}`}
        >
          {t('geo.patrol')}
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'alerts' ? 'bg-nj-info/20 text-nj-info' : 'bg-bg-secondary text-text-secondary hover:bg-hover-bg'}`}
        >
          {t('geo.alerts')}
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'insights' ? 'bg-nj-info/20 text-nj-info' : 'bg-bg-secondary text-text-secondary hover:bg-hover-bg'}`}
        >
          {t('geo.insights')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'hotspots' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">{t('geo.todays_hotspots')}</h3>
          {props.hotspots.slice(0, 3).map((hotspot) => (
            <div key={hotspot.id} className="p-3 bg-bg-secondary rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-text-primary">{hotspot.name}</span>
                <span className="text-sm text-text-secondary">{hotspot.count}</span>
              </div>
              <div className="flex items-center gap-2">
                {getChangeIcon(hotspot.change)}
                <span className="text-xs text-text-secondary">
                  {hotspot.change > 0 ? `+${hotspot.change}%` : `${hotspot.change}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'patrol' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">{t('geo.patrol_coverage')}</h3>
          <div className="p-3 bg-bg-secondary rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">{t('geo.coverage')}</span>
              <span className="text-sm font-medium text-text-primary">{props.patrolCoverage}%</span>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-2">
              <div
                className="h-2 rounded-full bg-nj-success"
                style={{ width: `${props.patrolCoverage}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-bg-secondary rounded-lg text-center">
              <Users size={16} className="mx-auto mb-1 text-text-secondary" />
              <div className="text-xs text-text-secondary">{t('geo.available_units')}</div>
              <div className="text-sm font-medium text-text-primary">{props.availableUnits}</div>
            </div>
            <div className="p-2 bg-bg-secondary rounded-lg text-center">
              <ShieldCheck size={16} className="mx-auto mb-1 text-text-secondary" />
              <div className="text-xs text-text-secondary">{t('geo.response_readiness')}</div>
              <div className="text-sm font-medium text-text-primary">{props.responseReadiness}%</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-semibold text-text-primary">{t('geo.recent_alerts')}</h3>
          {props.recentAlerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className={`p-3 rounded-lg ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} />
                <span className="text-sm font-medium text-text-primary">{alert.type}</span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{alert.message}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">{alert.time}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">{t('geo.ai_insights')}</h3>
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-sm text-text-primary">{props.aiInsights}</p>
          </div>
        </div>
      )}
    </div>
  );
}