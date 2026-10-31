import { NextResponse } from "next/server";
import { getSpotifyTracks } from "@/lib/spotify";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const ids = [
    ...new Set(
      (searchParams.get("ids") ?? "")
        .split(",")
        .filter(Boolean),
    ),
  ];

  if (
    ids.length === 0 ||
    ids.length > 50 ||
    ids.some((id) => !/^[A-Za-z0-9]{22}$/.test(id))
  ) {
    return NextResponse.json(
      { error: "曲IDが正しくありません。" },
      { status: 400 },
    );
  }

  try {
    const tracks = await getSpotifyTracks(ids);

    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json(
      {
        error:
          "曲名を取得できませんでした。時間をおいて「投稿を更新」を押してください。",
      },
      { status: 502 },
    );
  }
}