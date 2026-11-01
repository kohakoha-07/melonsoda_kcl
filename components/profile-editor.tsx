"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AVATAR_EMOJIS, loadMyProfile, saveMyProfile } from "@/lib/profiles";
import UserAvatar from "@/components/user-avatar";

export default function ProfileEditor() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [mode, setMode] = useState<"emoji" | "image">("emoji");
  const [emoji, setEmoji] = useState("🎧");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    void loadMyProfile().then((profile) => {
      if (!active || !profile) return;
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setSavedUrl(profile.avatar_url ?? null);
      setMode(profile.avatar_url ? "image" : "emoji");
      setEmoji(AVATAR_EMOJIS.includes(profile.avatar_emoji) ? profile.avatar_emoji : "🎧");
    }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : "読み込めませんでした。");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setMessage("");
    try {
      await saveMyProfile(username, bio, { mode, emoji, file });
      setMessage("保存しました！「プロフィールに戻る」で確認できます。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  if (loading) return <p role="status">読み込み中…</p>;
  if (loadError) return <p role="alert">{loadError}</p>;

  return (
    <section className="auth-card">
      <h1>プロフィール編集</h1>
      <form onSubmit={save}>
        <fieldset disabled={saving} style={{ border: 0, padding: 0, marginBottom: 20, minWidth: 0 }}>
          <legend>アイコン</legend>
          <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
            <UserAvatar url={mode === "image" ? preview || savedUrl : null}
              emoji={emoji} name={username || "あなた"} size={96} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className={`button ${mode === "emoji" ? "primary" : "soft"}`}
              aria-pressed={mode === "emoji"} onClick={() => setMode("emoji")}>絵文字</button>
            <button type="button" className={`button ${mode === "image" ? "primary" : "soft"}`}
              aria-pressed={mode === "image"} onClick={() => setMode("image")}>画像</button>
          </div>
          {mode === "emoji" ? (
            <div role="group" aria-label="アイコンの絵文字" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {AVATAR_EMOJIS.map((item) => (
                <button key={item} type="button" aria-label={`${item}をアイコンにする`}
                  aria-pressed={emoji === item} onClick={() => setEmoji(item)}
                  style={{ fontSize: 28, padding: 8, borderRadius: 12, cursor: "pointer",
                    border: emoji === item ? "2px solid #436957" : "2px solid transparent",
                    background: emoji === item ? "#e2eddf" : "#f6f6f2" }}>{item}</button>
              ))}
            </div>
          ) : (
            <label style={{ marginTop: 12 }}>
              アイコンにする画像（JPEG・PNG・WebP、2MB以下）
              <input type="file" accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (!selected) return;
                  if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
                      selected.size === 0 || selected.size > 2 * 1024 * 1024) {
                    setMessage("JPEG・PNG・WebPの2MB以下の画像を選んでください。");
                    event.target.value = "";
                    return;
                  }
                  setFile(selected);
                  setMessage("");
                }} />
              <small>画像は丸く切り抜いて表示します。保存した画像は公開されます。</small>
            </label>
          )}
        </fieldset>
        <label>名前
          <input value={username} onChange={(event) => setUsername(event.target.value)}
            required maxLength={30} disabled={saving} />
        </label>
        <label>自己紹介
          <textarea value={bio} onChange={(event) => setBio(event.target.value)}
            maxLength={280} rows={5} disabled={saving} />
        </label>
        <button className="button primary" disabled={saving}>{saving ? "保存中…" : "保存する"}</button>
      </form>
      <p role="status">{message}</p>
      <Link href="/profile" className="button soft">← プロフィールに戻る</Link>
    </section>
  );
}
