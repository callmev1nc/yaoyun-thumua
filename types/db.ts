/** Hand-written row types mirroring supabase/migrations/0001_init.sql and 0002_catalog_and_dirs.sql. */

export type UserRole = "admin" | "staff"

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  email?: string | null
  created_at: string
}

export interface Supplier {
  id: string
  company_name: string
  contact_person: string | null
  phone: string | null
  created_at: string
  created_by: string | null
}

export interface Customer {
  id: string
  company_name: string
  address: string | null
  contact_name: string | null
  phone: string | null
  created_at: string
  created_by: string | null
}

export interface Product {
  id: string
  name: string
  sku: string | null
  default_unit: string | null
  default_price: number
  default_vat_rate: number
  note: string | null
  created_at: string
  created_by: string | null
}

export interface Buyer {
  id: string
  name: string
  phone: string | null
  created_at: string
  created_by: string | null
}

export interface SpendBySupplierRow {
  supplier_company: string
  order_count: number
  total_spend: number
}

export type OrderStatus = "draft" | "confirmed" | "closed"

export interface PurchaseOrder {
  id: string
  order_code: string
  supplier_id: string | null
  supplier_company: string | null
  supplier_contact: string | null
  supplier_phone: string | null
  buyer_name: string | null
  buyer_phone: string | null
  receiver_name: string | null
  receiver_phone: string | null
  receiver_address: string | null
  customer_id: string | null
  customer_company: string | null
  project_code: string | null
  po_code: string | null
  delivery_date: string | null
  status: OrderStatus
  note: string | null
  subtotal_ex_vat: number
  vat_total: number
  grand_total: number
  created_at: string
  created_by: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  seq: number
  product_name: string
  unit: string | null
  quantity: number
  unit_price: number
  vat_rate: number
  // GENERATED columns (DB-computed):
  line_gross: number
  net_before_vat: number
  line_vat: number
  line_total: number
}

export type PaymentStatus = "unpaid" | "paid"

export interface PaymentSchedule {
  id: string
  order_id: string
  installment_no: number
  percent: number
  planned_date: string | null
  status: PaymentStatus
  paid_date: string | null
  amount: number
}

export type DeliveryStatus = "draft" | "delivered" | "cancelled"

export interface DeliveryNote {
  id: string
  delivery_code: string
  order_id: string
  delivery_date: string | null
  customer_info: string | null
  responsible_person: string | null
  responsible_phone: string | null
  receiver_name: string | null
  receiver_phone: string | null
  pgh_code: string | null
  customer_id: string | null
  status: DeliveryStatus
  created_at: string
  created_by: string | null
}

export interface DeliveryItem {
  id: string
  delivery_note_id: string
  order_item_id: string
  seq: number
  product_name: string
  unit: string | null
  delivered_qty: number
}

/** One row of the `ledger` view (Form 3). */
export interface LedgerRow {
  order_id: string
  order_code: string
  created_at: string
  delivery_date: string | null
  company: string | null
  product_name: string
  unit: string | null
  quantity: number
  unit_price: number
  line_total: number
  net_before_vat: number
  note: string | null
  project_code: string | null
  po_code: string | null
  customer_company: string | null
  payment_due_date: string | null
  order_remaining: number
}
