"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export type NavUser = { name: string; email: string };

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: <GridIcon /> },
  { href: "/board", label: "Papan", icon: <ColumnsIcon /> },
  { href: "/calendar", label: "Kalender", icon: <CalendarIcon /> },
  { href: "/content", label: "Konten", icon: <ListIcon /> },
  { href: "/ai", label: "AI", icon: <SparkIcon /> },
  { href: "/insights", label: "Insight", icon: <ChartIcon /> },
];

const SECONDARY = [
  { href: "/accounts", label: "Akun Sosmed", icon: <UsersIcon /> },
  { href: "/billing", label: "Billing", icon: <CardIcon /> },
  { href: "/settings", label: "Pengaturan", icon: <GearIcon /> },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  user,
  unreadCount,
  logoutAction,
  showAdmin = false,
}: {
  user: NavUser;
  unreadCount: number;
  logoutAction: () => Promise<void>;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4 lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-text)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="text-base font-semibold tracking-tight">Creator Studio</span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {LINKS.map((link) => (
          <NavItem key={link.href} {...link} active={isActive(pathname, link.href)} />
        ))}
      </nav>

      <div className="my-4 border-t border-[var(--border)]" />

      <nav className="flex flex-col gap-0.5">
        <NavItem
          href="/notifications"
          label="Notifikasi"
          icon={<BellIcon />}
          active={isActive(pathname, "/notifications")}
          badge={unreadCount}
        />
        {SECONDARY.map((link) => (
          <NavItem key={link.href} {...link} active={isActive(pathname, link.href)} />
        ))}
        {showAdmin && (
          <NavItem
            href="/admin/plans"
            label="Aktifkan Plan"
            icon={<CardIcon />}
            active={isActive(pathname, "/admin/plans")}
          />
        )}
      </nav>

      <div className="mt-auto space-y-3 pt-4">
        <Link
          href="/content/new"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-text)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <PlusIcon /> Konten Baru
        </Link>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={logoutAction} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active
          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-text)]">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

/** Compact top bar + bottom tab bar for phones. */
export function MobileNav({
  unreadCount,
  logoutAction,
}: {
  unreadCount: number;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-text)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight">Creator Studio</span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/notifications"
            aria-label="Notifikasi"
            className="relative flex size-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)]"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--accent-text)]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <ThemeToggle />
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Keluar"
              className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)]"
            >
              <ExitIcon />
            </button>
          </form>
        </div>
      </header>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[var(--border)] bg-[var(--surface)]/95 pt-1 backdrop-blur lg:hidden">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] ${
                active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/* --- icons --- */
const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function GridIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function ColumnsIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="14" rx="1.5" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg {...iconProps}>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 4-6" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 11a3 3 0 1 0 0-6M18 20a6 6 0 0 0-2-4.5" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg {...iconProps}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg {...iconProps} width={16} height={16}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ExitIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
