"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { Track } from "../lib/workshop/data";
import styles from "./turntable-player.module.css";

const REST = -18;
const ON_RECORD = 40;
const DROP_THRESHOLD = 12;

type Drag = {
  id: number;
  x: number;
  y: number;
  offset: number;
  moved: boolean;
  wasPlaying: boolean;
};

export default function TurntablePlayer({
  track,
  color = "pink",
}: {
  track: Track;
  color?: string;
}) {
  // 曲が変わったとき、前の曲の再生・ドラッグ状態を引き継がない。
  return (
    <Deck
      key={`${track.id}:${track.previewUrl ?? ""}`}
      track={track}
      color={color}
    />
  );
}

function Deck({ track, color }: { track: Track; color: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const pivot = useRef<HTMLSpanElement>(null);
  const drag = useRef<Drag | null>(null);
  const angleRef = useRef(REST);
  const operation = useRef(0);
  const [angle, setAngle] = useState(REST);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const hintId = useId();

  function moveArm(value: number) {
    angleRef.current = value;
    setAngle(value);
  }

  function reset() {
    setPlaying(false);
    setProgress(0);
    moveArm(REST);
  }

  function stop() {
    operation.current += 1;
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    reset();
  }

  async function start() {
    const element = audio.current;
    if (!element || !track.previewUrl) return;
    const request = ++operation.current;
    setError("");
    try {
      document.querySelectorAll<HTMLAudioElement>("audio").forEach((other) => {
        if (other !== element) other.pause();
      });
      element.currentTime = 0;
      // ドロップ／キー操作のイベント内でplayを呼び、スマホの自動再生制限に対応。
      await element.play();
    } catch {
      if (request !== operation.current) return;
      reset();
      setError(
        "試聴を再生できませんでした。もう一度操作するか、Spotifyで聴いてください。",
      );
    }
  }

  function pointerAngle(event: PointerEvent<HTMLButtonElement>) {
    const rect = pivot.current!.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(-dx, dy) * 180) / Math.PI;
  }

  function beginDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!track.previewUrl || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: pointerAngle(event) - angleRef.current,
      moved: false,
      wasPlaying: playing,
    };
  }

  function updateDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (
      Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5 &&
      !current.moved
    )
      return;
    if (!current.moved) {
      current.moved = true;
      operation.current += 1;
      audio.current?.pause();
    }
    moveArm(Math.max(-25, Math.min(55, pointerAngle(event) - current.offset)));
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    updateDrag(event);
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const shouldPlay = current.moved
      ? angleRef.current >= DROP_THRESHOLD
      : !current.wasPlaying;
    if (shouldPlay) void start();
    else stop();
  }

  function cancelDrag() {
    if (!drag.current) return;
    drag.current = null;
    stop();
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowRight", "ArrowUp", "End"].includes(event.key)) {
      event.preventDefault();
      void start();
    } else if (["ArrowLeft", "ArrowDown", "Home"].includes(event.key)) {
      event.preventDefault();
      stop();
    } else if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (playing) stop();
      else void start();
    }
  }

  return (
    <div className={`${styles.player} ${styles[color] ?? styles.pink}`}>
      <div className={styles.stage}>
        <span className={styles.brand} aria-hidden="true">
          MELOOP / 33⅓ RPM
        </span>
        <div
          className={`${styles.record} ${playing ? styles.spinning : ""}`}
          aria-hidden="true"
        >
          <div className={styles.label}>
            <span>meloop</span>
            <b>♪</b>
            <i />
          </div>
        </div>
        <button
          type="button"
          role="slider"
          className={styles.arm}
          style={{ transform: `rotate(${angle}deg)` }}
          aria-label={`${track.name}のレコード針`}
          aria-valuemin={-25}
          aria-valuemax={55}
          aria-valuenow={Math.round(angle)}
          aria-valuetext={
            playing
              ? "レコード上・再生中"
              : "停止中。右矢印で再生、左矢印で停止"
          }
          aria-describedby={hintId}
          disabled={!track.previewUrl}
          onPointerDown={beginDrag}
          onPointerMove={updateDrag}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
          onLostPointerCapture={cancelDrag}
          onKeyDown={keyboard}
        >
          <span ref={pivot} className={styles.pivot} aria-hidden="true" />
          <span className={styles.rod} aria-hidden="true" />
          <span className={styles.needle} aria-hidden="true" />
        </button>
        <span className={styles.light} aria-hidden="true" />
        <p id={hintId} className={styles.hint}>
          {track.previewUrl
            ? "針をレコードへ動かして離すと再生"
            : "この曲は試聴音源がありません"}
        </p>
      </div>
      <div className={styles.info}>
        <span className={styles.eyebrow}>TODAY’S ONE SONG</span>
        <h3>{track.name}</h3>
        <p>{track.artist}</p>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.play}
            disabled={!track.previewUrl}
            aria-label={playing ? "試聴を停止" : `${track.name}を試聴`}
            onClick={() => (playing ? stop() : void start())}
          >
            {playing ? "Ⅱ" : "▶"}
          </button>
          <div className={styles.progress}>
            <span>{track.previewUrl ? "最大15秒の試聴" : "試聴音源なし"}</span>
            <div className={styles.line}>
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <a href={track.spotifyUrl} target="_blank" rel="noreferrer">
          Spotifyで聴く ↗
        </a>
        {error && (
          <p className={styles.error} role="status">
            {error}
          </p>
        )}
      </div>
      {track.previewUrl && (
        <audio
          ref={audio}
          data-meloop-player
          src={track.previewUrl}
          preload="none"
          onPlay={() => {
            setPlaying(true);
            moveArm(ON_RECORD);
          }}
          onPause={() => {
            setPlaying(false);
            if (!drag.current) {
              moveArm(REST);
              setProgress(0);
            }
          }}
          onEnded={reset}
          onError={() => {
            reset();
            setError("音源を読み込めませんでした。Spotifyで聴いてください。");
          }}
          onTimeUpdate={() => {
            const time = audio.current?.currentTime ?? 0;
            if (time >= 15) stop();
            else setProgress((time / 15) * 100);
          }}
        />
      )}
    </div>
  );
}
