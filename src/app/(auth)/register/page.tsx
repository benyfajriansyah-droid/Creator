import AuthForm from "@/components/AuthForm";
import { register } from "@/app/auth-actions";

export const metadata = { title: "Daftar · Creator Studio" };

export default function RegisterPage() {
  return <AuthForm mode="register" action={register} />;
}
