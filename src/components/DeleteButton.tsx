"use client";

export default function DeleteButton({ action }: { action: () => void }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Hapus konten ini? Tindakan tidak bisa dibatalkan.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="shrink-0 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:border-rose-500/50 hover:text-rose-400"
      >
        Hapus
      </button>
    </form>
  );
}
