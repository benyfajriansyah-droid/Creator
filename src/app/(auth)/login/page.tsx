import AuthForm from "@/components/AuthForm";
import { login } from "@/app/auth-actions";

export const metadata = { title: "Masuk · Creator Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; next?: string }>;
}) {
  const { reset, next } = await searchParams;
  return (
    <AuthForm
      mode="login"
      action={login}
      justReset={reset === "1"}
      redirectTo={next === "/billing" ? "/billing" : undefined}
    />
  );
}
