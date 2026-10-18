// 画面を作るためのサンプルです。実際の投稿・ユーザーではありません。
export type Track = {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  spotifyUrl: string;
};
export const people = [
  {
    id: "hina",
    name: "ひな",
    handle: "hina_music",
    icon: "🌷",
    bio: "帰り道に聴く、やさしい音楽。",
    color: "pink",
  },
  {
    id: "sora",
    name: "そら",
    handle: "sora_records",
    icon: "☁️",
    bio: "インディーポップと、たまにジャズ。",
    color: "blue",
  },
  {
    id: "mugi",
    name: "むぎ",
    handle: "mugi_day",
    icon: "🌼",
    bio: "今日も音楽とコーヒー。",
    color: "yellow",
  },
];
export const posts = [
  {
    id: "p1",
    person: people[0],
    text: "授業おわり、少し遠回りして帰りたくなる曲 🌷 みんなの帰り道の一曲も知りたいな。",
    tag: "# 帰り道のおとも",
    time: "12分前",
    color: "pink",
    track: {
      id: "sample1",
      name: "春泥棒",
      artist: "ヨルシカ",
      previewUrl: null,
      spotifyUrl: "https://open.spotify.com/search/春泥棒",
    },
  },
  {
    id: "p2",
    person: people[1],
    text: "レポートを書きながら、ずっとリピート。夜の静かな時間によく合う ☾",
    tag: "# 夜ふかしプレイリスト",
    time: "28分前",
    color: "blue",
    track: {
      id: "sample2",
      name: "きらり",
      artist: "藤井 風",
      previewUrl: null,
      spotifyUrl: "https://open.spotify.com/search/きらり",
    },
  },
  {
    id: "p3",
    person: people[2],
    text: "なんでもない日が、ちょっと特別になる。今週もおつかれさま！",
    tag: "# 気分をあげたい日",
    time: "1時間前",
    color: "yellow",
    track: {
      id: "sample3",
      name: "怪獣の花唄",
      artist: "Vaundy",
      previewUrl: null,
      spotifyUrl: "https://open.spotify.com/search/怪獣の花唄",
    },
  },
];
