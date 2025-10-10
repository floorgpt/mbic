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
    };
  };
};
