import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyTracks } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "検索ワードを入力してください" },
        { status: 400 }
      );
    }

    const tracks = await searchSpotifyTracks(query);

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Spotify API Error:", error);

    return NextResponse.json(
      { error: "Spotify APIの取得に失敗しました" },
      { status: 500 }
    );
  }
}