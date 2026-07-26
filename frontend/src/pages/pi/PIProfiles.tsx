import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { Search, User, FolderOpen, ExternalLink, Bot, AlertTriangle, Users as UsersIcon, Link as LinkIcon } from 'lucide-react';
import { authHeaders } from '@/utils/authHeaders';
import { isDemoMode, demoRiskData } from '@/services/demoData';

interface CriminalProfile {
  id: string;
  name: string;
  alias?: string;
  age: number;
  gender?: string;
  risk_score: number;
  primary_crime: string;
  status: string;
  last_active: string;
  fir_count: number;
  network_size: number;
  location: string;
}

interface ProfileDetail {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  risk_score?: number;
  address?: string;
  crime_type?: string;
  firs?: { crime_no: string; crime_type: string; status: string }[];
  associates?: { name: string; relation: string }[];
  mo_patterns?: { pattern: string; description: string }[];
}

export function PIProfiles() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [profiles, setProfiles] = useState<CriminalProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<CriminalProfile | null>(null)
  const [profileDetail, setProfileDetail] = useState<ProfileDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoMode()) {
        const demo = demoRiskData();
        setProfiles(demo.accused.map((a: any) => ({
          id: a.id || 'ra-demo',
          name: a.name || 'Unknown',
          alias: undefined,
          age: 0,
          gender: undefined,
          risk_score: a.risk_score ?? 0,
          primary_crime: a.crime_type || 'Unknown',
          status: a.review_status || 'active',
          last_active: '—',
          fir_count: a.fir_count || 0,
          network_size: a.shap_features?.length || 0,
          location: 'Bengaluru Urban',
        })));
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/intelligence/v1/risk/accused?station_id=${user?.station_id}&limit=50`,
        { headers: authHeaders() })
      const data = await res.json()
      const accused = data?.accused ?? data ?? []
      setProfiles(accused.map((a: any) => ({
        id: a.id || a.accused_id,
        name: a.name || 'Unknown',
        alias: a.alias,
        age: a.age || 0,
        gender: a.gender,
        risk_score: a.risk_score ?? 0,
        primary_crime: a.crime_type || a.primary_crime || 'Unknown',
        status: a.status || a.review_status || 'active',
        last_active: a.last_active || '—',
        fir_count: a.fir_count || 0,
        network_size: a.network_size || a.degree || 0,
        location: a.location || a.address || 'Unknown',
      })))
    } catch {
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [user?.station_id])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  const handleSelectProfile = async (profile: CriminalProfile) => {
    setSelectedProfile(profile)
    setDetailLoading(true)
    setProfileDetail(null)
    try {
      if (isDemoMode()) {
        setProfileDetail({
          id: profile.id,
          name: profile.name,
          age: profile.age || 0,
          risk_score: profile.risk_score,
          crime_type: profile.primary_crime,
          firs: [{ crime_no: 'KSP-2026-042', crime_type: profile.primary_crime, status: 'active' }],
          associates: [{ name: 'Venkatesh G', relation: 'co-accused' }],
          mo_patterns: [{ pattern: 'Chain Snatching', description: 'Targets solo pedestrians in market areas during evening hours' }],
        });
        setDetailLoading(false);
        return;
      }
      const res = await fetch(`/api/intelligence/v1/profile/${profile.id}`,
        { headers: authHeaders() })
      const data = await res.json()
      // Map profile API response to ProfileDetail format
      setProfileDetail({
        id: data.accused_id || profile.id,
        name: data.accused_name || profile.name,
        age: profile.age || 0,
        gender: profile.gender,
        risk_score: profile.risk_score,
        address: profile.location,
        crime_type: profile.primary_crime,
        firs: (data.preferred_crime_types ?? []).map((ct: string, i: number) => ({
          crime_no: `FIR-${profile.id}-${i + 1}`,
          crime_type: ct,
          status: 'active',
        })),
        associates: (data.known_associates ?? []).map((a: any) => ({
          name: typeof a === 'string' ? a : a.name || 'Unknown',
          relation: typeof a === 'string' ? 'associate' : a.relation || 'associate',
        })),
        mo_patterns: (data.risk_factors ?? []).map((rf: any) => ({
          pattern: typeof rf === 'string' ? rf : rf.factor || rf.name || 'Pattern',
          description: typeof rf === 'string' ? '' : rf.description || rf.explanation || '',
        })),
      })
    } catch {
      setProfileDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = profiles.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.alias?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-5 p-6 h-[calc(100vh-64px)] overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-text-primary" />
            <div>
              <h1 className="text-base font-semibold text-service-blue">Criminal Profiles</h1>
              <p className="text-xs text-text-tertiary">{user?.station_name} · Behavior patterns & dossiers</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 h-full overflow-hidden">
          <div className="w-1/3 rounded-xl border border-border-primary bg-bg-card p-4">
            <div className="animate-pulse space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-lg bg-hover-bg" />)}
            </div>
          </div>
          <div className="w-2/3 rounded-xl border border-border-primary bg-bg-card p-4">
            <div className="animate-pulse h-full rounded-lg bg-hover-bg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6 h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-text-primary" />
          <div>
            <h1 className="text-base font-semibold text-service-blue">Criminal Profiles</h1>
            <p className="text-xs text-text-tertiary">{user?.station_name} · Behavior patterns & dossiers</p>
          </div>
        </div>
        <button className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors">
          + Create Profile
        </button>
      </div>

      <div className="flex gap-4 h-full overflow-hidden">
        {/* Left List */}
        <div className="w-1/3 flex flex-col gap-3 rounded-xl border border-border-primary bg-bg-card p-4 h-full overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input 
              type="text" 
              placeholder="Search name, alias..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-bg-card border border-border-primary rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary placeholder-white/30 focus:outline-none focus:border-cyan-500/40"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.map(p => (
              <div key={p.id} onClick={() => handleSelectProfile(p)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                  selectedProfile?.id === p.id
                    ? 'border-cyan-500/40 bg-cyan-500/10'
                    : 'border-white/5 bg-bg-card hover:border-border-primary'
                }`}>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                    {p.name} {p.alias && <span className="text-text-tertiary text-xs font-normal">({p.alias})</span>}
                  </h4>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    p.risk_score >= 80 ? 'bg-red-500/20 text-red-400' :
                    p.risk_score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>{p.risk_score}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                  <span>{p.primary_crime}</span>
                  <StatusBadge status={p.status} size="sm" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-text-tertiary py-4">No profiles found.</p>
            )}
          </div>
        </div>

        {/* Right Details */}
        <div className="w-2/3 rounded-xl border border-border-primary bg-bg-card p-4 h-full overflow-y-auto">
          {!selectedProfile ? (
            <div className="flex flex-col items-center justify-center h-full max-w-sm text-center gap-3 mx-auto">
              <FolderOpen className="w-10 h-10 opacity-20" />
              <h3 className="text-sm font-medium text-text-primary">Select a Profile</h3>
              <p className="text-xs text-text-tertiary leading-relaxed">
                Click on a criminal profile from the list to view their complete dossier, including associated FIRs, known associates, modus operandi, and AI-generated behavior patterns.
              </p>
            </div>
          ) : detailLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 rounded-lg bg-hover-bg" />
              <div className="h-4 w-32 rounded-lg bg-hover-bg" />
              <div className="h-32 rounded-lg bg-hover-bg" />
              <div className="h-32 rounded-lg bg-hover-bg" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{selectedProfile.name}</h2>
                  {selectedProfile.alias && (
                    <p className="text-xs text-text-tertiary">alias {selectedProfile.alias}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-tertiary">
                    <span>{selectedProfile.age > 0 ? `${selectedProfile.age} yrs` : 'Age unknown'}</span>
                    {selectedProfile.gender && <span>· {selectedProfile.gender}</span>}
                    <span>· {selectedProfile.location}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-lg font-bold tabular-nums ${
                    selectedProfile.risk_score >= 80 ? 'text-red-400' :
                    selectedProfile.risk_score >= 60 ? 'text-amber-400' :
                    'text-green-400'
                  }`}>{selectedProfile.risk_score}</span>
                  <span className="text-[9px] text-text-tertiary">Risk Score</span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-center">
                  <p className="text-sm font-bold text-red-400 tabular-nums">{selectedProfile.fir_count}</p>
                  <p className="text-[9px] text-text-tertiary mt-0.5">Total FIRs</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
                  <p className="text-sm font-bold text-amber-400 tabular-nums">{selectedProfile.network_size}</p>
                  <p className="text-[9px] text-text-tertiary mt-0.5">Network Size</p>
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-center">
                  <p className="text-sm font-bold text-cyan-400 tabular-nums capitalize">{selectedProfile.status}</p>
                  <p className="text-[9px] text-text-tertiary mt-0.5">Status</p>
                </div>
              </div>

              {/* Known FIRs */}
              <div className="rounded-lg border border-border-primary p-3">
                <h3 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-service-blue" /> Known FIRs
                </h3>
                {profileDetail?.firs && profileDetail.firs.length > 0 ? (
                  <div className="space-y-1.5">
                    {profileDetail.firs.map((fir, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-hover-bg p-2 rounded">
                        <div>
                          <button onClick={() => navigate(`/pi/case/${encodeURIComponent(fir.crime_no)}`)}
                            className="font-mono text-service-blue hover:text-accent-cyan text-[10px]">
                            {fir.crime_no}
                          </button>
                          <span className="text-text-tertiary ml-2 text-[10px]">{fir.crime_type}</span>
                        </div>
                        <StatusBadge status={fir.status} size="sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary">{selectedProfile.fir_count} FIR(s) on record</p>
                )}
              </div>

              {/* Known Associates */}
              <div className="rounded-lg border border-border-primary p-3">
                <h3 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                  <UsersIcon className="w-3.5 h-3.5 text-service-blue" /> Known Associates
                </h3>
                {profileDetail?.associates && profileDetail.associates.length > 0 ? (
                  <div className="space-y-1.5">
                    {profileDetail.associates.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-hover-bg p-2 rounded">
                        <LinkIcon className="w-3 h-3 text-text-tertiary" />
                        <span className="text-text-primary">{a.name}</span>
                        <span className="text-text-tertiary text-[10px]">({a.relation})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary">No known associates recorded</p>
                )}
              </div>

              {/* MO Patterns */}
              <div className="rounded-lg border border-border-primary p-3">
                <h3 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-service-blue" /> Modus Operandi
                </h3>
                {profileDetail?.mo_patterns && profileDetail.mo_patterns.length > 0 ? (
                  <div className="space-y-1.5">
                    {profileDetail.mo_patterns.map((mo, i) => (
                      <div key={i} className="text-xs bg-hover-bg p-2 rounded">
                        <p className="text-text-primary font-medium">{mo.pattern}</p>
                        <p className="text-text-tertiary text-[10px] mt-0.5">{mo.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary">No MO data available</p>
                )}
              </div>

              {/* AI Analysis */}
              <button onClick={() => navigate(`/pi/copilot?query=Tell+me+about+${encodeURIComponent(selectedProfile.name)}+profile+${selectedProfile.id}`)}
                className="w-full flex items-center justify-center gap-2 text-xs px-4 py-2.5 rounded-lg
                           bg-cyan-500/10 text-cyan-300 border border-cyan-500/30
                           hover:bg-cyan-500/20 transition-colors">
                <Bot className="w-4 h-4" /> AI Analysis of {selectedProfile.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
