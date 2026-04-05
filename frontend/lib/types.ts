export interface Transaction {
  transaction_id: string;
  user_id?: string;
  amount: number;
  timestamp: string;
  risk_score?: number;
  status: string;
  risk_breakdown?: RiskBreakdownItem[];
}

export interface Alert {
  id: string;
  transaction_id: string;
  entity_id?: string;
  risk_score: number;
  description: string;
  status: string;
  created_at: string;
}

export interface RiskBreakdownItem {
  reason: string;
  contribution: number;
}

export interface BlocklistEntry {
  id: string;
  type: 'phone' | 'ip' | 'wallet';
  value: string;
  source: string;
  added_at: string;
}

export interface AuditEntry {
  id: string;
  user_id?: string;
  action_type: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  key_preview: string;
  tier: string;
  requests_count: number;
  daily_limit: number;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface DashboardStats {
  total_alerts: number;
  open_alerts: number;
  fp_rate: number;
  tx_today: number;
}