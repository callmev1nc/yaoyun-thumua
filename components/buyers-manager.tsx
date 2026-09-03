"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, UserRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Buyer } from "@/types/db";
import { createBuyer, updateBuyer, deleteBuyer } from "@/lib/actions/buyers";
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

export function BuyersManager({ buyers }: { buyers: Buyer[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Buyer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();

  const t = useTranslations("buyers");
  const tc = useTranslations("common");
  const tt = useTranslations("toasts");
  const tcf = useTranslations("confirm");
  const tv = useTranslations("validation");

  function reset() {
    setEditing(null);
    setName("");
    setPhone("");
  }

  function openAdd() {
    reset();
    setOpen(true);
  }

  function openEdit(b: Buyer) {
    setEditing(b);
    setName(b.name);
    setPhone(b.phone ?? "");
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(tv("buyerName"));
      return;
    }
    startTransition(async () => {
      const res = editing
        ? await updateBuyer(editing.id, { name, phone })
        : await createBuyer({ name, phone });
      if (res?.error) toast.error(res.error);
      else {
        toast.success(editing ? tt("updated") : tt("created"));
        setOpen(false);
        reset();
      }
    });
  }

  function remove(b: Buyer) {
    if (!confirm(tcf("deleteBuyer", { name: b.name }))) return;
    startTransition(async () => {
      const res = await deleteBuyer(b.id);
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
              <DialogDescription>{t("dialogDescription")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")} *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead className="w-[100px] text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyers.length === 0 && (
              <EmptyState
                icon={UserRound}
                title={t("empty")}
                description={t("emptyHint")}
                colSpan={3}
              />
            )}
            {buyers.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{b.phone || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)} title={tc("edit")} aria-label={tc("edit") + " " + t("title")}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(b)} title={tc("delete")} aria-label={tc("delete") + " " + t("title")}>
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
