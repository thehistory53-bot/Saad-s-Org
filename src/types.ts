export interface Product {
  id: number;
  name: string;
  category: string;
  pieces_per_carton: number;
  unit_price: number;
  min_stock_level: number;
  cartons: number;
  pieces: number;
  profit_percent?: number;
}

export interface Settings {
  company_name: string;
  address: string;
  logo_url: string;
}

export interface MasterData {
  routes: { id: number; name: string }[];
  srs: { id: number; name: string }[];
  delivery_boys: { id: number; name: string }[];
  vans: { id: number; van_no: string }[];
}

export interface OperationItem {
  product_id: number;
  cartons: number;
  pieces: number;
}

export interface Operation {
  type: 'issue' | 'return' | 'damage';
  date: string;
  sr_id: number;
  route_id: number;
  delivery_boy_id: number;
  van_id: number;
  items: OperationItem[];
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  amount: number;
  description: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'staff';
  full_name: string;
}
