import { NextRequest, NextResponse } from "next/server";
import { searchSpotify } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");

    if (!query || query.trim() === "") {
      return NextResponse.json(
        {
          error: "検索ワードを入力してください",
        },
        { status: 400 }
      );
    }

    const searchWord = query.trim();

    const { tracks, artists } = await searchSpotify(searchWord);

    return NextResponse.json({
      query: searchWord,
      tracks,
      artists,
    });
  } catch (error) {
    console.error("Spotify Search Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "検索に失敗しました",
      },
      { status: 500 }
    );
  }
}