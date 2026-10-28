// Spotify公式プレイヤーの操作に使う型
export type SpotifyPlaybackEvent = {
  data: {
    isPaused: boolean;
    position: number;
  };
};

export type SpotifyController = {
  play: () => void;
  pause: () => void;
  destroy: () => void;
  addListener: (
    name: "ready" | "playback_update",
    callback: (event: SpotifyPlaybackEvent) => void,
  ) => void;
};

export type SpotifyEmbedApi = {
  createController: (
    element: HTMLElement,
    options: {
      uri: string;
      width: string;
      height: number;
    },
    callback: (controller: SpotifyController) => void,
  ) => void;
};

// 複数の投稿があっても、操作APIは一度だけ読み込む
let apiPromise: Promise<SpotifyEmbedApi> | null = null;

export function loadSpotifyEmbedApi(): Promise<SpotifyEmbedApi> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const spotifyWindow = window as unknown as {
      onSpotifyIframeApiReady?: (api: SpotifyEmbedApi) => void;
    };

    const previousCallback = spotifyWindow.onSpotifyIframeApiReady;
    const script = document.createElement("script");

    const timer = window.setTimeout(() => {
      fail();
    }, 20000);

    function restoreCallback() {
      if (spotifyWindow.onSpotifyIframeApiReady === onReady) {
        spotifyWindow.onSpotifyIframeApiReady = previousCallback;
      }
    }

    function fail() {
      window.clearTimeout(timer);
      restoreCallback();
      script.remove();
      apiPromise = null;
      reject(new Error("Spotifyを読み込めませんでした。再読み込みしてください。"));
    }

    function onReady(api: SpotifyEmbedApi) {
      window.clearTimeout(timer);
      restoreCallback();
      resolve(api);
      previousCallback?.(api);
    }

    spotifyWindow.onSpotifyIframeApiReady = onReady;

    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onerror = fail;

    document.body.appendChild(script);
  });

  return apiPromise;
}
