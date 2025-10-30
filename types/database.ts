export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SalesDemoRow = {
  id?: number;
  sale_id?: number;
  customer_id: number;
  rep_id: number;
  invoice_amount: number;
  invoice_date: string;
  collection: string | null;
};

export type CustomersDemoRow = {
  customer_id: number;
  dealer_name: string;
  rep_id: number | null;
};

export type SalesRepRow = {
  rep_id: number;
  rep_name: string;
  email: string | null;
  rep_phone: string | null;
};

export type ProductCategoryRow = {
  category_key: string;
  display_name: string;
  sort_order: number | null;
  is_active: boolean;
  icon_url: string | null;
};

export type ProductCategoryCollectionMapRow = {
  category_key: string;
  collection_key: string;
  collection_label: string | null;
};

export type LossOpportunityRow = {
  id: number;
  dealer_id: number;
  rep_id: number;
  lost_date: string;
  category_key: string | null;
  requested_qty: number;
  potential_amount: number;
  due_to_stock: boolean;
  lost_reason: string;
  notes: string | null;
  collection: string | null;
  color: string | null;
  expected_sku: string | null;
  created_at: string | null;
  sku: string | null;
};

export type MbicSettingRow = {
  key: string;
  value: Json | null;
  updated_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      sales_demo: {
        Row: SalesDemoRow;
      };
      customers_demo: {
        Row: CustomersDemoRow;
      };
      sales_reps_demo: {
        Row: SalesRepRow;
      };
      product_categories: {
        Row: ProductCategoryRow;
      };
      product_category_collection_map: {
        Row: ProductCategoryCollectionMapRow;
      };
      loss_opportunities: {
        Row: LossOpportunityRow;
      };
      mbic_settings: {
        Row: MbicSettingRow;
      };
    };
  };
};
