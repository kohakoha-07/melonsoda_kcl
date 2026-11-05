export default function SpotifyCheckPage() {
  return (
    <main style={{ padding: 20 }}>
      <h1>Spotify表示テスト</h1>

      <iframe
        title="Spotify公式プレイヤー"
        src="https://open.spotify.com/embed/track/22BqQe9mJTZzaPcnaUuwGI"
        width="100%"
        height="352"
        style={{ border: 0, borderRadius: 12 }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    </main>
  );
}