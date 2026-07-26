import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, AlertTriangle, ThumbsUp } from 'lucide-react';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { Modal } from '@/components/Common/Modal';
import type { RiskScoreResponse } from '@/types';

interface RiskScoreCardProps {
  data: RiskScoreResponse;
  onSubmitFeedback?: (data: { officer_assessment: number; officer_notes: string }) => void;
}

function getScoreColor(score: number): string {
  if (score <= 20) return '#22C55E';
  if (score <= 40) return '#EAB308';
  if (score <= 60) return '#F97316';
  if (score <= 80) return '#EF4444';
  return '#991B1B';
}

function getScoreLabel(score: number): string {
  if (score <= 20) return 'Low';
  if (score <= 40) return 'Moderate';
  if (score <= 60) return 'Elevated';
  if (score <= 80) return 'High';
  return 'Critical';
}

export function RiskScoreCard({ data, onSubmitFeedback }: RiskScoreCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackScore, setFeedbackScore] = useState(50);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  const score = data.calibrated_score ?? data.score;
  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">{t('risk.score')}</h3>
          <p className="text-sm text-text-tertiary mt-0.5">
            {data.entity_name || `${data.entity_type}: ${data.entity_id}`}
          </p>
        </div>
        <StatusBadge status={data.review_status} size="sm" />
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--glass-border)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color }}>{Math.round(score)}</span>
            <span className="text-xs text-text-tertiary">{getScoreLabel(score)}</span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <span className="text-text-tertiary">{t('risk.scoreBucket')} </span>
            <span className="font-medium text-text-primary">{data.score_bucket}</span>
          </div>
          <div>
            <span className="text-text-tertiary">{t('risk.confidenceLabel')} </span>
            <span className="font-medium text-text-primary">
              {data.confidence_interval.lower.toFixed(0)} – {data.confidence_interval.upper.toFixed(0)}
            </span>
          </div>
          <div>
            <span className="text-text-tertiary">{t('risk.model')} </span>
            <span className="font-medium text-text-primary font-mono text-xs">{data.model}</span>
          </div>
          <div>
            <span className="text-text-tertiary">{t('risk.generated')} </span>
            <span className="font-medium text-text-primary">
              {new Date(data.generated_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {data.explanation?.plain_english && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(0, 212, 255, 0.08)', borderColor: 'var(--glass-border)' }}>
          <p className="text-sm" style={{ color: 'var(--accent-cyan)' }}>{data.explanation.plain_english}</p>
        </div>
      )}

      {data.explanation?.contributions && data.explanation.contributions.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium transition-colors" style={{ color: 'var(--accent-cyan)' }}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? 'Hide' : 'Show'} SHAP Contributions
          </button>
          {expanded && (
            <div className="mt-3 space-y-2">
              {data.explanation.contributions.map((c, i) => {
                const maxAbs = Math.max(...data.explanation!.contributions.map((x) => Math.abs(x.shap_value)), 0.01);
                const pct = (Math.abs(c.shap_value) / maxAbs) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary w-32 truncate shrink-0">{c.name}</span>
                    <div className="flex-1 h-5 bg-bg-tertiary rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.direction === 'increases' ? 'bg-red-400' : 'bg-green-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-tertiary w-16 text-right">{c.shap_value.toFixed(3)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border-secondary">
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--alert-amber)' }}>
          <AlertTriangle className="w-3 h-3" />
          <span>{t('risk.requiresReview')}</span>
        </div>
        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-bg-tertiary text-text-secondary hover:bg-hover-bg transition-colors"
        >
          <ThumbsUp className="w-3 h-3" />
          Feedback
        </button>
      </div>

      <Modal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        title={t('risk.scoreFeedback')}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowFeedback(false)}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover-bg rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSubmitFeedback?.({ officer_assessment: feedbackScore, officer_notes: feedbackNotes });
                setShowFeedback(false);
              }}
              className="px-4 py-2 text-sm font-medium bg-[rgba(0,212,255,0.15)] text-white rounded-lg hover:bg-[rgba(0,212,255,0.08)]"
            >
              Submit
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            How accurate do you find this score? Your feedback helps improve the model.
          </p>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Your Assessment (0-100): {feedbackScore}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={feedbackScore}
              onChange={(e) => setFeedbackScore(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">{t('risk.notes')}</label>
            <textarea
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder={t('risk.feedbackPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
