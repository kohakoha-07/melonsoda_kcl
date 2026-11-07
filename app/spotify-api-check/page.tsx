"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadSpotifyEmbedApi,
  type SpotifyController,
} from "@/lib/spotify-embed";
import RecordArm from "@/components/record-arm";
import styles from "@/components/turntable-player.module.css";

export default function SpotifyApiCheckPage() {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<SpotifyController | null>(null);

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("準備ボタンを押してください");

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
            height: 152,
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
              setStatus("準備完了。針を動かしてください");
            });

            created.addListener("playback_update", (event) => {
              if (!active || !event?.data) return;

              setPlaying(!event.data.isPaused);
              setStatus(
                event.data.isPaused ? "停止中" : "再生中",
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
    if (!ready || !controller.current) return;

    try {
      controller.current.play();
    } catch {
      setStatus("再生の指示に失敗しました");
    }
  }

  function pause() {
    if (!ready || !controller.current) return;

    try {
      controller.current.pause();
    } catch {
      setStatus("停止の指示に失敗しました");
    }
  }

   return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
      <h1>針とSpotifyの連動確認</h1>

      <p role="status">{status}</p>

      {!open && (
        <button type="button" onClick={() => setOpen(true)}>
          Spotifyを準備
        </button>
      )}

      <div className={`${styles.player} ${styles.blue}`}>
        <RecordArm
          name="再生確認用の曲"
          playing={playing}
          disabled={!ready}
          onPlay={play}
          onPause={pause}
        />

        <div className={styles.info}>
          <p>
            準備できたら針をレコードへ動かしてください。
            音が出ない場合は、下のSpotifyの▶も試してください。
          </p>
        </div>
      </div>

      {open && <div ref={container} />}
    </main>
  );
}