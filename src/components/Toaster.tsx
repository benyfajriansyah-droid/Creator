"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, { title: string; tone: "success" | "info" }> = {
  created: { title: "Konten tersimpan", tone: "success" },
  updated: { title: "Perubahan disimpan", tone: "success" },
  metrics: { title: "Data performa tersimpan", tone: "success" },
  deleted: { title: "Konten dihapus", tone: "info" },
  account: { title: "Akun tersimpan", tone: "success" },
  settings: { title: "Pengaturan tersimpan", tone: "success" },
  push: { title: "Notifikasi HP aktif", tone: "success" },
};

/**
 * Actions signal success by redirecting with `?toast=<key>`. This reads that
 * param, shows the toast, then strips it so a refresh doesn't replay it.
 */
export default function Toaster() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const key = searchParams.get("toast");
  const incoming = key && MESSAGES[key] ? key : null;

  const [visible, setVisible] = useState<string | null>(incoming);
  const [seen, setSeen] = useState<string | null>(incoming);

  // Deriving state during render (rather than in an effect) keeps the toast in
  // sync with client-side navigations without an extra render pass.
  if (incoming && incoming !== seen) {
    setSeen(incoming);
    setVisible(incoming);
  }

  useEffect(() => {
    if (!incoming) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("toast");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [incoming, pathname, router, searchParams]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(null), 3200);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  const message = MESSAGES[visible];

  return (
    <div
      role="status"
      aria-live="polite"
      className="safe-bottom pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6"
    >
      <div className="animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pr-5 pl-4 shadow-[var(--shadow-lg)]">
        <span
          className={`flex size-5 items-center justify-center rounded-full text-xs ${
            message.tone === "success"
              ? "bg-[var(--success-bg)] text-[var(--success)]"
              : "bg-[var(--info-bg)] text-[var(--info)]"
          }`}
          aria-hidden
        >
          {message.tone === "success" ? "✓" : "i"}
        </span>
        <span className="text-sm font-medium text-[var(--text)]">{message.title}</span>
      </div>
    </div>
  );
}
