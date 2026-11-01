"use client";

import { useState } from "react";

export default function UserAvatar({ url, emoji = "🎧", name = "ユーザー", className = "avatar mint", size }: {
  url?: string | null;
  emoji?: string | null;
  name?: string;
  className?: string;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span className={className} role="img" aria-label={`${name}のアイコン`}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden", borderRadius: "50%",
        ...(size ? { width: size, height: size, fontSize: size * 0.5 } : {}) }}>
      {url && failedUrl !== url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" onError={() => setFailedUrl(url)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : emoji || "🎧"}
    </span>
  );
}
