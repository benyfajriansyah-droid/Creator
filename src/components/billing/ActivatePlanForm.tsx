"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { activatePlan, type ActivateState } from "@/app/billing-actions";
import { Field, buttonStyles, inputStyles } from "@/components/ui";

/** Which plan gets applied comes from whichever button submitted the form. */
function PlanButton({
  plan,
  label,
  variant,
}: {
  plan: "PRO" | "FREE";
  label: string;
  variant: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="plan"
      value={plan}
      disabled={pending}
      className={buttonStyles[variant]}
    >
      {pending ? "Menyimpan…" : label}
    </button>
  );
}

export default function ActivatePlanForm() {
  const [state, formAction] = useActionState<ActivateState, FormData>(activatePlan, {});

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Email akun"
        hint="Email yang dipakai klien mendaftar di aplikasi ini — cocokkan dengan detail order di OrderHero."
      >
        <input
          type="email"
          name="email"
          required
          placeholder="klien@email.com"
          className={inputStyles}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <PlanButton plan="PRO" label="Aktifkan Pro (30 hari)" variant="primary" />
        <PlanButton plan="FREE" label="Kembalikan ke Gratis" variant="danger" />
      </div>

      {state.error && (
        <p className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]">
          {state.success}
        </p>
      )}
    </form>
  );
}
