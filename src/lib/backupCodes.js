// Backup codes for two-step verification. Codes are random,
// human-readable (XXXX-XXXX), and only ever stored as a SHA-256 hash —
// never in plain text — so even direct database access can't recover
// the original codes.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I/L)

function randomSegment(length) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
}

export function generateBackupCodes(count = 8) {
  const codes = []
  for (let i = 0; i < count; i++) {
    codes.push(`${randomSegment(4)}-${randomSegment(4)}`)
  }
  return codes
}

export async function hashCode(code) {
  const normalized = code.trim().toUpperCase()
  const data = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
