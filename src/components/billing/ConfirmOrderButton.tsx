"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmManualPayment, type CheckoutState } from "@/app/billing-actions";
import { buttonStyles } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles.primary}>
      {pending ? "Menyimpan…" : "Tandai Lunas"}
    </button>
  );
}

export default function ConfirmOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState<CheckoutState, FormData>(confirmManualPayment, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton />
      {state.error && <span className="text-xs text-[var(--danger)]">{state.error}</span>}
    </form>
  );
}
