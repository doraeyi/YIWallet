// sop app 沒有自己的登入頁，未登入時會帶 return_to 導來這裡登入，登入完要導回去。
// return_to 是使用者可控的字串，沒驗證就直接拿來 redirect 會是開放重導向漏洞，
// 所以只接受 doraeyi.com 底下的網域（本機開發另外放行 localhost）。
export function resolveReturnTo(returnTo: string | null | undefined, fallback = '/dashboard'): string {
  if (!returnTo) return fallback
  try {
    const url = new URL(returnTo)
    const isAllowedHost =
      url.hostname === 'doraeyi.com' ||
      url.hostname.endsWith('.doraeyi.com') ||
      url.hostname === 'localhost'
    return isAllowedHost ? url.toString() : fallback
  } catch {
    return fallback
  }
}
