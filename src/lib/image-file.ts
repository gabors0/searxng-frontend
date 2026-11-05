// Images come through this server's /img proxy (imgproxy/main.go), because the browser won't let the page
// read other sites' images, and the CSP's connect-src keeps fetch on this origin anyway.

export class UnreadableImage extends Error {}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
};

// The original bytes, so saved files keep their format, quality and animation.
async function fetchImage(url: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`/img?url=${encodeURIComponent(url)}`);
  } catch {
    // Also how an expired Access session shows up, as a cross-origin redirect.
    throw new UnreadableImage();
  }
  if (!response.ok || !(response.headers.get('content-type') ?? '').startsWith('image/')) throw new UnreadableImage();
  return response.blob();
}

// The clipboard only takes PNG, so other formats are redrawn through a canvas.
async function toPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new UnreadableImage();
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) throw new UnreadableImage();
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((png) => (png ? resolve(png) : reject(new UnreadableImage())), 'image/png');
  });
}

// The original file name, as the image's URL gives it.
export function urlFileName(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const segment = new URL(url).pathname.split('/').pop() ?? '';
  try {
    return decodeURIComponent(segment) || undefined;
  } catch {
    return segment || undefined;
  }
}

// Names the file after the URL's last path segment, or the title when the URL has none.
function fileName(url: string, title: string, type: string): string {
  const segment = (urlFileName(url) ?? '').replace(/\.[a-z0-9]+$/i, '');
  const base = (segment.length >= 3 ? segment : title)
    .replace(/[^\p{L}\p{N}._ -]+/gu, ' ')
    .trim()
    .slice(0, 80);
  return `${base || 'image'}.${EXTENSIONS[type] ?? 'img'}`;
}

export async function saveImage(url: string, title: string) {
  const blob = await fetchImage(url);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName(url, title, blob.type);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

// PNG copies are made ahead of time (see prepareCopy), so the clipboard write happens straight after the click.
const pngs = new Map<string, Promise<Blob>>();

export function prepareCopy(url: string): Promise<Blob> {
  let png = pngs.get(url);
  if (!png) {
    png = fetchImage(url).then(toPng);
    // Failed reads are retried next time rather than remembered.
    png.catch(() => pngs.delete(url));
    pngs.set(url, png);
    if (pngs.size > 20) pngs.delete(pngs.keys().next().value!);
  }
  return png;
}

// A finished Blob goes in, not a promise: some browsers report success for a promise-valued item
// yet leave the clipboard empty. Safari keeps the click's permission because the blob is usually ready already.
export async function copyImage(url: string) {
  const png = await prepareCopy(url);
  await navigator.clipboard.write([new ClipboardItem({ [png.type]: png })]);
}
