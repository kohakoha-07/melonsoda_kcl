"use client";

import { useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "./profile-qr.module.css";

export default function ProfileQr({ userId }: { userId: string }) {
  const [url, setUrl] = useState("");
  const panelId = useId();

  function toggle() {
    setUrl(
      url
        ? ""
        : `${window.location.origin}/profile/${encodeURIComponent(userId)}`,
    );
  }

  return (
    <div className={styles.share}>
      <button
        type="button"
        className={styles.shareButton}
        onClick={toggle}
        aria-expanded={Boolean(url)}
        aria-controls={panelId}
      >
        ♫ {url ? "チケットを閉じる" : "QRでつながる"}
      </button>

      <div id={panelId} hidden={!url}>
        {url && (
          <section className={styles.ticket}>
            <header className={styles.ticketHeader}>
              <span>MELOOP MUSIC CLUB</span>
              <span aria-hidden="true">✦</span>
            </header>

            <div className={styles.ticketBody}>
              <span className={styles.sticker}>HELLO, MUSIC LOVER!</span>
              <h2>好きな音から、つながろう。</h2>
              <p>読み取って、この人の音楽に出会おう。</p>

              <div className={styles.qr}>
                <QRCodeSVG
                  value={url}
                  size={176}
                  level="M"
                  title="プロフィール共有用QRコード"
                />
              </div>

              <span className={styles.handwriting}>
                nice to meet you ♡
              </span>
            </div>

            <footer className={styles.ticketFooter}>
              <span aria-hidden="true">🎸</span>
              <div>
                <b>PROFILE PASS</b>
                <span>あなたの「好き」を、もっと近くに。</span>
              </div>
              <span aria-hidden="true">♫</span>
            </footer>

            <details className={styles.linkDetails}>
              <summary>共有するURLを見る</summary>
              <p>{url}</p>
            </details>

            {/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url) && (
              <p className={styles.notice}>
                ローカル確認用です。スマホ共有には公開URLなどが必要です。
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}