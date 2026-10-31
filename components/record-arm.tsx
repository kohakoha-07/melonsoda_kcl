"use client";

import {
  useId,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import styles from "./turntable-player.module.css";

type Props = {
  name: string;
  playing: boolean;
  disabled: boolean;
  onPlay: () => void;
  onPause: () => void;
};

type Drag = {
  id: number;
  x: number;
  y: number;
  offset: number;
  angle: number;
  moved: boolean;
  wasPlaying: boolean;
};

export default function RecordArm({
  name,
  playing,
  disabled,
  onPlay,
  onPause,
}: Props) {
  const pivot = useRef<HTMLSpanElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const hintId = useId();

  const angle = dragAngle ?? (playing ? 40 : -18);

  function pointerAngle(event: PointerEvent<HTMLButtonElement>) {
    const rect = pivot.current!.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);

    return (Math.atan2(-dx, dy) * 180) / Math.PI;
  }

  function begin(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || !event.isPrimary || event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: pointerAngle(event) - angle,
      angle,
      moved: false,
      wasPlaying: playing,
    };

    setDragAngle(angle);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;

    const distance = Math.hypot(
      event.clientX - current.x,
      event.clientY - current.y,
    );

    if (distance < 5 && !current.moved) return;

    if (!current.moved) {
      current.moved = true;
    }

    current.angle = Math.max(
      -25,
      Math.min(55, pointerAngle(event) - current.offset),
    );

    setDragAngle(current.angle);
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;

    move(event);
    drag.current = null;
    setDragAngle(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const shouldPlay = current.moved
      ? current.angle >= 12
      : !current.wasPlaying;

    if (shouldPlay) onPlay();
    else onPause();
  }

  function cancel() {
    if (!drag.current) return;

    drag.current = null;
    setDragAngle(null);
    onPause();
  }

  return (
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
        disabled={disabled}
        aria-label={`${name}のレコード針`}
        aria-valuemin={-25}
        aria-valuemax={55}
        aria-valuenow={Math.round(angle)}
        aria-valuetext={playing ? "再生中" : "停止中"}
        aria-describedby={hintId}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onKeyDown={(event) => {
          if (["ArrowRight", "ArrowUp", "End"].includes(event.key)) {
            event.preventDefault();
            onPlay();
          } else if (
            ["ArrowLeft", "ArrowDown", "Home"].includes(event.key)
          ) {
            event.preventDefault();
            onPause();
          } else if (["Enter", " "].includes(event.key)) {
            event.preventDefault();
            if (playing) onPause();
            else onPlay();
          }
        }}
      >
        <span ref={pivot} className={styles.pivot} aria-hidden="true" />
        <span className={styles.rod} aria-hidden="true" />
        <span className={styles.needle} aria-hidden="true" />
      </button>

      <p id={hintId} className={styles.hint}>
        {disabled
          ? "Spotifyの準備ができるまでお待ちください"
          : "針をレコードへ動かして離すと再生"}
      </p>
    </div>
  );
}