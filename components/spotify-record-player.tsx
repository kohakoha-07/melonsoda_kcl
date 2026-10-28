"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Track } from "@/lib/workshop/data";
import {
  loadSpotifyEmbedApi,
  type SpotifyController,
} from "@/lib/spotify-embed";
import RecordArm from "./record-arm";
import TurntablePlayer from "./turntable-player";
import styles from "./turntable-player.module.css";

export default function SpotifyRecordPlayer({
  track,
  color = "pink",
}: {
  track: Track;
  color?: string;
}) {
  // 試聴URLがある曲や、Spotify曲IDがないサンプルは従来の部品を使う
  if (track.previewUrl || !/^[A-Za-z0-9]{22}$/.test(track.id)) {
    return <TurntablePlayer track={track} color={color} />;
  }

  return <SpotifyDeck key={track.id} track={track} color={color} />;
}

function SpotifyDeck({
  track,
  color,
}: {
  track: Track;
  color: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<SpotifyController | null>(null);
  const startPosition = useRef<number | null>(null);
  const wasPlaying = useRef(false);
  const playerId = useId();

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let active = true;
    let created: SpotifyController | null = null;

    function stopOtherPlayers() {
      document
        .querySelectorAll<HTMLAudioElement>("audio[data-meloop-player]")
        .forEach((audio) => audio.pause());

      window.dispatchEvent(
        new CustomEvent("meloop:spotify-play", { detail: playerId }),
      );
    }

    function onOtherPlayer(event: Event) {
      if ((event as CustomEvent<string>).detail === playerId) return;

      controller.current?.pause();
      wasPlaying.current = false;
      startPosition.current = null;
      setPlaying(false);
      setProgress(0);
    }

    function onNativePlay(event: Event) {
      if (!(event.target instanceof HTMLAudioElement)) return;

      controller.current?.pause();
      wasPlaying.current = false;
      startPosition.current = null;
      setPlaying(false);
      setProgress(0);
    }

    window.addEventListener("meloop:spotify-play", onOtherPlayer);
    document.addEventListener("play", onNativePlay, true);

    const timer = window.setTimeout(() => {
      if (active) {
        setError("準備に時間がかかっています。再読み込みしてください。");
      }
    }, 30000);

    loadSpotifyEmbedApi()
      .then((api) => {
        if (!active || !container.current) return;

        api.createController(
          container.current,
          {
            uri: `spotify:track:${track.id}`,
            width: "100%",
            height: 152,
          },
          (player) => {
            if (!active) {
              player.destroy();
              return;
            }

            created = player;
            controller.current = player;

            player.addListener("ready", () => {
              if (!active) return;
              window.clearTimeout(timer);
              setReady(true);
              setError("");
            });

            player.addListener("playback_update", (event) => {
              if (!active || !event?.data) return;

              const { isPaused, position } = event.data;

              if (isPaused) {
                wasPlaying.current = false;
                startPosition.current = null;
                setPlaying(false);
                setProgress(0);
                return;
              }

              if (!wasPlaying.current) {
                stopOtherPlayers();
              }

              wasPlaying.current = true;

              if (
                startPosition.current === null ||
                position < startPosition.current
              ) {
                startPosition.current = position;
              }

              const elapsed = position - startPosition.current;

              // 再生開始位置から最大15秒で止める
              if (elapsed >= 15000) {
                player.pause();
                wasPlaying.current = false;
                startPosition.current = null;
                setPlaying(false);
                setProgress(0);
                return;
              }

              setPlaying(true);
              setProgress(Math.min((elapsed / 15000) * 100, 100));
            });
          },
        );
      })
      .catch((error) => {
        if (!active) return;
        window.clearTimeout(timer);
        setError(
          error instanceof Error
            ? error.message
            : "Spotifyを読み込めませんでした。",
        );
      });

    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener("meloop:spotify-play", onOtherPlayer);
      document.removeEventListener("play", onNativePlay, true);
      created?.destroy();
      controller.current = null;
    };
  }, [open, track.id, playerId]);

  function play() {
    if (!ready || !controller.current) return;

    setError("");
    startPosition.current = null;

    try {
      controller.current.play();
    } catch {
      setError("再生できませんでした。公式プレイヤーでも確認してください。");
    }
  }

  function pause() {
    try {
      controller.current?.pause();
      wasPlaying.current = false;
      startPosition.current = null;
      setPlaying(false);
      setProgress(0);
    } catch {
      setError("停止できませんでした。公式プレイヤーで停止してください。");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className={`${styles.player} ${styles[color] ?? styles.pink}`}>
        <RecordArm
          name={track.name}
          playing={playing}
          disabled={!ready}
          onPlay={play}
          onPause={pause}
        />

        <div className={styles.info}>
          <span className={styles.eyebrow}>TODAY’S ONE SONG</span>
          <h3>{track.name}</h3>
          <p>{track.artist}</p>

          {!open ? (
            <button
              type="button"
              className="button soft"
              onClick={() => setOpen(true)}
            >
              Spotifyを準備
            </button>
          ) : (
            <>
              <p>{ready ? "針を動かして再生・停止" : "Spotifyを準備中…"}</p>
              <div className={styles.line}>
                <i style={{ width: `${progress}%` }} />
              </div>
            </>
          )}

          <a href={track.spotifyUrl} target="_blank" rel="noreferrer">
            Spotifyで聴く ↗
          </a>

          {error && <p role="alert">{error}</p>}
        </div>
      </div>

      {open && (
        <div>
          <div ref={container} />
          <p className="small-print">
            Spotify公式プレイヤーと連動しています。
            再生できる範囲はSpotify側の条件によります。
          </p>
        </div>
      )}
    </div>
  );
}