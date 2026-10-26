import SharedProfile from "@/components/shared-profile";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <SharedProfile userId={userId} />;
}