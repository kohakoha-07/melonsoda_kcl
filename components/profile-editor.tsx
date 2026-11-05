"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { AVATAR_EMOJIS, loadMyProfile, saveMyProfile } from "@/lib/profiles";
import { prepareAvatarImage } from "@/lib/avatar-image";
import UserAvatar from "@/components/user-avatar";

export default function ProfileEditor() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [mode, setMode] = useState<"emoji" | "image">("emoji");
  const [emoji, setEmoji] = useState("🎧");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const selecting = useRef(false);
  const selectionVersion = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
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
    return () => { active = false; mounted.current = false; selectionVersion.current += 1; };
  }, []);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0];
    if (!selected) return; // ファイル選択をキャンセルしたときは、前の選択を残す。
    const input = event.currentTarget;
    const version = ++selectionVersion.current;
    selecting.current = true;
    setProcessing(true);
    setImageError("");
    setMessage("");
    try {
      const prepared = await prepareAvatarImage(selected);
      if (!mounted.current || version !== selectionVersion.current) return;
      setFile(prepared);
      setFileName(selected.name);
      setMode("image");
    } catch (error) {
      if (mounted.current && version === selectionVersion.current) {
        input.value = ""; // 失敗した画像を選び直せるようにする。
        setImageError(error instanceof Error ? error.message : "画像を読み込めませんでした。");
      }
    } finally {
      if (mounted.current && version === selectionVersion.current) {
        selecting.current = false;
        setProcessing(false);
      }
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || selecting.current) return;
    if (mode === "image" && (imageError || (!file && !savedUrl))) {
      setImageError(imageError || "「画像を選ぶ」からアイコン画像を選んでください。");
      return;
    }
    lock.current = true;
    setSaving(true);
    setMessage("");
    try {
      await saveMyProfile(username, bio, { mode, emoji, file });
    } catch (error) {
      if (mounted.current) {
        setMessage(error instanceof Error ? error.message : "保存できませんでした。");
        setSaving(false);
      }
      lock.current = false;
      return;
    }
    if (mounted.current) setMessage("保存しました！「プロフィールに戻る」で確認できます。");
    // 保存成功後の再取得に失敗しても、保存失敗とは表示しない。
    try {
      const profile = await loadMyProfile();
      if (mounted.current && profile) {
        setSavedUrl(profile.avatar_url ?? null);
        setFile(null);
        setFileName("");
      }
    } catch { /* 保存結果はプロフィール画面で確認できる。 */ }
    finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
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
            <div style={{ marginTop: 16 }}>
              <label>
                画像を選ぶ（10MBまで）
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  onChange={(event) => void selectImage(event)} />
              </label>
              <p style={{ fontSize: 13, lineHeight: 1.8 }}>
                JPEG・PNG・WebPに対応。保存前に中央を正方形に切り抜き、小さく縮小します。
                HEICは端末で読み込める場合に利用できます。保存した画像は公開されます。
              </p>
              {processing && <p role="status">画像を準備中…</p>}
              {file && <p role="status" style={{ fontSize: 13, overflowWrap: "anywhere" }}>
                選択中：{fileName}（保存サイズ：約{Math.max(1, Math.round(file.size / 1024))}KB）
              </p>}
              {!file && savedUrl && <p style={{ fontSize: 13 }}>現在保存されている画像を使用します。</p>}
              {imageError && <p role="alert" style={{ color: "#943e42" }}>{imageError}</p>}
            </div>
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
        <button className="button primary" disabled={saving || processing || (mode === "image" && Boolean(imageError))}>
          {saving ? "保存中…" : processing ? "画像を準備中…" : "保存する"}
        </button>
      </form>
      <p role="status">{message}</p>
      <Link href="/profile" className="button soft">← プロフィールに戻る</Link>
    </section>
  );
}
