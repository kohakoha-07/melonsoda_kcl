export const MAX_AVATAR_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024;
const OUTPUT_SIZE = 512;

export function validateAvatarInput(file: File): void {
  if (!file.size) throw new Error("空の画像ファイルは選べません。");
  if (file.size > MAX_AVATAR_INPUT_BYTES) throw new Error("画像は10MB以下にしてください。");
  const supported = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const extensionSupported = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!supported.includes(file.type.toLowerCase()) && !(file.type === "" && extensionSupported)) {
    throw new Error("JPEG・PNG・WebPの画像を選んでください。HEICは端末が読み込める場合に利用できます。");
  }
}

/** ブラウザ内で読み込み、アイコン用の正方形に縮小する。 */
export async function prepareAvatarImage(file: File): Promise<File> {
  validateAvatarInput(file);
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        image.onload = null;
        image.onerror = null;
        reject(new Error("画像の読み込みに時間がかかっています。別の画像でもう一度試してください。"));
      }, 20000);
      image.onload = () => { window.clearTimeout(timer); resolve(); };
      image.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("この画像を読み込めませんでした。HEICなどの場合はJPEG・PNGに変換して選んでください。"));
      };
      image.src = url;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error("画像のサイズを読み取れませんでした。別の画像を選んでください。");
    const size = Math.min(OUTPUT_SIZE, side);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("画像を縮小できませんでした。別のブラウザでもう一度試してください。");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image,
      (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side,
      0, 0, size, size);

    function encode(type: string, quality: number): Promise<Blob> {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("画像を変換できませんでした。別の画像を選んでください。")), type, quality);
      });
    }
    let blob = await encode("image/webp", 0.86);
    if (blob.size > MAX_AVATAR_UPLOAD_BYTES) {
      // JPEGでは透明部分を白にしてから保存する。
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#fffefb";
      context.fillRect(0, 0, size, size);
      blob = await encode("image/jpeg", 0.8);
    }
    const extensions: Record<string, string> = {
      "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg",
    };
    const extension = extensions[blob.type];
    if (!extension || !blob.size || blob.size > MAX_AVATAR_UPLOAD_BYTES) {
      throw new Error("保存できるサイズに縮小できませんでした。別の画像を選んでください。");
    }
    return new File([blob], `avatar.${extension}`, { type: blob.type });
  } finally {
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(url);
  }
}
