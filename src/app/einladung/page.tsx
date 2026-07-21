import { InvitationAccept } from "@/components/InvitationAccept";

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <InvitationAccept token={token || ""} />;
}
