import ContentForm from "@/components/ContentForm";
import { createContent } from "@/app/actions";

export default function NewContentPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Konten Baru</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Catat ide, jadwalkan, atau langsung tandai sebagai tayang.
      </p>
      <ContentForm action={createContent} />
    </div>
  );
}
