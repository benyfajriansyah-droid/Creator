import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { isMailConfigured } from "@/lib/mail";

export const metadata = { title: "Lupa Password · Creator Studio" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm mailEnabled={isMailConfigured()} />;
}
