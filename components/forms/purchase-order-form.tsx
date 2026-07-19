"use client";

import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/i18n/request";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2, Bookmark, BookmarkCheck, Pencil } from "lucide-react";
import type { Supplier, Customer, Product, Buyer, OrderStatus, PurchaseOrder, OrderItem, PaymentSchedule, ProfileDefaults } from "@/types/db";
import {
  createOrder,
  updateOrder,
  type OrderItemInput,
  type PaymentInput,
} from "@/lib/actions/orders";
import { createSupplier } from "@/lib/actions/suppliers";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { createProduct } from "@/lib/actions/products";
import { createBuyer } from "@/lib/actions/buyers";
import {
  orderTotals,
  installmentAmount,
  netBeforeVat,
  lineVat,
  lineTotal,
} from "@/lib/calc";
import { formatDong, formatNumber, parseLooseNumber } from "@/lib/number-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface LineRow {
  key: string;
  id?: string; // order_item id — carried in edit mode so updateOrder edits rows in place
  product_name: string;
  unit: string;
  quantity: string;
  unit_price: string;
  vat_rate: number;
}

interface PaymentRow {
  percent: string;
  planned_date: string;
  paid: boolean;
  paid_date: string;
}

let keySeq = 0;
const newKey = () => `l${++keySeq}`;

export function PurchaseOrderForm({
  suppliers,
  customers,
  buyers,
  products,
  currentUserName,
  mode,
  initialOrder,
  initialItems,
  initialPayments,
  initialDefaults,
}: {
  suppliers: Supplier[];
  customers: Customer[];
  buyers: Buyer[];
  products: Product[];
  currentUserName: string;
  mode?: "create" | "edit";
  initialOrder?: PurchaseOrder;
  initialItems?: OrderItem[];
  initialPayments?: PaymentSchedule[];
  initialDefaults?: ProfileDefaults;
}) {
  const [pending, startTransition] = useTransition();
  const [tickPending, startTick] = useTransition();

  const isEdit = mode === "edit";

  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const tt = useTranslations("toasts");
  const te = useTranslations("errors");
  const tp = useTranslations("status.po");
  const tpay = useTranslations("status.payment");
  const locale = useLocale() as Locale;

  // --- smart defaults: resolve last-used values (CREATE mode only) ---
  const d = !isEdit ? initialDefaults : undefined;
  const seedSupplier = d?.last_supplier_id
    ? suppliers.find((s) => s.id === d.last_supplier_id)
    : undefined;
  const seedCustomer = d?.last_customer_id
    ? customers.find((c) => c.id === d.last_customer_id)
    : undefined;
  const rawSched = d?.default_payment_schedule;
  const seedSchedule = Array.isArray(rawSched) && rawSched.length > 0 ? rawSched : [30, 30, 30, 10];
  const seedVat = d?.default_vat_rate === 8 || d?.default_vat_rate === 10 ? d.default_vat_rate : 8;

  const [supplierId, setSupplierId] = useState<string>(
    initialOrder?.supplier_id ?? seedSupplier?.id ?? "",
  );
  const [supplierCompany, setSupplierCompany] = useState(
    initialOrder?.supplier_company ?? seedSupplier?.company_name ?? "",
  );
  const [supplierContact, setSupplierContact] = useState(
    initialOrder?.supplier_contact ?? seedSupplier?.contact_person ?? "",
  );
  const [supplierPhone, setSupplierPhone] = useState(
    initialOrder?.supplier_phone ?? seedSupplier?.phone ?? "",
  );

  const [buyerName, setBuyerName] = useState(
    initialOrder?.buyer_name ?? seedCustomer?.contact_name ?? d?.last_buyer_name ?? currentUserName,
  );
  const [buyerPhone, setBuyerPhone] = useState(
    initialOrder?.buyer_phone ?? seedCustomer?.phone ?? d?.last_buyer_phone ?? "",
  );
  const [buyerId, setBuyerId] = useState<string>("");

  const [receiverName, setReceiverName] = useState(
    initialOrder?.receiver_name ?? seedCustomer?.receiver_name ?? "",
  );
  const [receiverPhone, setReceiverPhone] = useState(
    initialOrder?.receiver_phone ?? seedCustomer?.receiver_phone ?? "",
  );
  const [receiverAddress, setReceiverAddress] = useState(
    initialOrder?.receiver_address ?? seedCustomer?.address ?? "",
  );
  const [customerId, setCustomerId] = useState<string>(
    initialOrder?.customer_id ?? seedCustomer?.id ?? "",
  );
  const [customerCompany, setCustomerCompany] = useState(
    initialOrder?.customer_company ?? seedCustomer?.company_name ?? "",
  );
  const [customerSaved, setCustomerSaved] = useState(!!seedCustomer);
  const [projectCode, setProjectCode] = useState(initialOrder?.project_code ?? "");

  const [deliveryDate, setDeliveryDate] = useState(initialOrder?.delivery_date ?? "");
  const [status, setStatus] = useState<OrderStatus>(initialOrder?.status ?? "confirmed");
  const [note, setNote] = useState(initialOrder?.note ?? "");

  const [lines, setLines] = useState<LineRow[]>(() =>
    initialItems && initialItems.length > 0
      ? initialItems.map((it) => ({
          key: newKey(),
          id: it.id,
          product_name: it.product_name,
          unit: it.unit ?? "",
          quantity: String(it.quantity),
          unit_price: String(it.unit_price),
          vat_rate: it.vat_rate,
        }))
      : [
          {
            key: newKey(),
            product_name: "",
            unit: "PCS",
            quantity: "",
            unit_price: "",
            vat_rate: seedVat,
          },
        ],
  );

  const [payments, setPayments] = useState<PaymentRow[]>(() =>
    initialPayments && initialPayments.length > 0
      ? initialPayments.map((p) => ({
          percent: String(p.percent),
          planned_date: p.planned_date ?? "",
          paid: p.status === "paid",
          paid_date: p.paid_date ?? "",
        }))
      : seedSchedule.map((pct) => ({
          percent: String(pct),
          planned_date: "",
          paid: false,
          paid_date: "",
        })),
  );

  const parsedLines = useMemo(
    () =>
      lines.map((l) => ({
        quantity: parseLooseNumber(l.quantity) || 0,
        unit_price: parseLooseNumber(l.unit_price) || 0,
        vat_rate: l.vat_rate,
      })),
    [lines],
  );
  const totals = useMemo(() => orderTotals(parsedLines), [parsedLines]);
  const paySum = useMemo(
    () => payments.reduce((s, p) => s + (parseLooseNumber(p.percent) || 0), 0),
    [payments],
  );

  const isSupplierSaved = supplierCompany.trim()
    ? suppliers.some((s) => s.company_name.trim().toLowerCase() === supplierCompany.trim().toLowerCase())
    : false;

  const isBuyerSaved = buyerName.trim()
    ? buyers.some((b) => b.name.trim().toLowerCase() === buyerName.trim().toLowerCase())
    : false;

  const isCustomerSaved = (customerCompany.trim() || receiverName.trim())
    ? customers.some((c) => c.company_name.trim().toLowerCase() === (customerCompany || receiverName).trim().toLowerCase())
    : false;

  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        product_name: "",
        unit: "PCS",
        quantity: "",
        unit_price: "",
        vat_rate: seedVat,
      },
    ]);
  }
  function removeLine(key: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function handleProductNameChange(key: string, value: string) {
    updateLine(key, { product_name: value });
    const match = products.find((p) => p.name.trim().toLowerCase() === value.trim().toLowerCase());
    if (match) {
      updateLine(key, {
        unit: match.default_unit ?? "",
        unit_price: String(match.default_price),
        vat_rate: match.default_vat_rate,
      });
    }
  }

  function pickSupplier(id: string) {
    setSupplierId(id);
    const s = suppliers.find((x) => x.id === id);
    if (s) {
      setSupplierCompany(s.company_name);
      setSupplierContact(s.contact_person ?? "");
      setSupplierPhone(s.phone ?? "");
    }
  }

  function pickBuyer(id: string) {
    setBuyerId(id);
    const b = buyers.find((x) => x.id === id);
    if (b) {
      setBuyerName(b.name);
      setBuyerPhone(b.phone ?? "");
    }
  }

  function pickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setBuyerName(c.contact_name ?? buyerName);
      setBuyerPhone(c.phone ?? buyerPhone);
      setReceiverName(c.receiver_name ?? "");
      setReceiverPhone(c.receiver_phone ?? "");
      setReceiverAddress(c.address ?? "");
      setCustomerCompany(c.company_name);
      setCustomerSaved(true);
    }
  }

  function handleSaveSupplier() {
    startTick(async () => {
      const res = await createSupplier({
        company_name: supplierCompany,
        contact_person: supplierContact,
        phone: supplierPhone,
      });
      if (res?.error) { toast.error(res.error); return; }
      setSupplierId(res.id);
      toast.success(tt("supplierSaved"));
    });
  }

  function handleSaveBuyer() {
    startTick(async () => {
      const res = await createBuyer({ name: buyerName, phone: buyerPhone });
      if (res?.error) { toast.error(res.error); return; }
      setBuyerId(res.id);
      toast.success(tt("buyerSaved"));
    });
  }

  function handleSaveCustomer() {
    startTick(async () => {
      const payload = {
        company_name: customerCompany || receiverName,
        contact_name: buyerName || null,
        phone: buyerPhone || null,
        receiver_name: receiverName || null,
        receiver_phone: receiverPhone || null,
        address: receiverAddress,
      };
      if (customerId) {
        const res = await updateCustomer(customerId, payload);
        if (res?.error) { toast.error(res.error); return; }
        setCustomerSaved(true);
        toast.success(tt("receiverSaved"));
        return;
      }
      const res = await createCustomer(payload);
      if (res?.error) { toast.error(res.error); return; }
      setCustomerId(res.id);
      setCustomerSaved(true);
      toast.success(tt("receiverSaved"));
    });
  }

  function handleSaveProduct(idx: number) {
    const l = lines[idx];
    if (!l.product_name.trim()) return;
    startTick(async () => {
      const res = await createProduct({
        name: l.product_name,
        default_unit: l.unit,
        default_price: parseLooseNumber(l.unit_price) || 0,
        default_vat_rate: l.vat_rate,
      });
      if (res?.error) { toast.error(res.error); return; }
      toast.success(tt("productSaved"));
    });
  }

  function isProductSaved(name: string): boolean {
    if (!name.trim()) return false;
    return products.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const items: OrderItemInput[] = lines
      .map((l) => ({
        id: l.id,
        product_name: l.product_name,
        unit: l.unit,
        quantity: parseLooseNumber(l.quantity) || 0,
        unit_price: parseLooseNumber(l.unit_price) || 0,
        vat_rate: l.vat_rate,
      }))
      .filter((l) => l.product_name.trim() || l.quantity > 0 || l.unit_price > 0);

    if (items.length === 0) {
      toast.error(te("needOneItem"));
      return;
    }
    if (paySum !== 100) {
      toast.error(te("paymentSum", { sum: paySum }));
      return;
    }

    const payInput: PaymentInput[] = payments
      .filter((p) => (parseLooseNumber(p.percent) || 0) > 0)
      .map((p) => ({
        percent: parseLooseNumber(p.percent) || 0,
        planned_date: p.planned_date || null,
        status: p.paid ? "paid" : "unpaid",
        paid_date: p.paid_date || null,
      }));

    startTransition(async () => {
      if (isEdit && initialOrder) {
        const res = await updateOrder(initialOrder.id, {
          supplier_id: supplierId || null,
          supplier_company: supplierCompany,
          supplier_contact: supplierContact,
          supplier_phone: supplierPhone,
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          receiver_name: receiverName,
          receiver_phone: receiverPhone,
          receiver_address: receiverAddress,
          customer_id: customerId || null,
          customer_company: customerCompany,
          project_code: projectCode,
          delivery_date: deliveryDate || null,
          status,
          note,
          items,
          payments: payInput,
        });
        if (res?.error) toast.error(res.error);
      } else {
        const res = await createOrder({
          supplier_id: supplierId || null,
          supplier_company: supplierCompany,
          supplier_contact: supplierContact,
          supplier_phone: supplierPhone,
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          receiver_name: receiverName,
          receiver_phone: receiverPhone,
          receiver_address: receiverAddress,
          customer_id: customerId || null,
          customer_company: customerCompany,
          project_code: projectCode,
          delivery_date: deliveryDate || null,
          status,
          note,
          items,
          payments: payInput,
        });
        if (res?.error) toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href={isEdit && initialOrder ? `/purchase-orders/${initialOrder.id}` : "/purchase-orders"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {isEdit ? t("edit") : t("create")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEdit && initialOrder ? initialOrder.order_code : t("title") + " (Form 1)"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? (
              <><Pencil className="mr-2 h-4 w-4" /> {tc("update")}</>
            ) : (
              t("save")
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tc("suppliers")} & {t("buyer")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>{tc("search")} {tc("suppliers")}</Label>
              <Select value={supplierId} onValueChange={pickSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder={"(" + tc("add") + ")"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>{t("supplierCompany")}</Label>
                <Input value={supplierCompany} onChange={(e) => setSupplierCompany(e.target.value)} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={tickPending || !supplierCompany.trim() || isSupplierSaved}
                onClick={handleSaveSupplier}
                title={tt("supplierSaved")}
              >
                {isSupplierSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("supplierContact")} value={supplierContact} onChange={setSupplierContact} />
              <Field label={t("supplierPhone")} value={supplierPhone} onChange={setSupplierPhone} />
            </div>
            <Separator />
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>{tc("search")} {t("buyer")}</Label>
                <Select value={buyerId} onValueChange={pickBuyer}>
                  <SelectTrigger>
                    <SelectValue placeholder={"(" + tc("add") + ")"} />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>{t("buyer")}</Label>
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={tickPending || !buyerName.trim() || isBuyerSaved}
                onClick={handleSaveBuyer}
                title={tt("buyerSaved")}
              >
                {isBuyerSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
              <Field label={t("supplierPhone")} value={buyerPhone} onChange={setBuyerPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("receiver")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>{tc("search")} {tc("customers")}</Label>
              <Select value={customerId} onValueChange={pickCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder={"(" + tc("add") + ")"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>{t("receiver")}</Label>
                  <Input value={receiverName} onChange={(e) => { setReceiverName(e.target.value); setCustomerSaved(false); }} />
                </div>
              </div>
              <Field label={t("receiverPhone")} value={receiverPhone} onChange={(v) => { setReceiverPhone(v); setCustomerSaved(false); }} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("deliveryAddress")}</Label>
              <Input value={receiverAddress} onChange={(e) => { setReceiverAddress(e.target.value); setCustomerSaved(false); }} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>{t("customerCompany")}</Label>
                <Input value={customerCompany} onChange={(e) => { setCustomerCompany(e.target.value); setCustomerSaved(false); }} placeholder={t("customerCompanyPlaceholder")} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={tickPending || customerSaved || isCustomerSaved || (!receiverName.trim() && !customerCompany.trim())}
                onClick={handleSaveCustomer}
                title={tt("receiverSaved")}
              >
                {customerSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>{t("projectCode")}</Label>
              <Input
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                placeholder={t("code") + " YY202603005"}
              />
              <p className="text-xs text-muted-foreground">
                {t("orderCode")} PO202603005-01.
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ddate">{t("deliveryDate")}</Label>
                <Input id="ddate" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("status")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{tp("draft")}</SelectItem>
                    <SelectItem value="confirmed">{tp("confirmed")}</SelectItem>
                    <SelectItem value="closed">{tp("closed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("items")}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" /> {t("addItem")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <datalist id="product-suggestions">
              {products.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="w-8 pb-2">#</th>
                  <th className="pb-2 pr-2">{t("product")}</th>
                  <th className="w-20 pb-2 pr-2">{t("unit")}</th>
                  <th className="w-24 pb-2 pr-2">{t("qty")}</th>
                  <th className="w-32 pb-2 pr-2">{t("unitPrice")}</th>
                  <th className="w-20 pb-2 pr-2">VAT</th>
                  <th className="w-32 pb-2 pr-2 text-right">{t("subtotal")}</th>
                  <th className="w-28 pb-2 pr-2 text-right">{t("vat")}</th>
                  <th className="w-32 pb-2 text-right">{t("total")}</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const parsed = {
                    quantity: parseLooseNumber(l.quantity) || 0,
                    unit_price: parseLooseNumber(l.unit_price) || 0,
                    vat_rate: l.vat_rate,
                  };
                  const saved = isProductSaved(l.product_name);
                  return (
                    <tr key={l.key} className="align-top">
                      <td className="pb-2 pt-1 text-muted-foreground">{idx + 1}</td>
                      <td className="pb-2 pr-2">
                        <Input
                          list="product-suggestions"
                          value={l.product_name}
                          onChange={(e) => handleProductNameChange(l.key, e.target.value)}
                          placeholder={t("product")}
                        />
                      </td>
                      <td className="pb-2 pr-2">
                        <Input
                          className="w-full"
                          value={l.unit}
                          onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                          placeholder={t("unit")}
                        />
                      </td>
                      <td className="pb-2 pr-2">
                        <Input
                          inputMode="decimal"
                          value={l.quantity}
                          onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                          placeholder="0"
                        />
                      </td>
                      <td className="pb-2 pr-2">
                        <Input
                          inputMode="decimal"
                          value={l.unit_price}
                          onChange={(e) => updateLine(l.key, { unit_price: e.target.value })}
                          placeholder="0"
                        />
                      </td>
                      <td className="pb-2 pr-2">
                        <Select
                          value={String(l.vat_rate)}
                          onValueChange={(v) => updateLine(l.key, { vat_rate: Number(v) })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8">8%</SelectItem>
                            <SelectItem value="10">10%</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="pb-2 pr-2 pt-2 text-right tabular-nums text-muted-foreground">
                        {formatNumber(netBeforeVat(parsed), locale)}
                      </td>
                      <td className="pb-2 pr-2 pt-2 text-right tabular-nums text-muted-foreground">
                        {formatNumber(lineVat(parsed), locale)}
                      </td>
                      <td className="pb-2 pt-2 text-right font-medium tabular-nums">
                        {formatNumber(lineTotal(parsed), locale)}
                      </td>
                      <td className="pb-2 pl-1">
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={tickPending || !l.product_name.trim() || saved}
                            onClick={() => handleSaveProduct(idx)}
                            title={tt("productSaved")}
                          >
                            {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(l.key)}
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="ml-auto w-full max-w-sm rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
            <div className="space-y-1 text-sm">
              <TotalRow label={t("totalExclVat")} value={formatDong(totals.subtotalExVat, locale)} />
              <TotalRow label={t("vat")} value={formatDong(totals.vatTotal, locale)} />
              <Separator className="my-1" />
              <TotalRow label={t("totalInclVat")} value={formatDong(totals.grandTotal, locale)} strong />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("paymentSchedule", { count: payments.length })}{" "}
            <span className={paySum === 100 ? "text-muted-foreground" : "text-destructive"}>
              · {tc("total")} {formatNumber(paySum, locale)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="w-10 pb-2">#</th>
                  <th className="w-28 pb-2 pr-2">%</th>
                  <th className="w-44 pb-2 pr-2">{t("paymentDueDate")}</th>
                  <th className="w-32 pb-2 pr-2">{t("status")}</th>
                  <th className="pb-2 pr-2">{tc("save")}</th>
                  <th className="w-36 pb-2 text-right">{tc("total")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="align-top">
                    <td className="pb-2 pt-2 font-medium">{i + 1}</td>
                    <td className="pb-2 pr-2">
                      <Input
                        inputMode="decimal"
                        value={p.percent}
                        onChange={(e) =>
                          setPayments((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="pb-2 pr-2">
                      <Input
                        type="date"
                        value={p.planned_date}
                        onChange={(e) =>
                          setPayments((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, planned_date: e.target.value } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="pb-2 pr-2">
                      <Select
                        value={p.paid ? "paid" : "unpaid"}
                        onValueChange={(v) =>
                          setPayments((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, paid: v === "paid" } : x)),
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">{tpay("unpaid")}</SelectItem>
                          <SelectItem value="paid">{tpay("paid")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="pb-2 pr-2">
                      <Input
                        type="date"
                        value={p.paid_date}
                        disabled={!p.paid}
                        onChange={(e) =>
                          setPayments((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, paid_date: e.target.value } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="pb-2 pt-2 text-right tabular-nums">
                      {formatDong(installmentAmount(totals.grandTotal, parseLooseNumber(p.percent) || 0), locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("note")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("note")} />
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${strong ? "text-base font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
