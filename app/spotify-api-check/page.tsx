"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadSpotifyEmbedApi,
  type SpotifyController,
} from "@/lib/spotify-embed";

export default function SpotifyApiCheckPage() {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<SpotifyController | null>(null);

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("まだ読み込んでいません");

  useEffect(() => {
    if (!open) return;

    let active = true;
    let player: SpotifyController | null = null;

    const timer = window.setTimeout(() => {
      if (active) {
        setStatus("30秒経過：準備完了の通知が届いていません");
      }
    }, 30_000);

    setStatus("操作APIを読み込み中…");

    loadSpotifyEmbedApi()
      .then((api) => {
        if (!active || !container.current) return;

        setStatus("API取得成功。プレイヤーを作成中…");

        api.createController(
          container.current,
          {
            uri: "spotify:track:22BqQe9mJTZzaPcnaUuwGI",
            width: "100%",
            height: 352,
          },
          (created) => {
            if (!active) {
              created.destroy();
              return;
            }

            player = created;
            controller.current = created;

            created.addListener("ready", () => {
              if (!active) return;

              window.clearTimeout(timer);
              setReady(true);
              setStatus("準備完了。下のボタンで再生できます");
            });

            created.addListener("playback_update", (event) => {
              if (!active || !event?.data) return;

              setStatus(
                event.data.isPaused
                  ? "Spotifyから停止の通知が届きました"
                  : "Spotifyから再生の通知が届きました",
              );
            });
          },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;

        window.clearTimeout(timer);
        setStatus(
          error instanceof Error
            ? error.message
            : "読み込みに失敗しました",
        );
      });

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.current = null;
      player?.destroy();
    };
  }, [open]);

  function play() {
    try {
      controller.current?.play();
    } catch {
      setStatus("再生の指示に失敗しました");
    }
  }

  function pause() {
    try {
      controller.current?.pause();
    } catch {
      setStatus("停止の指示に失敗しました");
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Spotify操作APIの確認</h1>

      <p role="status">{status}</p>

      {!open && (
        <button type="button" onClick={() => setOpen(true)}>
          Spotifyを準備
        </button>
      )}

      <div style={{ display: "flex", gap: 16, margin: "20px 0" }}>
        <button type="button" disabled={!ready} onClick={play}>
          APIで再生
        </button>

        <button type="button" disabled={!ready} onClick={pause}>
          APIで停止
        </button>
      </div>

      {open && <div ref={container} />}
    </main>
  );
}