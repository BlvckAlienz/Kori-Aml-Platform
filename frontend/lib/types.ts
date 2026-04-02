export interface Transaction {
  transaction_id: string;
  user_id?: string;
  amount: number;
  timestamp: string;
  risk_score?: number;
  status: string;
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