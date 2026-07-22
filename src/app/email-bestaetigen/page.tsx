import { EmailConfirmation } from "@/components/EmailConfirmation";

export default async function EmailConfirmationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <EmailConfirmation token={token || ""} />;
}
