import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireUser();
  const email = ctx.user.email;

  return (
    <div className="flex min-h-svh">
      <Sidebar role={ctx.role} email={email} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
