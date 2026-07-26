import { TrendingUp, TrendingDown, AlertCircle, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedCounter from './AnimatedCounter';
import Sparkline from './Sparkline';

interface KPICardProps {
  label: string;
  value: number | null;
  trend: number;
  sparklineData: number[];
  status: 'active' | 'warning' | 'normal';
  confidence: number;
  lastUpdated: string;
  aiInsight: string;
  icon: LucideIcon;
  accentColor: string;
  /** Case-file exhibit identifier, e.g. "EXHIBIT A" */
  exhibitId?: string;
  /** AI Copilot card reference ID for dashboard highlighting */
  copilotCardId?: string;
}

export default function KPICard({
  label, value, trend, sparklineData, status,
  confidence, lastUpdated, aiInsight, icon: Icon, accentColor,
  exhibitId, copilotCardId,
}: KPICardProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isUp = trend >= 0;

  return (
    <div
      className={`group relative bg-bg-card border border-border-primary rounded-xl
        transition-all duration-300 ease-out
        hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(62,110,150,0.08)]
        cursor-default overflow-hidden
        motion-reduce:transition-none motion-reduce:hover:transform-none
        ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
      style={{ animationDelay: '0ms' }}
      {...(copilotCardId ? { 'data-copilot-card': copilotCardId } : {})}
    >
      {/* ── Case-file spine (left edge, 3px colored bar) ── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300 group-hover:w-[4px]"
        style={{
          backgroundColor: accentColor,
          boxShadow: `0 0 8px ${accentColor}40`,
        }}
      />

      <div className="p-4">
        {/* Top accent glow on hover */}
        <div
          className="absolute top-0 left-1/4 right-1/4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" style={{ color: accentColor }} />
            </div>
            <span className="text-xs font-medium text-text-secondary">{label}</span>
          </div>
          {status === 'warning' && (
            <AlertCircle className="w-3.5 h-3.5 text-accent-amber animate-pulse-glow" />
          )}
        </div>

        <div className="flex items-end gap-2 mb-2">
          {value === null ? (
            <span className="text-lg font-bold text-text-primary tracking-tight">
              {t('kpi.prototype', 'Prototype')}
            </span>
          ) : (
            <AnimatedCounter
              value={value}
              className="text-2xl font-bold text-text-primary tabular-nums tracking-tight"
              duration={1200}
            />
          )}
          <div className={`flex items-center gap-0.5 text-[11px] font-medium mb-1
            ${isUp ? 'text-accent-green' : 'text-accent-red'}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="tabular-nums">{Math.abs(trend)}%</span>
          </div>
        </div>

        <div className="mb-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
          <Sparkline data={sparklineData} stroke={accentColor} />
        </div>

        <div className="flex items-center justify-between text-[10px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: confidence > 80 ? '#22c55e' : confidence > 50 ? '#f59e0b' : '#ef4444',
                boxShadow: confidence > 80 ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
              }}
            />
            {t('kpi.confidenceAi', { confidence })}
          </span>
          <span className="font-mono">{lastUpdated}</span>
        </div>
        <p className="mt-1.5 text-[10px] text-text-tertiary italic leading-tight line-clamp-1 group-hover:text-text-secondary transition-colors duration-300">
          {t('kpi.aiPrefix')}: {aiInsight}
        </p>
      </div>

      {/* ── Exhibit tag (bottom-right forensic evidence label) ── */}
      {exhibitId && (
        <div
          className="absolute bottom-2 right-2 px-1.5 py-[1px] rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
          style={{
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}25`,
          }}
        >
          <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: accentColor }}>
            {exhibitId}
          </span>
        </div>
      )}

      {/* Hover glow effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 1px ${accentColor}30`,
        }}
      />
    </div>
  );
}
