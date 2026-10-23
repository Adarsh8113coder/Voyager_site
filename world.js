import { run, send } from './_lib/util.js'

// GET /api/world → all countries + cities (public).
export async function handle(req, res, db) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })
  const [countries, cities] = await Promise.all([
    db.collection('countries').find({}).toArray(),
    db.collection('cities').find({}).toArray(),
  ])
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
  return send(res, 200, {
    countries: countries.map((c) => ({ code: c._id, name: c.name, continent: c.continent, capital: c.capital })),
    cities: cities.map((c) => ({
      id: c._id, name: c.name, countryCode: c.countryCode, lat: c.lat, lng: c.lng,
      population: c.population || 0, isCapital: !!c.isCapital, iata: c.iata || null, landmarks: c.landmarks || [],
    })),
  })
}
export default (req, res) => run(handle, req, res)
