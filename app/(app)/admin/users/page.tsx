import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/actions/admin";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
import { formatDate } from "@/lib/number-format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangeRoleButton } from "./change-role-button";
import { ResetPasswordButton } from "./reset-password-button";
import { CreateUserDialog } from "./create-user-dialog";

export default async function AdminUsersPage() {
  const ctx = await requireAdmin();
  const result = await listUsers();
  const users = result.data ?? [];
  const t = await getTranslations("users");
  const tr = await getTranslations("roles");
  const tc = await getTranslations("common");
  const locale = await getLocale() as Locale;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("accountsCard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colEmail")}</TableHead>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colRole")}</TableHead>
                <TableHead>{t("colCreatedAt")}</TableHead>
                <TableHead className="w-40">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <EmptyState
                  title={t("empty")}
                  description={t("emptyHint")}
                  colSpan={5}
                />
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                  <TableCell>{u.full_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? tr("admin") : tr("staff")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(u.created_at, locale)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ChangeRoleButton
                        userId={u.id}
                        currentRole={u.role}
                        disabled={u.id === ctx.user.id}
                      />
                      <ResetPasswordButton userId={u.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
