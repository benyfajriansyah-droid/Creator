import AuthForm from "@/components/AuthForm";
import { login } from "@/app/auth-actions";

export const metadata = { title: "Masuk · Creator Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return <AuthForm mode="login" action={login} justReset={reset === "1"} />;
}
