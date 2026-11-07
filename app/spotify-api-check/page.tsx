"use client";

import SpotifyRecordPlayer from "@/components/spotify-record-player";

export default function SpotifyApiCheckPage() {
  return (
    <main
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <h1>本番プレイヤーの単独確認</h1>

      <SpotifyRecordPlayer
        track={{
          id: "5JUj6RujNvWQ5QipHBKgZC",
          name: "再生確認用の曲",
          artist: "",
          previewUrl: null,
          spotifyUrl:
            "https://open.spotify.com/track/5JUj6RujNvWQ5QipHBKgZC",
        }}
        color="blue"
      />
    </main>
  );
}