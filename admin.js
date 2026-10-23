import { isAdmin, list, num, one, run, send, str, toObjectId, bodyOf } from './_lib/util.js'

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Each admin resource: Mongo collection, how rows are shown, how posted forms are saved.
// stringId → the Mongo _id is a string we choose (code / city id / email). Otherwise it's a generated ObjectId.
const RESOURCES = {
  registrations: {
    collection: 'registrations', stringId: true, readOnly: true, sort: { createdAt: -1 }, search: ['fullName', '_id'],
    out: (r) => ({ id: r._id, fullName: r.fullName, email: r._id, createdAt: r.createdAt }),
  },
  bookings: {
    collection: 'bookings', readOnly: true, sort: { createdAt: -1 }, search: ['title', 'fullName', 'email', 'userEmail'],
    out: (r) => ({
      id: String(r._id), title: r.title, fullName: r.fullName || '', email: r.email || r.userEmail || '',
      type: r.type, priceUsd: r.priceUsd, cityId: r.cityId, createdAt: r.createdAt,
    }),
  },
  countries: {
    collection: 'countries', stringId: true, sort: { _id: 1 }, search: ['name', '_id'],
    out: (r) => ({ code: r._id, name: r.name, continent: r.continent, capital: r.capital }),
    parse: (b) => ({
      id: str(b.code).toUpperCase(),
      set: { name: str(b.name), continent: str(b.continent), capital: str(b.capital) },
      required: ['name'],
    }),
  },
  cities: {
    collection: 'cities', stringId: true, sort: { population: -1 }, search: ['name', '_id'],
    out: (r) => ({
      id: r._id, name: r.name, countryCode: r.countryCode, lat: r.lat, lng: r.lng,
      population: r.population || 0, isCapital: !!r.isCapital, iata: r.iata || null, landmarks: r.landmarks || [],
    }),
    parse: (b) => ({
      id: str(b.id),
      set: {
        name: str(b.name), countryCode: str(b.countryCode).toUpperCase(), lat: num(b.lat), lng: num(b.lng),
        population: Math.max(0, Math.round(num(b.population))), isCapital: !!b.isCapital,
        iata: str(b.iata) || null, landmarks: list(b.landmarks),
      },
      required: ['name', 'countryCode'],
    }),
  },
  'hotel-packages': {
    collection: 'hotelPackages', sort: { _id: -1 }, search: ['name', 'cityId'],
    out: (r) => ({
      id: String(r._id), cityId: r.cityId, name: r.name, stars: r.stars, nights: r.nights,
      pricePerNight: r.pricePerNight, perks: r.perks || [],
    }),
    parse: (b) => ({
      id: str(b.id),
      set: {
        cityId: str(b.cityId), name: str(b.name), stars: Math.min(5, Math.max(1, Math.round(num(b.stars)) || 3)),
        nights: Math.max(1, Math.round(num(b.nights)) || 1), pricePerNight: Math.max(0, num(b.pricePerNight)),
        perks: list(b.perks),
      },
      required: ['cityId', 'name'],
    }),
  },
  'tour-packages': {
    collection: 'tourPackages', sort: { _id: -1 }, search: ['name', 'cityId'],
    out: (r) => ({
      id: String(r._id), cityId: r.cityId, name: r.name, days: r.days, priceUsd: r.priceUsd,
      groupSize: r.groupSize, highlights: r.highlights || [],
    }),
    parse: (b) => ({
      id: str(b.id),
      set: {
        cityId: str(b.cityId), name: str(b.name), days: Math.max(1, Math.round(num(b.days)) || 1),
        priceUsd: Math.max(0, num(b.priceUsd)), groupSize: str(b.groupSize) || 'Small group', highlights: list(b.highlights),
      },
      required: ['cityId', 'name'],
    }),
  },
}

// GET    /api/admin?resource=registrations&q=text   list / search (max 200)
// POST   /api/admin?resource=cities                 insert or update (body = the form)
// DELETE /api/admin?resource=cities&id=...          delete
// Every call needs the x-admin-key header to match the ADMIN_KEY environment variable.
export async function handle(req, res, db) {
  if (!process.env.ADMIN_KEY) return send(res, 503, { error: 'ADMIN_KEY is not set on the server. Add it in Vercel → Environment Variables and redeploy.' })
  if (!isAdmin(req)) return send(res, 401, { error: 'Wrong or missing admin access key.' })

  const resource = str(one(req.query.resource))
  if (resource === 'ping') return send(res, 200, { ok: true })
  const cfg = RESOURCES[resource]
  if (!cfg) return send(res, 404, { error: 'Unknown resource' })
  const col = db.collection(cfg.collection)

  if (req.method === 'GET') {
    const q = str(one(req.query.q))
    const filter = q ? { $or: cfg.search.map((f) => ({ [f]: new RegExp(escapeRx(q), 'i') })) } : {}
    const rows = await col.find(filter).sort(cfg.sort).limit(200).toArray()
    return send(res, 200, rows.map(cfg.out))
  }

  if (req.method === 'POST') {
    if (cfg.readOnly) return send(res, 405, { error: 'This list is read-only.' })
    const { id, set, required } = cfg.parse(bodyOf(req))
    for (const k of required) if (!set[k]) return send(res, 400, { error: `"${k}" is required.` })
    if (cfg.stringId) {
      if (!id) return send(res, 400, { error: 'An ID / code is required.' })
      await col.updateOne({ _id: id }, { $set: set }, { upsert: true })
    } else if (id && toObjectId(id)) {
      await col.updateOne({ _id: toObjectId(id) }, { $set: set })
    } else {
      await col.insertOne(set)
    }
    return send(res, 200, { ok: true })
  }

  if (req.method === 'DELETE') {
    const id = str(one(req.query.id))
    if (!id) return send(res, 400, { error: 'Missing id.' })
    const _id = cfg.stringId ? id : toObjectId(id)
    if (!_id) return send(res, 400, { error: 'Invalid id.' })
    await col.deleteOne({ _id })
    return send(res, 200, { ok: true })
  }

  return send(res, 405, { error: 'Method not allowed' })
}
export default (req, res) => run(handle, req, res)
