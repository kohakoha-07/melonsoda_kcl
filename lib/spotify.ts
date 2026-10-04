const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getSpotifyToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Spotifyの環境変数が設定されていません");
  }

  const auth = Buffer.from(
    `${CLIENT_ID}:${CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Spotify認証エラー: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  return data.access_token;
}

export async function searchSpotify(query: string) {
  const token = await getSpotifyToken();

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=track,artist&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Spotify検索エラー: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  return {
    tracks: data.tracks?.items ?? [],
    artists: data.artists?.items ?? [],
  };
}