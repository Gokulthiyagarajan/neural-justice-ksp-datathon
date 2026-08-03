export type NodeType =
  | 'accused' | 'victim' | 'complainant' | 'witness'
  | 'account' | 'phone' | 'vehicle'
  | 'criminal_group' | 'police_station' | 'officer' | 'location' | 'evidence';

export type EdgeType =
  | 'transaction' | 'communication' | 'co_arrest' | 'family'
  | 'association' | 'criminal_group' | 'known_associate'
  | 'witnessed' | 'involved_in' | 'located_at' | 'owned_by'
  | 'investigated_by' | 'linked_to' | 'reported_by';

export interface NetworkNode {
  id: string;
  label: string;
  type: NodeType;
  /** Subtype for richer iconography (e.g., 'bank_account', 'mobile', 'two_wheeler') */
  subtype?: string;
  /** Optional FIR count */
  fir_count?: number;
  /** Optional evidence count */
  evidence_count?: number;
  /** Cluster/community ID if detected */
  community_id?: string;
  /** Whether this node is pinned (user-fixed position) */
  pinned?: boolean;
  /** Whether this node is expanded (showing connected nodes) */
  expanded?: boolean;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

export interface NetworkEdge {
  source: string;
  target: string;
  label?: string;
  type: EdgeType;
  weight: number;
  /** Optional count of evidence/transactions backing this edge */
  count?: number;
  /** Optional date of last activity */
  last_activity?: string;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

/** Layout algorithm names supported by the graph engine */
export type LayoutName =
  | 'cose' | 'cose-bilkent' | 'circle' | 'concentric'
  | 'breadthfirst' | 'grid' | 'random' | 'spread';

/** Graph filter criteria */
export interface GraphFilters {
  nodeTypes: NodeType[];
  edgeTypes: EdgeType[];
  searchQuery: string;
  minConnections: number;
}

export const DEFAULT_FILTERS: GraphFilters = {
  nodeTypes: ['accused', 'victim', 'account', 'phone', 'vehicle', 'criminal_group',
    'complainant', 'witness', 'police_station', 'officer', 'location', 'evidence'],
  edgeTypes: ['transaction', 'communication', 'co_arrest', 'family', 'association',
    'criminal_group', 'known_associate', 'witnessed', 'involved_in', 'located_at',
    'owned_by', 'investigated_by', 'linked_to', 'reported_by'],
  searchQuery: '',
  minConnections: 0,
};

/** Node style configuration */
export const NODE_TYPE_STYLES: Record<NodeType, {
  color: string;
  label: string;
  icon: string;
  size: number;
}> = {
  accused:         { color: '#FF3366', label: 'Accused',     icon: 'U', size: 40 },
  victim:          { color: '#00E676', label: 'Victim',      icon: 'V', size: 34 },
  complainant:     { color: '#00BCD4', label: 'Complainant', icon: 'C', size: 32 },
  witness:         { color: '#A5D6A7', label: 'Witness',     icon: 'W', size: 30 },
  account:         { color: '#F59E0B', label: 'Account',     icon: '$', size: 30 },
  phone:           { color: '#2B7FFF', label: 'Phone',       icon: 'T', size: 26 },
  vehicle:         { color: '#00D4FF', label: 'Vehicle',     icon: 'V', size: 28 },
  criminal_group:  { color: '#8B5CF6', label: 'Group',       icon: 'G', size: 44 },
  police_station:  { color: '#0EA5E9', label: 'Station',     icon: 'S', size: 36 },
  officer:         { color: '#6366F1', label: 'Officer',      icon: 'O', size: 32 },
  location:        { color: '#A78BFA', label: 'Location',    icon: 'L', size: 28 },
  evidence:        { color: '#FB923C', label: 'Evidence',    icon: 'E', size: 30 },
};

export const EDGE_TYPE_STYLES: Record<EdgeType, {
  color: string;
  label: string;
  dash?: number[];
}> = {
  transaction:      { color: '#F59E0B', label: 'Transaction' },
  communication:    { color: '#2B7FFF', label: 'Communication' },
  co_arrest:        { color: '#FF3366', label: 'Co-Arrest' },
  family:           { color: '#00E676', label: 'Family' },
  association:      { color: '#94A3B8', label: 'Association' },
  criminal_group:   { color: '#8B5CF6', label: 'Group Member' },
  known_associate:  { color: '#A78BFA', label: 'Known Associate', dash: [4, 3] },
  witnessed:        { color: '#A5D6A7', label: 'Witnessed', dash: [4, 3] },
  involved_in:      { color: '#F87171', label: 'Involved In' },
  located_at:       { color: '#A78BFA', label: 'Located At', dash: [2, 4] },
  owned_by:         { color: '#F59E0B', label: 'Owned By' },
  investigated_by:  { color: '#6366F1', label: 'Investigated By', dash: [4, 2] },
  linked_to:        { color: '#94A3B8', label: 'Linked To' },
  reported_by:      { color: '#00BCD4', label: 'Reported By', dash: [4, 3] },
};

