import { EMAIL_RE, bodyOf, run, send, str } from './_lib/util.js'

// POST /api/register {fullName, email} → saves (or updates) a registration. Email is the unique id.
export async function handle(req, res, db) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })
  const b = bodyOf(req)
  const fullName = str(b.fullName).replace(/\s+/g, ' ')
  const email = str(b.email).toLowerCase()
  if (fullName.length < 2 || fullName.length > 100) return send(res, 400, { error: 'Please enter your full name.' })
  if (!EMAIL_RE.test(email) || email.length > 200) return send(res, 400, { error: 'Please enter a valid email ID.' })
  const now = new Date().toISOString()
  await db.collection('registrations').updateOne(
    { _id: email },
    { $set: { fullName, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  )
  return send(res, 200, { ok: true, registration: { fullName, email } })
}
export default (req, res) => run(handle, req, res)
