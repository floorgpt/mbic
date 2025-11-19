export type SalesRep = {
  rep_id: number;
  rep_name: string;
  rep_email?: string | null;
  rep_phone?: string | null;
  rep_profile_picture?: string | null;
  created_at?: string;
};

export type SalesTarget = {
  id: number;
  rep_id: number;
  target_month: string;
  target_amount: number;
  fiscal_year: number;
};

export type Customer = {
  customer_id: number;
  dealer_name: string;
  rep_id: number | null;
  dealer_billing_address_city: string | null;
  dealer_billing_address_state: string | null;
  dealer_billing_address_postal_code: string | null;
  dealer_billing_address_postal_country: string | null;
  dealer_email_1: string | null;
};

export type TransferHistory = {
  id: number;
  customer_id: number;
  from_rep_id: number | null;
  to_rep_id: number | null;
  transferred_at: string;
  notes: string | null;
  from_rep?: { rep_id: number; rep_name: string } | null;
  to_rep?: { rep_id: number; rep_name: string } | null;
};
