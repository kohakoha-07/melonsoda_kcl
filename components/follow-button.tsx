"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadFollowState,
  saveFollowState,
} from "@/lib/shared-follows";

export default function FollowButton({ userId }: { userId: string }) {
  const [following, setFollowing] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const state = await loadFollowState(userId);

        if (active) {
          setFollowing(state.following);
          setIsSelf(state.isSelf);
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "フォロー状態を読み込めませんでした。",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  async function toggle() {
    setBusy(true);
    setError("");

    try {
      await saveFollowState(userId, !following);

      // 保存後、実際の状態を読み直す
      const state = await loadFollowState(userId);
      setFollowing(state.following);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "保存できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p role="status">フォロー状態を確認中…</p>;

  if (isSelf) {
    return (
      <Link href="/profile/edit" className="button primary">
        プロフィール編集
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={following ? "button soft" : "button primary"}
        onClick={toggle}
        disabled={busy || Boolean(error)}
        aria-pressed={following}
      >
        {busy
          ? "処理中…"
          : following
            ? "フォロー中 ✓"
            : "＋ フォロー"}
      </button>

      {error && (
        <p role="alert">
          {error} ログイン状態を確認して再読み込みしてください。
        </p>
      )}
    </div>
  );
}