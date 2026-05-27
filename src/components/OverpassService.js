/**
 * OverpassService.js
 * Tìm điểm du lịch gần vị trí qua Overpass API (OpenStreetMap)
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const TOURISM_TAGS = [
    'tourism=attraction',
    'tourism=museum',
    'tourism=viewpoint',
    'tourism=theme_park',
    'tourism=zoo',
    'tourism=artwork',
    'historic=monument',
    'historic=castle',
    'leisure=park',
    'natural=beach'
]

export default class OverpassService {
    /**
     * Tìm POI du lịch trong bán kính (mét)
     */
    async searchNearby(lat, lng, radius = 8000) {
        const tagQueries = TOURISM_TAGS.map(
            tag => `node[${tag}](around:${radius},${lat},${lng});`
        ).join('\n')

        const query = `
            [out:json][timeout:25];
            (
                ${tagQueries}
            );
            out body 30;
        `

        try {
            const response = await fetch(OVERPASS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`
            })

            if (!response.ok) {
                throw new Error('Overpass request failed')
            }

            const data = await response.json()

            return data.elements
                .filter(el => el.tags?.name)
                .map(el => ({
                    id: `osm-${el.id}`,
                    name: el.tags.name,
                    description: el.tags.description || el.tags['name:vi'] || '',
                    category: this.inferCategory(el.tags),
                    address: this.buildAddress(el.tags),
                    lat: el.lat,
                    lon: el.lon,
                    source: 'overpass'
                }))
        } catch (error) {
            console.error('Overpass Error:', error)
            return []
        }
    }

    inferCategory(tags) {
        if (tags.natural === 'beach') return 'bai_bien'
        if (tags.tourism === 'museum' || tags.historic) return 'di_tich'
        if (tags.tourism === 'theme_park' || tags.tourism === 'zoo') return 'giai_tri'
        if (tags.leisure === 'park' || tags.tourism === 'viewpoint') return 'thien_nhien'
        return 'giai_tri'
    }

    buildAddress(tags) {
        const parts = [tags['addr:street'], tags['addr:city'], tags['addr:province']]
            .filter(Boolean)

        return parts.length > 0 ? parts.join(', ') : 'Việt Nam'
    }
}
