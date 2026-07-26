import { ApiError } from '@/api/client'

export class ApiClient {
    static BASE_URL = '/api'
    
    static getToken(): string | null {
        return localStorage.getItem('auth_token')
    }
    
    static getUrl(url: string): string {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
        }
        if (url.startsWith('/api')) {
            return url
        }
        return `${this.BASE_URL}${url}`
    }
    
    static async request<T>(method: string, path: string, data?: Record<string, any>, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
        let url = this.getUrl(path)
        
        if (params) {
            const query = new URLSearchParams()
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    query.append(key, String(value))
                }
            }
            url += `?${query.toString()}`
        }
        
        const token = this.getToken()
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }
        
        const config: RequestInit = {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
        }
        
        const response = await fetch(url, config)
        
        if (response.status === 401) {
            localStorage.removeItem('auth_token')
            throw new ApiError('UNAUTHORIZED', 'Session expired')
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const code = errorData?.error?.code || 'UNKNOWN'
            const message = errorData?.error?.message || errorData?.detail || response.statusText
            throw new ApiError(code, message, response.status)
        }
        
        return response.json()
    }
    
    static get = <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => 
        this.request<T>('GET', path, undefined, params)
    
    static post = <T>(path: string, data?: Record<string, any>, params?: Record<string, string | number | boolean | undefined>) => 
        this.request<T>('POST', path, data, params)
    
    static put = <T>(path: string, data?: Record<string, any>, params?: Record<string, string | number | boolean | undefined>) => 
        this.request<T>('PUT', path, data, params)
    
    static patch = <T>(path: string, data?: Record<string, any>, params?: Record<string, string | number | boolean | undefined>) => 
        this.request<T>('PATCH', path, data, params)
    
    static delete = <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => 
        this.request<T>('DELETE', path, undefined, params)
}