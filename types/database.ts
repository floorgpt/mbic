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
  target_price: number | null;
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

export type LossOpportunityInsert = {
  id?: number;
  dealer_id: number;
  rep_id: number;
  lost_date?: string;
  category_key?: string | null;
  requested_qty: number;
  target_price?: number | null;
  potential_amount: number;
  due_to_stock?: boolean | null;
  lost_reason: string;
  notes?: string | null;
  collection?: string | null;
  color?: string | null;
  expected_sku?: string | null;
  created_at?: string | null;
  sku?: string | null;
};

export type MbicSettingRow = {
  key: string;
  value: Json | null;
  updated_at: string | null;
};

export type MbicSettingInsert = {
  key: string;
  value?: Json | null;
  updated_at?: string | null;
};

export type Database = {
  public: {
    Tables: {
      sales_demo: {
        Row: SalesDemoRow;
        Insert: SalesDemoRow;
        Update: Partial<SalesDemoRow>;
        Relationships: [];
      };
      customers_demo: {
        Row: CustomersDemoRow;
        Insert: CustomersDemoRow;
        Update: Partial<CustomersDemoRow>;
        Relationships: [];
      };
      sales_reps_demo: {
        Row: SalesRepRow;
        Insert: SalesRepRow;
        Update: Partial<SalesRepRow>;
        Relationships: [];
      };
      product_categories: {
        Row: ProductCategoryRow;
        Insert: ProductCategoryRow;
        Update: Partial<ProductCategoryRow>;
        Relationships: [];
      };
      product_category_collection_map: {
        Row: ProductCategoryCollectionMapRow;
        Insert: ProductCategoryCollectionMapRow;
        Update: Partial<ProductCategoryCollectionMapRow>;
        Relationships: [];
      };
      loss_opportunities: {
        Row: LossOpportunityRow;
        Insert: LossOpportunityInsert;
        Update: Partial<LossOpportunityInsert>;
        Relationships: [];
      };
      mbic_settings: {
        Row: MbicSettingRow;
        Insert: MbicSettingInsert;
        Update: Partial<MbicSettingInsert>;
        Relationships: [];
      };
    };
  };
};
