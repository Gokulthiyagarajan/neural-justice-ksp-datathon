import { api } from './client'

export interface SearchResult {
    id: string
    title: string
    description: string
    type: string
    date: string
    station: string
    district: string
    status: string
}

export async function searchFirs(query: string, limit: number = 10): Promise<SearchResult[]> {
    return api.get<SearchResult[]>(`/search`, { q: query, limit })
}

export async function searchCases(query: string, limit: number = 10): Promise<SearchResult[]> {
    return api.get<SearchResult[]>(`/cases`, { q: query, limit })
}

export async function searchOfficers(query: string, limit: number = 10): Promise<SearchResult[]> {
    return api.get<SearchResult[]>(`/officers`, { q: query, limit })
}