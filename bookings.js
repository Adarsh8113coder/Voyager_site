import { EMAIL_RE, bodyOf, run, send, str } from './_lib/util.js'

const TYPES = ['flight', 'hotel', 'tour']

// POST /api/bookings → records a booking for a registered email. (Reading bookings is admin-only: /api/admin.)
export async function handle(req, res, db) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })
  const b = bodyOf(req)
  const email = str(b.email).toLowerCase()
  if (!EMAIL_RE.test(email)) return send(res, 400, { error: 'Please register first.' })
  const reg = await db.collection('registrations').findOne({ _id: email })
  if (!reg) return send(res, 400, { error: 'Please register first.' })
  const type = str(b.type)
  const title = str(b.title)
  const priceUsd = Number(b.priceUsd)
  if (!TYPES.includes(type) || !title || !Number.isFinite(priceUsd) || priceUsd < 0) {
    return send(res, 400, { error: 'Invalid booking.' })
  }
  await db.collection('bookings').insertOne({
    email, fullName: reg.fullName, type, title, priceUsd,
    cityId: str(b.cityId) || null,
    details: b.details && typeof b.details === 'object' ? b.details : {},
    createdAt: new Date().toISOString(),
  })
  return send(res, 200, { ok: true })
}
export default (req, res) => run(handle, req, res)
