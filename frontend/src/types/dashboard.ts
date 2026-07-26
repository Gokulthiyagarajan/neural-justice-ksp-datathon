export interface KpiCard {
  label: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  [key: string]: any;
}

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  district: string;
  station: string;
  crimeType: string;
  status: string;
  severity: string;
  searchQuery: string;
}
