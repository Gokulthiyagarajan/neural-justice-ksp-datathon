import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';

interface CrimeTypeChartProps {
  data: { name: string; count: number }[];
}

const COLORS = [
  'var(--accent-cyan)',
  'var(--accent-purple)',
  'var(--alert-red)',
  'var(--alert-amber)',
  'var(--accent-green)',
  '#f472b6',
  '#60a5fa',
  '#a78bfa',
];

export function CrimeTypeChart({ data }: CrimeTypeChartProps) {
  const { t } = useTranslation();
  if (data.length === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-4">{t('analytics.distribution')}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [value.toLocaleString(), t('chart.cases')]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
