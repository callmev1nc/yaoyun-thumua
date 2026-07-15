"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Building2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Supplier } from "@/types/db";
import { createSupplier, updateSupplier, deleteSupplier } from "@/lib/actions/suppliers";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SuppliersManager({ suppliers }: { suppliers: Supplier[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setEditing(null);
    setCompany("");
    setContact("");
    setPhone("");
  }

  function openAdd() {
    reset();
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setCompany(s.company_name);
    setContact(s.contact_person ?? "");
    setPhone(s.phone ?? "");
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) {
      toast.error("Nhập tên công ty");
      return;
    }
    startTransition(async () => {
      const res = editing
        ? await updateSupplier(editing.id, {
            company_name: company,
            contact_person: contact,
            phone: phone,
          })
        : await createSupplier({
            company_name: company,
            contact_person: contact,
            phone: phone,
          });
      if (res?.error) toast.error(res.error);
      else {
        toast.success(editing ? "Đã cập nhật" : "Đã thêm NCC");
        setOpen(false);
        reset();
      }
    });
  }

  function remove(s: Supplier) {
    if (!confirm(`Xoá NCC "${s.company_name}"?`)) return;
    startTransition(async () => {
      const res = await deleteSupplier(s.id);
      if (res?.error) toast.error(res.error);
      else toast.success("Đã xoá");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> Thêm nhà cung cấp
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}</DialogTitle>
              <DialogDescription>Thông tin sẽ dùng khi tạo đơn đặt hàng.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Tên công ty *</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Người phụ trách</Label>
                <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">SĐT</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu
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
              <TableHead>Tên công ty</TableHead>
              <TableHead>Người phụ trách</TableHead>
              <TableHead>SĐT</TableHead>
              <TableHead className="w-[100px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 && (
              <EmptyState
                icon={Building2}
                title="Chưa có nhà cung cấp nào"
                description="Thêm nhà cung cấp đầu tiên để bắt đầu."
                colSpan={4}
              />
            )}
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.company_name}</TableCell>
                <TableCell>{s.contact_person || "—"}</TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Sửa" aria-label="Sửa nhà cung cấp">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s)} title="Xoá" aria-label="Xoá nhà cung cấp">
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
