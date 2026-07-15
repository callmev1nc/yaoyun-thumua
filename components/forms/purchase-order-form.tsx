"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2, Bookmark, BookmarkCheck } from "lucide-react";
import type { Supplier, Customer, Product, Buyer, OrderStatus } from "@/types/db";
import {
  createOrder,
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
  product_name: string;
  unit: string;
  quantity: string;
  unit_price: string;
  vat_rate: number;
  discount_percent: string;
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
}: {
  suppliers: Supplier[];
  customers: Customer[];
  buyers: Buyer[];
  products: Product[];
  currentUserName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [tickPending, startTick] = useTransition();

  const [supplierId, setSupplierId] = useState<string>("");
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");

  const [buyerName, setBuyerName] = useState(currentUserName);
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerId, setBuyerId] = useState<string>("");

  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerSaved, setCustomerSaved] = useState(false);

  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState<OrderStatus>("confirmed");
  const [note, setNote] = useState("");

  const [lines, setLines] = useState<LineRow[]>([
    {
      key: newKey(),
      product_name: "",
      unit: "",
      quantity: "",
      unit_price: "",
      vat_rate: 8,
      discount_percent: "",
    },
  ]);

  const [payments, setPayments] = useState<PaymentRow[]>([
    { percent: "30", planned_date: "", paid: false, paid_date: "" },
    { percent: "30", planned_date: "", paid: false, paid_date: "" },
    { percent: "30", planned_date: "", paid: false, paid_date: "" },
    { percent: "10", planned_date: "", paid: false, paid_date: "" },
  ]);

  // ---- live totals ----
  const parsedLines = useMemo(
    () =>
      lines.map((l) => ({
        quantity: parseLooseNumber(l.quantity) || 0,
        unit_price: parseLooseNumber(l.unit_price) || 0,
        vat_rate: l.vat_rate,
        discount_percent: parseLooseNumber(l.discount_percent) || 0,
      })),
    [lines],
  );
  const totals = useMemo(() => orderTotals(parsedLines), [parsedLines]);
  const paySum = useMemo(
    () => payments.reduce((s, p) => s + (parseLooseNumber(p.percent) || 0), 0),
    [payments],
  );

  // ---- derived save-state checks ----
  const isSupplierSaved = supplierCompany.trim()
    ? suppliers.some((s) => s.company_name.trim().toLowerCase() === supplierCompany.trim().toLowerCase())
    : false;

  const isBuyerSaved = buyerName.trim()
    ? buyers.some((b) => b.name.trim().toLowerCase() === buyerName.trim().toLowerCase())
    : false;

  const isCustomerSaved = (customerCompany.trim() || receiverName.trim())
    ? customers.some((c) => c.company_name.trim().toLowerCase() === (customerCompany || receiverName).trim().toLowerCase())
    : false;

  // ---- line helpers ----
  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        product_name: "",
        unit: "",
        quantity: "",
        unit_price: "",
        vat_rate: 8,
        discount_percent: "",
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
      setReceiverName(c.contact_name ?? "");
      setReceiverPhone(c.phone ?? "");
      setReceiverAddress(c.address ?? "");
      setCustomerCompany(c.company_name);
      setCustomerSaved(true);
    }
  }

  // ---- tick handlers ----
  function handleSaveSupplier() {
    startTick(async () => {
      const res = await createSupplier({
        company_name: supplierCompany,
        contact_person: supplierContact,
        phone: supplierPhone,
      });
      if (res?.error) { toast.error(res.error); return; }
      setSupplierId(res.id);
      toast.success("Đã lưu NCC vào danh bạ");
    });
  }

  function handleSaveBuyer() {
    startTick(async () => {
      const res = await createBuyer({ name: buyerName, phone: buyerPhone });
      if (res?.error) { toast.error(res.error); return; }
      setBuyerId(res.id);
      toast.success("Đã lưu người mua vào danh bạ");
    });
  }

  function handleSaveCustomer() {
    startTick(async () => {
      const payload = {
        company_name: customerCompany || receiverName,
        contact_name: receiverName,
        phone: receiverPhone,
        address: receiverAddress,
      };
      // If a customer is already linked, update it; otherwise create a new one.
      // (Prevents duplicate customer rows on re-save after pick/edit.)
      if (customerId) {
        const res = await updateCustomer(customerId, payload);
        if (res?.error) { toast.error(res.error); return; }
        setCustomerSaved(true);
        toast.success("Đã cập nhật thông tin nhận");
        return;
      }
      const res = await createCustomer(payload);
      if (res?.error) { toast.error(res.error); return; }
      setCustomerId(res.id);
      setCustomerSaved(true);
      toast.success("Đã lưu thông tin nhận vào danh bạ");
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
      toast.success("Đã lưu sản phẩm vào danh mục");
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
        product_name: l.product_name,
        unit: l.unit,
        quantity: parseLooseNumber(l.quantity) || 0,
        unit_price: parseLooseNumber(l.unit_price) || 0,
        vat_rate: l.vat_rate,
        discount_percent: parseLooseNumber(l.discount_percent) || 0,
      }))
      .filter((l) => l.product_name.trim() || l.quantity > 0 || l.unit_price > 0);

    if (items.length === 0) {
      toast.error("Phải có ít nhất 1 dòng sản phẩm");
      return;
    }
    if (paySum !== 100) {
      toast.error(`Tổng % thanh toán = ${paySum} (phải = 100)`);
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
        delivery_date: deliveryDate || null,
        status,
        note,
        items,
        payments: payInput,
      });
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Tạo đơn đặt hàng</h1>
            <p className="text-xs text-muted-foreground">Đơn đặt hàng thu mua (Form 1)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu đơn
          </Button>
        </div>
      </div>

      {/* Info block */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nhà cung cấp & người mua</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Chọn NCC từ danh bạ</Label>
              <Select value={supplierId} onValueChange={pickSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="(hoặc nhập tay bên dưới)" />
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
                <Label>Tên công ty NCC</Label>
                <Input value={supplierCompany} onChange={(e) => setSupplierCompany(e.target.value)} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={tickPending || !supplierCompany.trim() || isSupplierSaved}
                onClick={handleSaveSupplier}
                title="Lưu NCC vào danh bạ"
              >
                {isSupplierSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Người phụ trách NCC" value={supplierContact} onChange={setSupplierContact} />
              <Field label="SĐT NCC" value={supplierPhone} onChange={setSupplierPhone} />
            </div>
            <Separator />
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>Chọn người mua từ danh bạ</Label>
                <Select value={buyerId} onValueChange={pickBuyer}>
                  <SelectTrigger>
                    <SelectValue placeholder="(nhập tay)" />
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
                <Label>Người mua hàng</Label>
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={tickPending || !buyerName.trim() || isBuyerSaved}
                onClick={handleSaveBuyer}
                title="Lưu người mua vào danh bạ"
              >
                {isBuyerSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
              <Field label="SĐT người mua" value={buyerPhone} onChange={setBuyerPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Người nhận hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Chọn khách hàng (tùy chọn)</Label>
              <Select value={customerId} onValueChange={pickCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="(để tự điền địa chỉ)" />
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
                  <Label>Người nhận hàng</Label>
                  <Input value={receiverName} onChange={(e) => { setReceiverName(e.target.value); setCustomerSaved(false); }} />
                </div>
              </div>
              <Field label="SĐT người nhận" value={receiverPhone} onChange={(v) => { setReceiverPhone(v); setCustomerSaved(false); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ nhận hàng</Label>
              <Input value={receiverAddress} onChange={(e) => { setReceiverAddress(e.target.value); setCustomerSaved(false); }} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>Khách hàng (công ty)</Label>
                <Input value={customerCompany} onChange={(e) => { setCustomerCompany(e.target.value); setCustomerSaved(false); }} placeholder="Tên công ty khách hàng" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={tickPending || customerSaved || isCustomerSaved || (!receiverName.trim() && !customerCompany.trim())}
                onClick={handleSaveCustomer}
                title="Lưu thông tin nhận vào danh bạ"
              >
                {customerSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ddate">Thời gian giao hàng</Label>
                <Input id="ddate" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Nháp</SelectItem>
                    <SelectItem value="confirmed">Đã duyệt</SelectItem>
                    <SelectItem value="closed">Đã đóng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lines */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Danh mục thu mua</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" /> Thêm dòng
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
                  <th className="pb-2 pr-2">Tên sản phẩm</th>
                  <th className="w-20 pb-2 pr-2">DVT</th>
                  <th className="w-24 pb-2 pr-2">SL</th>
                  <th className="w-32 pb-2 pr-2">Đơn giá</th>
                  <th className="w-20 pb-2 pr-2">VAT</th>
                  <th className="w-20 pb-2 pr-2">CK%</th>
                  <th className="w-32 pb-2 pr-2 text-right">T.TIỀN CHƯA VAT</th>
                  <th className="w-28 pb-2 pr-2 text-right">Tiền VAT</th>
                  <th className="w-32 pb-2 text-right">Tổng dòng</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const parsed = {
                    quantity: parseLooseNumber(l.quantity) || 0,
                    unit_price: parseLooseNumber(l.unit_price) || 0,
                    vat_rate: l.vat_rate,
                    discount_percent: parseLooseNumber(l.discount_percent) || 0,
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
                          placeholder="Tên / diễn giải sản phẩm"
                        />
                      </td>
                      <td className="pb-2 pr-2">
                        <Input
                          className="w-full"
                          value={l.unit}
                          onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                          placeholder="PCS"
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
                      <td className="pb-2 pr-2">
                        <Input
                          inputMode="decimal"
                          value={l.discount_percent}
                          onChange={(e) => updateLine(l.key, { discount_percent: e.target.value })}
                          placeholder="0"
                        />
                      </td>
                      <td className="pb-2 pr-2 pt-2 text-right tabular-nums text-muted-foreground">
                        {formatNumber(netBeforeVat(parsed))}
                      </td>
                      <td className="pb-2 pr-2 pt-2 text-right tabular-nums text-muted-foreground">
                        {formatNumber(lineVat(parsed))}
                      </td>
                      <td className="pb-2 pt-2 text-right font-medium tabular-nums">
                        {formatNumber(lineTotal(parsed))}
                      </td>
                      <td className="pb-2 pl-1">
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={tickPending || !l.product_name.trim() || saved}
                            onClick={() => handleSaveProduct(idx)}
                            title="Lưu sản phẩm vào danh mục"
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
              <TotalRow label="Tổng chưa thuế" value={formatDong(totals.subtotalExVat)} />
              <TotalRow label="Tiền chiết khấu" value={`- ${formatDong(totals.discountTotal)}`} muted />
              <TotalRow label="Tiền thuế (VAT)" value={formatDong(totals.vatTotal)} />
              <Separator className="my-1" />
              <TotalRow label="Tổng gồm thuế" value={formatDong(totals.grandTotal)} strong />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Hình thức thanh toán (4 đợt){" "}
            <span className={paySum === 100 ? "text-muted-foreground" : "text-destructive"}>
              · tổng {formatNumber(paySum)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="w-10 pb-2">Đợt</th>
                  <th className="w-28 pb-2 pr-2">Tỷ lệ %</th>
                  <th className="w-44 pb-2 pr-2">Ngày dự kiến</th>
                  <th className="w-32 pb-2 pr-2">Trạng thái</th>
                  <th className="pb-2 pr-2">Ngày thanh toán</th>
                  <th className="w-36 pb-2 text-right">Số tiền</th>
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
                          <SelectItem value="unpaid">Chưa chi</SelectItem>
                          <SelectItem value="paid">Đã chi</SelectItem>
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
                      {formatDong(installmentAmount(totals.grandTotal, parseLooseNumber(p.percent) || 0))}
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
          <CardTitle className="text-base">Ghi chú</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú đơn hàng (in ở cột Ghi chú Form 3)" />
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
