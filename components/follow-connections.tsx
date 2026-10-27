"use client";
import styles from "./follow-connections.module.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadFollowCounts,
  loadFollowPeople,
  type FollowListKind,
} from "@/lib/follow-lists";

type Person = {
  userId: string;
  username: string;
  bio: string;
};

export default function FollowConnections({
  userId,
}: {
  userId: string;
}) {
  const [counts, setCounts] = useState<{
    following: number;
    followers: number;
  } | null>(null);

  const [kind, setKind] = useState<FollowListKind | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const nextCounts = await loadFollowCounts(userId);

        const result = kind
          ? await loadFollowPeople(userId, kind, page)
          : { people: [], hasMore: false };

        if (active) {
          setCounts(nextCounts);
          setPeople(result.people);
          setHasMore(result.hasMore);
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "一覧を読み込めませんでした。再読み込みしてください。",
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
  }, [userId, kind, page]);

  function openList(nextKind: FollowListKind) {
    setPage(0);
    setKind(nextKind);
  }

  return (
    <section
      aria-label="フォロー関係"
      style={{ margin: "24px 0", padding: "0 16px" }}
    >
      
        <div className={styles.stats}>
  <button
    type="button"
    className={styles.stat}
    disabled={loading}
    aria-pressed={kind === "followers"}
    onClick={() => openList("followers")}
  >
    <span className={styles.number}>
      {counts?.followers ?? "—"}
    </span>
    <span className={styles.label}>フォロワー</span>
  </button>

  <button
    type="button"
    className={styles.stat}
    disabled={loading}
    aria-pressed={kind === "following"}
    onClick={() => openList("following")}
  >
    <span className={styles.number}>
      {counts?.following ?? "—"}
    </span>
    <span className={styles.label}>フォロー中</span>
  </button>
</div>

      {loading && <p role="status">読み込み中…</p>}
      {error && <p role="alert">{error}</p>}

      {kind && !loading && !error && (
        <div style={{ maxWidth: 420, margin: "20px auto" }}>
          <h3>
            {kind === "following" ? "フォロー中" : "フォロワー"}
          </h3>

          {people.length === 0 ? (
            <p>まだいません。</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {people.map((person) => (
                <li
                  key={person.userId}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid #e5e8df",
                  }}
                >
                  <Link href={`/profile/${person.userId}`}>
                    🎧 {person.username} →
                  </Link>
                  <p style={{ margin: "4px 0", fontSize: 12 }}>
                    {person.bio}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <button
              type="button"
              className="button soft"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              ← 前へ
            </button>

            <button
              type="button"
              className="button soft"
              disabled={!hasMore}
              onClick={() => setPage((value) => value + 1)}
            >
              次へ →
            </button>
          </div>

          <button
            type="button"
            className="button soft"
            style={{ marginTop: 16 }}
            onClick={() => setKind(null)}
          >
            一覧を閉じる
          </button>
        </div>
      )}
    </section>
  );
}