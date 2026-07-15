"use client";

import { useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();

  function reset() {
    setEditing(null);
    setCompany("");
    setAddress("");
  }

  function openAdd() {
    reset();
    setOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setCompany(c.company_name);
    setAddress(c.address ?? "");
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
        ? await updateCustomer(editing.id, { company_name: company, address })
        : await createCustomer({ company_name: company, address });
      if (res?.error) toast.error(res.error);
      else {
        toast.success(editing ? "Đã cập nhật" : "Đã thêm khách hàng");
        setOpen(false);
        reset();
      }
    });
  }

  function remove(c: Customer) {
    if (!confirm(`Xoá khách hàng "${c.company_name}"?`)) return;
    startTransition(async () => {
      const res = await deleteCustomer(c.id);
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
              <Plus className="mr-2 h-4 w-4" /> Thêm khách hàng
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Sửa khách hàng" : "Thêm khách hàng"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Tên công ty *</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
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
              <TableHead>Địa chỉ</TableHead>
              <TableHead className="w-[100px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <EmptyState
                icon={Boxes}
                title="Chưa có khách hàng nào"
                description="Thêm khách hàng đầu tiên để bắt đầu."
                colSpan={3}
              />
            )}
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.company_name}</TableCell>
                <TableCell>{c.address || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Sửa" aria-label="Sửa khách hàng">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c)} title="Xoá" aria-label="Xoá khách hàng">
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
