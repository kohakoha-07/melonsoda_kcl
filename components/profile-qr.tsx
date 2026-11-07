"use client";

import { useEffect, useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import styles from "./profile-qr.module.css";

export default function ProfileQr({ userId }: { userId: string }) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [share, setShare] = useState<{
    userId: string;
    url: string;
  } | null>(null);

  const panelId = useId();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let authChanged = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (!active) return;

      setViewerId(session?.user.id ?? null);
      setShare(null);
    });

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active || authChanged) return;
        setViewerId(error ? null : data.user?.id ?? null);
      })
      .catch(() => {
        if (active && !authChanged) {
          setViewerId(null);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // 本人確認が終わるまで、また他人のプロフィールでは表示しない。
  if (!viewerId || viewerId !== userId) {
    return null;
  }

  const url = share?.userId === userId ? share.url : "";

  function toggle() {
    if (viewerId !== userId) return;

    setShare(
      url
        ? null
        : {
            userId,
            url: `${window.location.origin}/profile/${encodeURIComponent(userId)}`,
          },
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
        ♫ {url ? "チケットを閉じる" : "自分のQRでつながる"}
      </button>

      <div id={panelId} hidden={!url}>
        {url && (
          <section className={styles.ticket}>
            <header className={styles.ticketHeader}>
              <span>MELOOP MUSIC CLUB</span>
              <span aria-hidden="true">✦</span>
            </header>

            <div className={styles.ticketBody}>
              <span className={styles.sticker}>
                HELLO, MUSIC LOVER!
              </span>

              <h2>好きな音から、つながろう。</h2>
              <p>読み取って、この人の音楽に出会おう。</p>

              <div className={styles.qr}>
                <QRCodeSVG
                  value={url}
                  size={176}
                  level="M"
                  title="自分のプロフィール共有用QRコード"
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

            {["localhost", "127.0.0.1", "[::1]"].includes(
              new URL(url).hostname,
            ) && (
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