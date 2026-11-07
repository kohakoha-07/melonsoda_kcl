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
  if (track.previewUrl || !/^[A-Za-z0-9]{22}$/.test(track.id)) {
    return <TurntablePlayer track={track} color={color} />;
  }

  return (
    <SpotifyDeck
      key={track.id}
      track={track}
      color={color}
    />
  );
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
  const playerId = useId();

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  // 確認ページと同じ手順でSpotifyを読み込む。
  useEffect(() => {
    if (!open) return;

    let active = true;
    let player: SpotifyController | null = null;

    const timer = window.setTimeout(() => {
      if (active) {
        setStatus(
          "準備に時間がかかっています。ページを再読み込みしてください。",
        );
      }
    }, 30_000);

    setStatus("Spotifyを読み込み中…");

    loadSpotifyEmbedApi()
      .then((api) => {
        if (!active || !container.current) return;

        setStatus("Spotifyのプレイヤーを準備中…");

        api.createController(
          container.current,
          {
            uri: `spotify:track:${track.id}`,
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

              const { isPaused, position } = event.data;

              if (isPaused) {
                startPosition.current = null;
                setPlaying(false);
                setProgress(0);
                setStatus("停止中。針を動かして再生できます");
                return;
              }

              setPlaying(true);
              setStatus("再生中。針を戻すと停止します");

              if (!Number.isFinite(position)) return;

              if (
                startPosition.current === null ||
                position < startPosition.current
              ) {
                startPosition.current = position;
              }

              const elapsed = position - startPosition.current;

              if (elapsed >= 15_000) {
                created.pause();
                startPosition.current = null;
                setPlaying(false);
                setProgress(0);
                setStatus("15秒で停止しました");
                return;
              }

              setProgress(
                Math.min(100, Math.max(0, elapsed / 150)),
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
            : "Spotifyを読み込めませんでした。",
        );
      });

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.current = null;
      player?.destroy();
    };
  }, [open, track.id]);

  // 別のプレイヤーで再生が始まったら停止する。
  useEffect(() => {
    function stop() {
      try {
        controller.current?.pause();
      } catch {
        setStatus("下のSpotifyプレイヤーで停止してください。");
      }

      startPosition.current = null;
      setPlaying(false);
      setProgress(0);
    }

    function onOtherPlayer(event: Event) {
      if ((event as CustomEvent<string>).detail !== playerId) {
        stop();
      }
    }

    function onNativePlay(event: Event) {
      if (event.target instanceof HTMLAudioElement) {
        stop();
      }
    }

    window.addEventListener("meloop:spotify-play", onOtherPlayer);
    document.addEventListener("play", onNativePlay, true);

    return () => {
      window.removeEventListener(
        "meloop:spotify-play",
        onOtherPlayer,
      );
      document.removeEventListener("play", onNativePlay, true);
    };
  }, [playerId]);

  // 実際に再生が始まってから、ほかの音を止める。
  useEffect(() => {
    if (!playing) return;

    document
      .querySelectorAll<HTMLAudioElement>("audio[data-meloop-player]")
      .forEach((audio) => audio.pause());

    window.dispatchEvent(
      new CustomEvent("meloop:spotify-play", {
        detail: playerId,
      }),
    );
  }, [playing, playerId]);

  function play() {
    if (!ready || !controller.current) return;

    try {
      setStatus(
        "再生を開始します。音が出なければ下のSpotifyの▶を押してください。",
      );
      controller.current.play();
    } catch {
      setStatus("下のSpotifyの▶を直接押してください。");
    }
  }

  function pause() {
    if (!ready || !controller.current) return;

    try {
      controller.current.pause();
      startPosition.current = null;
      setPlaying(false);
      setProgress(0);
    } catch {
      setStatus("下のSpotifyプレイヤーで停止してください。");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {status && <p role="status">{status}</p>}

      {!open && (
        <button
          type="button"
          className="button soft"
          onClick={() => setOpen(true)}
        >
          Spotifyを準備
        </button>
      )}

      <div className={`${styles.player} ${styles[color] ?? styles.pink}`}>
        <RecordArm
          name={track.name}
          playing={playing}
          disabled={!ready}
          onPlay={play}
          onPause={pause}
        />

        <div className={styles.info}>
          <span className={styles.eyebrow}>
            TODAY’S ONE SONG
          </span>

          <h3>{track.name}</h3>
          <p>{track.artist}</p>

          {ready && (
            <div className={styles.line}>
              <i style={{ width: `${progress}%` }} />
            </div>
          )}

          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noreferrer"
          >
            Spotifyで聴く ↗
          </a>
        </div>
      </div>

      {open && <div ref={container} />}

      {ready && (
        <p className="small-print">
          針で音が出ない場合は、最初にSpotifyの▶を直接押してください。
          再生できる範囲はSpotify側の条件によります。
        </p>
      )}
    </div>
  );
}