import AuthForm from "@/components/AuthForm";
import { login } from "@/app/auth-actions";

export const metadata = { title: "Masuk · Creator Studio" };

export default function LoginPage() {
  return <AuthForm mode="login" action={login} />;
}
