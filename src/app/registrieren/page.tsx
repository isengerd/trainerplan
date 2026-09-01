import { redirect } from "next/navigation";
import { ClubRegistration } from "@/components/ClubRegistration";
import { publicRegistrationEnabled } from "@/lib/registration-access";

export default function RegistrationPage() {
  if (!publicRegistrationEnabled()) redirect("/login");
  return <ClubRegistration />;
}
