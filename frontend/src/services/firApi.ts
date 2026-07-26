import { api } from '@/api/client';
import type {
  FIRDetail,
  FIRFilters,
  FIRListResponse,
  FIRFilterOptions,
} from '@/types/fir.types';

export interface GetFIRsParams extends Partial<FIRFilters> {
  page?: number;
  limit?: number;
}

export async function getFIRs(filters: GetFIRsParams = {}): Promise<FIRListResponse> {
  return api.get<FIRListResponse>('/fir-ops', filters as Record<string, string | number | boolean | undefined>);
}

export async function getFIRDetail(firId: string): Promise<FIRDetail> {
  return api.get<FIRDetail>(`/fir-ops/${encodeURIComponent(firId)}`);
}

export async function getFilterOptions(): Promise<FIRFilterOptions> {
  return api.get<FIRFilterOptions>('/fir-ops/filters/options');
}
