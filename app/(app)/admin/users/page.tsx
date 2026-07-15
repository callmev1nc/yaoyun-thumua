import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/actions/admin";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quản lý người dùng</h1>
          <p className="text-sm text-muted-foreground">
            Danh sách tài khoản — chỉ Admin
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-40">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <EmptyState
                  title="Chưa có người dùng"
                  description="Tạo người dùng đầu tiên để bắt đầu."
                  colSpan={5}
                />
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                  <TableCell>{u.full_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Admin" : "Nhân viên"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(u.created_at)}
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
