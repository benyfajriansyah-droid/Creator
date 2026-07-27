"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/calendar", label: "Kalender" },
  { href: "/content", label: "Konten" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="sm:hidden sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-3 py-2">
      <span className="mr-2 shrink-0 text-sm font-semibold">Creator Studio</span>
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs ${
              active ? "bg-zinc-800 text-white" : "text-zinc-400"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <Link
        href="/content/new"
        className="ml-auto shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-zinc-900"
      >
        + Konten
      </Link>
    </nav>
  );
}
