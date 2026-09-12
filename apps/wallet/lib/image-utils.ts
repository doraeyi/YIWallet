'use client'

/**
 * 手機拍的照片常用 EXIF 方向標記記錄「要轉幾度看才是正的」，解出來的像素資料
 * 本身不會自動轉正——如果送去 OCR 的圖沒轉正，表格版面分析會整個亂掉（比照
 * Flutter 版 _preprocessForOcr 的 bakeOrientation 步驟）。imageOrientation:
 * 'from-image' 會讓瀏覽器依 EXIF 把方向烤進解出來的像素，同時順便做等比縮圖
 * 避免圖片太大打 OCR API 超過限制。
 */
export async function preprocessImageForOcr(file: File, maxDimension = 2000): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('無法取得 canvas context')
    ctx.drawImage(bitmap, 0, 0, width, height)

    return canvas.toDataURL('image/jpeg', 0.9)
  } finally {
    bitmap.close()
  }
}
