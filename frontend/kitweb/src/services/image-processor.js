/**
 * Image Processor Utility
 * Resizes and converts images to WebP format using Browser Canvas API.
 */

async function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { alpha: true });
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

async function cropToSquareCanvas(canvas) {
  const size = Math.min(canvas.width, canvas.height);
  const sx = (canvas.width - size) / 2;
  const sy = (canvas.height - size) / 2;

  const squareCanvas = document.createElement('canvas');
  squareCanvas.width = size;
  squareCanvas.height = size;
  const ctx = squareCanvas.getContext('2d', { alpha: true });
  ctx.drawImage(canvas, sx, sy, size, size, 0, 0, size, size);
  return squareCanvas;
}

async function resizeCanvas(canvas, maxWidthOrHeight) {
  const { width, height } = canvas;
  if (width <= maxWidthOrHeight && height <= maxWidthOrHeight) {
    return canvas;
  }

  let newWidth, newHeight;
  if (width > height) {
    newWidth = maxWidthOrHeight;
    newHeight = (height * maxWidthOrHeight) / width;
  } else {
    newHeight = maxWidthOrHeight;
    newWidth = (width * maxWidthOrHeight) / height;
  }

  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;
  const ctx = resizedCanvas.getContext('2d', { alpha: true });
  ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
  return resizedCanvas;
}

async function canvasToBlob(canvas, type = 'image/webp', quality = 0.8) {
  return new Promise((resolve) => canvas.toBlob(b => resolve(b), type, quality));
}

/**
 * Processes a single product image into two WebP variants: Large (800px) and Thumb (250px).
 * @param {File} file - The original image file
 * @param {string} baseName - The base name for the generated files
 * @returns {Promise<File[]>} - An array containing the Large and Thumb WebP files
 */
export async function processProductImage(file, baseName) {
  const originalCanvas = await fileToCanvas(file);
  const squareCanvas = await cropToSquareCanvas(originalCanvas);
  
  // 1. Generate Large (800px)
  const largeCanvas = await resizeCanvas(squareCanvas, 800);
  const largeBlob = await canvasToBlob(largeCanvas, 'image/webp', 0.85);
  const largeFile = new File([largeBlob], `${baseName}-large.webp`, { type: 'image/webp' });

  // 2. Generate Thumb (250px)
  const thumbCanvas = await resizeCanvas(squareCanvas, 250);
  const thumbBlob = await canvasToBlob(thumbCanvas, 'image/webp', 0.8);
  const thumbFile = new File([thumbBlob], `${baseName}-thumb.webp`, { type: 'image/webp' });

  return [largeFile, thumbFile];
}
