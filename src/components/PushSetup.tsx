"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui";

type State =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "prompt"
  | "enabled"
  | "denied"
  | "working";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** iOS only exposes the Push API to sites installed to the home screen. */
function isIosSafariNotInstalled(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (!isIos) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return !standalone;
}

export default function PushSetup({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);

  // Capability detection reads browser state that only exists on the client,
  // so it runs after mount and reports back asynchronously.
  useEffect(() => {
    let cancelled = false;

    async function detect(): Promise<State> {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return isIosSafariNotInstalled() ? "needs-install" : "unsupported";
      }
      if (Notification.permission === "denied") return "denied";

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        return subscription ? "enabled" : "prompt";
      } catch {
        return "prompt";
      }
    }

    detect().then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setError(null);
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "prompt");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("Gagal menyimpan langganan notifikasi");

      setState("enabled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi");
      setState("prompt");
    }
  }, [vapidPublicKey]);

  const disable = useCallback(async () => {
    setState("working");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("prompt");
    } catch {
      setState("enabled");
    }
  }, []);

  const sendTest = useCallback(async () => {
    await fetch("/api/push/test", { method: "POST" });
  }, []);

  if (state === "checking") {
    return <p className="text-sm text-[var(--text-muted)]">Mengecek dukungan notifikasi…</p>;
  }

  if (state === "needs-install") {
    return (
      <Note tone="info">
        Di iPhone, notifikasi baru bisa aktif kalau aplikasinya di-install dulu. Buka menu
        <strong> Share</strong> di Safari → <strong>Add to Home Screen</strong>, lalu buka
        Creator Studio dari ikon di home screen dan aktifkan notifikasi dari sana.
      </Note>
    );
  }

  if (state === "unsupported") {
    return <Note tone="warning">Browser ini belum mendukung push notification.</Note>;
  }

  if (state === "denied") {
    return (
      <Note tone="warning">
        Notifikasi diblokir untuk situs ini. Aktifkan lagi lewat pengaturan izin browser
        (ikon gembok di address bar), lalu muat ulang halaman.
      </Note>
    );
  }

  if (state === "enabled") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-1 text-sm font-medium text-[var(--success)]">
          ✓ Notifikasi aktif di perangkat ini
        </span>
        <button type="button" onClick={sendTest} className={buttonStyles.secondary}>
          Kirim tes
        </button>
        <button type="button" onClick={disable} className={buttonStyles.ghost}>
          Matikan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={enable}
        disabled={state === "working"}
        className={buttonStyles.primary}
      >
        {state === "working" ? "Mengaktifkan…" : "Aktifkan notifikasi di HP ini"}
      </button>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

function Note({
  tone,
  children,
}: {
  tone: "info" | "warning";
  children: React.ReactNode;
}) {
  const styles =
    tone === "info"
      ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info)]"
      : "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]";
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}
