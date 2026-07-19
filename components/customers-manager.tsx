"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Boxes } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Customer } from "@/types/db";
import { createCustomer, updateCustomer, deleteCustomer } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CustomersManager({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [pending, startTransition] = useTransition();

  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const tt = useTranslations("toasts");
  const tcf = useTranslations("confirm");
  const te = useTranslations("errors");

  function reset() {
    setEditing(null);
    setCompany("");
    setAddress("");
    setReceiverName("");
    setReceiverPhone("");
  }

  function openAdd() {
    reset();
    setOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setCompany(c.company_name);
    setAddress(c.address ?? "");
    setReceiverName(c.receiver_name ?? "");
    setReceiverPhone(c.receiver_phone ?? "");
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) {
      toast.error(te("companyRequired"));
      return;
    }
    startTransition(async () => {
      const res = editing
        ? await updateCustomer(editing.id, {
            company_name: company,
            address,
            receiver_name: receiverName,
            receiver_phone: receiverPhone,
          })
        : await createCustomer({
            company_name: company,
            address,
            receiver_name: receiverName,
            receiver_phone: receiverPhone,
          });
      if (res?.error) toast.error(res.error);
      else {
        toast.success(editing ? tt("updated") : tt("created"));
        setOpen(false);
        reset();
      }
    });
  }

  function remove(c: Customer) {
    if (!confirm(tcf("deleteCustomer", { name: c.company_name }))) return;
    startTransition(async () => {
      const res = await deleteCustomer(c.id);
      if (res?.error) toast.error(res.error);
      else toast.success(tt("deleted"));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> {t("add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? tc("edit") + " " + t("title") : t("add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">{t("company")} *</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t("address")}</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="receiverName">{t("receiver")}</Label>
                  <Input
                    id="receiverName"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiverPhone">{t("receiverPhone")}</Label>
                  <Input
                    id="receiverPhone"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {tc("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("company")}</TableHead>
              <TableHead>{t("receiver")}</TableHead>
              <TableHead>{t("receiverPhone")}</TableHead>
              <TableHead>{t("address")}</TableHead>
              <TableHead className="w-[100px] text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <EmptyState
                icon={Boxes}
                title={t("empty")}
                description={t("emptyDescription")}
                colSpan={5}
              />
            )}
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.company_name}</TableCell>
                <TableCell>{c.receiver_name || "—"}</TableCell>
                <TableCell>{c.receiver_phone || "—"}</TableCell>
                <TableCell>{c.address || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title={tc("edit")} aria-label={tc("edit") + " " + t("title")}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c)} title={tc("delete")} aria-label={tc("delete") + " " + t("title")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
