import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { MobileNav, Sidebar } from "@/components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  const navUser = { name: user.name, email: user.email };

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={navUser} unreadCount={unreadCount} logoutAction={logout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav unreadCount={unreadCount} logoutAction={logout} />
        <main className="flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
