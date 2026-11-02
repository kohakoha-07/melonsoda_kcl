export const POST_COLORS = [
  { value: "white", label: "白", background: "#fffefb", border: "#dfe5d8" },
  { value: "pink", label: "ピンク", background: "#fff8f9", border: "#e9b8c4" },
  { value: "blue", label: "青", background: "#f7faff", border: "#b5cce8" },
  { value: "green", label: "緑", background: "#f7faf3", border: "#bdcfac" },
  { value: "yellow", label: "黄", background: "#fffcef", border: "#e3d195" },
  { value: "purple", label: "紫", background: "#fbf8fe", border: "#d2bfe5" },
] as const;
export type PostColor = (typeof POST_COLORS)[number]["value"];
export function isPostColor(value: unknown): value is PostColor {
  return POST_COLORS.some((color) => color.value === value);
}
export function postColorStyle(value: unknown) {
  const color = POST_COLORS.find((color) => color.value === value) ?? POST_COLORS[0];
  return { background: color.background, borderColor: color.border };
}
