export type CopilotState = 'collapsed' | 'expanded' | 'thinking' | 'speaking';

export type DashboardCard =
  | 'todays-firs'
  | 'active-investigations'
  | 'crime-index'
  | 'ai-alerts'
  | 'active-cases'
  | 'prediction-accuracy'
  | 'intelligence-feed'
  | 'early-warning'
  | 'incident-map'
  | 'trend-chart';

export interface ChartPayload {
  type: 'line' | 'bar' | 'pie';
  labels: string[];
  data: number[];
  colors?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citedCards?: DashboardCard[];
  chartData?: ChartPayload;
  confidence?: number;
  streaming?: boolean;
}

export interface ConversationSession {
  id: string;
  title: string;
  messageCount: number;
  timestamp: Date;
}

export interface DashboardSnapshot {
  caseVolume: number;
  openCases: number;
  activeCases: number;
  criticalWarnings: number;
  crimeIndex: number;
  predictionAccuracy: number | null;
  divisionCount: number;
  districtCount: number;
  stationCount: number;
}

import type { KSPRole } from '@/config/navConfig';

export type UserRole = KSPRole;
