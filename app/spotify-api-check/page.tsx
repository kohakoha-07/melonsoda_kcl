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
      <h1>針付きプレイヤーの確認</h1>

      <p>
        「Spotifyを準備」を押し、準備ができたら針を動かしてください。
      </p>

      <SpotifyRecordPlayer
        track={{
          id: "22BqQe9mJTZzaPcnaUuwGI",
          name: "再生確認用の曲",
          artist: "",
          previewUrl: null,
          spotifyUrl:
            "https://open.spotify.com/track/22BqQe9mJTZzaPcnaUuwGI",
        }}
        color="blue"
      />
    </main>
  );
}