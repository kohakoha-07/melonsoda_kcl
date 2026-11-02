import { notFound } from "next/navigation";
import NotificationTarget from "@/components/notification-target";

export default async function NotificationPage({ params }: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if ((kind !== "post" && kind !== "live") || !/^[0-9]+$/.test(id)) notFound();
  return <NotificationTarget kind={kind} targetId={id} />;
}
