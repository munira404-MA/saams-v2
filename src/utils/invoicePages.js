// Combine several photos / images of ONE invoice into a single PDF (one page per image),
// so the reader sees the whole invoice instead of treating every page as a separate invoice.
import { PDFDocument } from 'pdf-lib';

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('IMAGE_READ_FAILED')); };
    img.src = url;
  });
}

async function toJpegBytes(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
}

export async function combineImagesToPdf(files, { maxBytes = 3 * 1024 * 1024, name } = {}) {
  const images = [];
  for (const file of files) images.push(await loadImage(file));
  // Try progressively smaller/lighter pages until the PDF fits the upload limit.
  const attempts = [[2000, 0.78], [1700, 0.7], [1400, 0.62], [1150, 0.55], [950, 0.5]];
  let last = null;
  for (const [maxSide, quality] of attempts) {
    const pdf = await PDFDocument.create();
    for (const img of images) {
      const { bytes, w, h } = await toJpegBytes(img, maxSide, quality);
      const jpg = await pdf.embedJpg(bytes);
      const page = pdf.addPage([w, h]);
      page.drawImage(jpg, { x: 0, y: 0, width: w, height: h });
    }
    const out = await pdf.save();
    last = new File([out], name || `invoice-${files.length}-pages.pdf`, { type: 'application/pdf', lastModified: Date.now() });
    if (last.size <= maxBytes) return last;
  }
  return last; // caller reports "too large"
}
