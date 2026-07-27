"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/calendar", label: "Kalender", icon: "🗓️" },
  { href: "/content", label: "Konten", icon: "🎬" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden sm:flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 px-4 py-6">
      <div className="mb-8 px-2">
        <p className="text-lg font-semibold tracking-tight">Creator Studio</p>
        <p className="text-xs text-zinc-500">Content ops, disederhanakan</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <Link
          href="/content/new"
          className="flex w-full items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          + Konten Baru
        </Link>
      </div>
    </aside>
  );
}
