"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestManualPayment, type CheckoutState } from "@/app/billing-actions";
import { buttonStyles } from "@/components/ui";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonStyles.secondary} w-full`}>
      {pending ? "Menyimpan…" : label}
    </button>
  );
}

export default function ManualPaymentButton({
  plan,
  label,
}: {
  plan: "PRO" | "STUDIO";
  label: string;
}) {
  const [state, formAction] = useActionState<CheckoutState, FormData>(requestManualPayment, {});

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="plan" value={plan} />
      <SubmitButton label={label} />
      {state.error && <p className="mt-2 text-xs text-[var(--danger)]">{state.error}</p>}
    </form>
  );
}
