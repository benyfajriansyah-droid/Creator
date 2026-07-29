import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createContent } from "@/app/actions";
import ContentForm from "@/components/ContentForm";
import { PageHeader, Card, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewContentPage() {
  const user = await requireUser();
  const accounts = await prisma.socialAccount.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Konten Baru"
        description="Catat ide, jadwalkan, atau langsung tandai sudah tayang."
        action={
          <ButtonLink href="/content" variant="secondary">
            Batal
          </ButtonLink>
        }
      />
      <Card className="p-5 sm:p-6">
        <ContentForm
          accounts={accounts}
          action={createContent}
          timeZone={user.timeZone}
        />
      </Card>
    </div>
  );
}
