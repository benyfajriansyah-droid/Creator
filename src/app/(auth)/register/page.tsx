import AuthForm from "@/components/AuthForm";
import { register } from "@/app/auth-actions";

export const metadata = { title: "Daftar · Creator Studio" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthForm
      mode="register"
      action={register}
      redirectTo={next === "/billing" ? "/billing" : undefined}
    />
  );
}
