import { z } from "zod"

export const createOrderSchema = z.object({
  supplier_id: z.string().uuid().nullable(),
  supplier_company: z.string().max(200),
  supplier_contact: z.string().max(100),
  supplier_phone: z.string().max(30),
  buyer_name: z.string().max(100),
  buyer_phone: z.string().max(30),
  receiver_name: z.string().max(100),
  receiver_phone: z.string().max(30),
  receiver_address: z.string().max(300),
  customer_id: z.string().uuid().nullable(),
  customer_company: z.string().max(200),
  project_code: z.string().max(50),
  delivery_date: z.string().nullable(),
  status: z.enum(["draft", "confirmed", "closed"]),
  note: z.string().max(500),
  items: z
    .array(
      z.object({
        product_name: z.string().trim().min(1).max(200),
        unit: z.string().max(30),
        quantity: z.number().min(0),
        unit_price: z.number().min(0),
        vat_rate: z.union([z.literal(8), z.literal(10)]),
      }),
    )
    .min(1),
  payments: z.array(
    z.object({
      percent: z.number().min(0).max(100),
      planned_date: z.string().nullable(),
      status: z.enum(["unpaid", "paid"]),
      paid_date: z.string().nullable(),
    }),
  ),
})

export const updateOrderSchema = z.object({
  supplier_id: z.string().uuid().nullable(),
  supplier_company: z.string().max(200),
  supplier_contact: z.string().max(100),
  supplier_phone: z.string().max(30),
  buyer_name: z.string().max(100),
  buyer_phone: z.string().max(30),
  receiver_name: z.string().max(100),
  receiver_phone: z.string().max(30),
  receiver_address: z.string().max(300),
  customer_id: z.string().uuid().nullable(),
  customer_company: z.string().max(200),
  project_code: z.string().max(50),
  delivery_date: z.string().nullable(),
  status: z.enum(["draft", "confirmed", "closed"]),
  note: z.string().max(500),
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        product_name: z.string().trim().min(1).max(200),
        unit: z.string().max(30),
        quantity: z.number().min(0),
        unit_price: z.number().min(0),
        vat_rate: z.union([z.literal(8), z.literal(10)]),
      }),
    )
    .min(1),
  payments: z.array(
    z.object({
      percent: z.number().min(0).max(100),
      planned_date: z.string().nullable(),
      status: z.enum(["unpaid", "paid"]),
      paid_date: z.string().nullable(),
    }),
  ),
})

export const createDeliverySchema = z.object({
  order_id: z.string().uuid(),
  delivery_date: z.string().nullable(),
  customer_info: z.string().max(300),
  responsible_person: z.string().max(100),
  responsible_phone: z.string().max(30),
  receiver_name: z.string().max(100),
  receiver_phone: z.string().max(30),
  pgh_code: z.string().max(50).nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  items: z.array(
    z.object({
      order_item_id: z.string().uuid(),
      product_name: z.string().trim().min(1).max(200),
      unit: z.string().max(30).nullable(),
      delivered_qty: z.number().min(0),
    }),
  ).min(1),
})

export const updateDeliverySchema = z.object({
  delivery_date: z.string().nullable(),
  customer_info: z.string().max(300),
  responsible_person: z.string().max(100),
  responsible_phone: z.string().max(30),
  receiver_name: z.string().max(100),
  receiver_phone: z.string().max(30),
  pgh_code: z.string().max(50).nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  items: z.array(
    z.object({
      order_item_id: z.string().uuid(),
      product_name: z.string().trim().min(1).max(200),
      unit: z.string().max(30).nullable(),
      delivered_qty: z.number().min(0),
    }),
  ).min(1),
})

export const createSupplierSchema = z.object({
  company_name: z.string().trim().min(1).max(200),
  contact_person: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
})

export const updateSupplierSchema = z.object({
  company_name: z.string().trim().min(1).max(200),
  contact_person: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
})

export const createCustomerSchema = z.object({
  company_name: z.string().trim().min(1).max(200),
  address: z.string().max(300).nullable().optional(),
  contact_name: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
})

export const updateCustomerSchema = z.object({
  company_name: z.string().trim().min(1).max(200),
  address: z.string().max(300).nullable().optional(),
  contact_name: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
})

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().max(50).nullable().optional(),
  default_unit: z.string().max(30).nullable().optional(),
  default_price: z.number().min(0),
  default_vat_rate: z.union([z.literal(8), z.literal(10)]),
  note: z.string().max(500).nullable().optional(),
})

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().max(50).nullable().optional(),
  default_unit: z.string().max(30).nullable().optional(),
  default_price: z.number().min(0),
  default_vat_rate: z.union([z.literal(8), z.literal(10)]),
  note: z.string().max(500).nullable().optional(),
})

export const createBuyerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().max(30).nullable().optional(),
})

export const updateBuyerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().max(30).nullable().optional(),
})
