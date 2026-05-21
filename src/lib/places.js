// Country and region data, fetched on demand from a public CDN. We never bundle
// the full dataset; it is large and only needed on the setup screen. Callers get
// a graceful "unavailable" result if the network blocks the request, and the UI
// falls back to free-text inputs.

import { withTimeout } from './id.js'

const PLACES_BASE = 'https://cdn.jsdelivr.net/npm/country-state-city@3.2.1/lib/assets/'

let cache = null

export async function loadPlaces() {
  if (cache) return cache
  const [countriesRaw, states] = await Promise.all([
    withTimeout(
      fetch(PLACES_BASE + 'country.json').then((r) => r.json()),
      9000,
      'country data'
    ),
    withTimeout(
      fetch(PLACES_BASE + 'state.json').then((r) => r.json()),
      12000,
      'state data'
    ),
  ])

  const countries = countriesRaw.slice().sort((a, b) => a.name.localeCompare(b.name))
  const isoByName = {}
  countries.forEach((c) => {
    isoByName[c.name] = c.isoCode
  })

  cache = { countries, states, isoByName }
  return cache
}

export function statesForCountry(data, countryName) {
  if (!data) return []
  const iso = data.isoByName[countryName]
  if (!iso) return []
  return data.states.filter((st) => st.countryCode === iso).sort((a, b) => a.name.localeCompare(b.name))
}
