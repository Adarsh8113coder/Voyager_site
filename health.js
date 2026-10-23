import { getDb } from './_lib/db.js'

// GET /api/health → 200 {ok:true} only when MongoDB is configured and reachable.
export default async function handler(req, res) {
  try {
    const db = await getDb()
    await db.command({ ping: 1 })
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message })
  }
}
