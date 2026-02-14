/**
 * Resize/compress an image file so it's suitable for upload (smaller dimensions and file size).
 * Uses canvas to draw at max dimensions and export as JPEG.
 */

const DEFAULT_MAX_SIZE = 800; // max width or height in pixels
const DEFAULT_JPEG_QUALITY = 0.85;
const MAX_FILE_BYTES = 500 * 1024; // 500 KB – if still over after resize, lower quality

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeBytes?: number;
  quality?: number;
}

/**
 * Resize image file to fit within max dimensions and compress. Returns a new File (JPEG).
 * If the file is not an image or resize fails, returns the original file.
 */
export function resizeImageFile(
  file: File,
  options: ResizeOptions = {}
): Promise<File> {
  const maxW = options.maxWidth ?? DEFAULT_MAX_SIZE;
  const maxH = options.maxHeight ?? DEFAULT_MAX_SIZE;
  const maxBytes = options.maxSizeBytes ?? MAX_FILE_BYTES;
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY;

  if (!file.type.startsWith("image/")) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      let w = width;
      let h = height;
      if (w > maxW || h > maxH) {
        const r = Math.min(maxW / w, maxH / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      const tryQuality = (q: number): Promise<File> =>
        new Promise((res) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                res(file);
                return;
              }
              const resized = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              if (resized.size <= maxBytes || q <= 0.5) {
                res(resized);
              } else {
                tryQuality(Math.max(0.5, q - 0.15)).then(res);
              }
            },
            "image/jpeg",
            q
          );
        });

      tryQuality(quality).then(resolve);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
