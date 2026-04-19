const BACKEND = process.env.API_URL!

export async function generateLinkCode(token: string, userId: string): Promise<string> {
  const res = await fetch(`${BACKEND}/line/link/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to generate link code')
  const data = await res.json()
  return data.code
}

export async function confirmLink(code: string, lineUserId: string): Promise<boolean> {
  const res = await fetch(`${BACKEND}/line/link/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, line_user_id: lineUserId }),
  })
  return res.ok
}

export async function getTokenForLineUser(lineUserId: string): Promise<string | null> {
  const res = await fetch(`${BACKEND}/line/token?line_user_id=${encodeURIComponent(lineUserId)}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.token ?? null
}

export async function getLineIdForUser(userId: string, token: string): Promise<boolean> {
  const res = await fetch(`${BACKEND}/line/link/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.linked
}

export async function unlinkUser(token: string): Promise<void> {
  await fetch(`${BACKEND}/line/link`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
