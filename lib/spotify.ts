import SpotifyWebApi from "spotify-web-api-node";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

export async function searchSpotifyTracks(query: string) {
  const tokenData = await spotifyApi.clientCredentialsGrant();

  spotifyApi.setAccessToken(tokenData.body.access_token);

  const data = await spotifyApi.searchTracks(query, {
    limit: 10,
  });

  return data.body.tracks?.items ?? [];
}