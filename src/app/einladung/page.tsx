import { InvitationAccept } from "@/components/InvitationAccept";

export default function InvitationPage({ searchParams }: { searchParams: { token?: string } }) {
  return <InvitationAccept token={searchParams.token || ""} />;
}
