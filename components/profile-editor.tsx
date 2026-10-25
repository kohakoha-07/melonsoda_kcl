"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { loadMyProfile, saveMyProfile } from "@/lib/profiles";

export default function ProfileEditor() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const profile = await loadMyProfile();

        if (active && profile) {
          setUsername(profile.username ?? "");
          setBio(profile.bio ?? "");
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "読み込めませんでした。",
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
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await saveMyProfile(username, bio);
      setMessage("保存しました！");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "保存できませんでした。",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">読み込み中…</p>;
  if (loadError) return <p role="alert">{loadError}</p>;

  return (
    <section className="auth-card">
      <h1>プロフィール編集</h1>
      <form onSubmit={save}>
        <label>
          名前
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            maxLength={30}
            disabled={saving}
          />
        </label>

        <label>
          自己紹介
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={280}
            rows={5}
            disabled={saving}
          />
        </label>

        <button className="button primary" disabled={saving}>
          {saving ? "保存中…" : "保存する"}
        </button>
      </form>

      <p role="status">{message}</p>
      <Link href="/profile" className="button soft">
  ← プロフィールに戻る
</Link>
    </section>
  );
}