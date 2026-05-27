/**
 * RegionBoundaryService.js
 * Lấy ranh giới tỉnh/thành qua Nominatim + Overpass (miễn phí)
 */

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const HEADERS = {
    'Accept-Language': 'vi',
    'User-Agent': 'TimKiemDiaDiemDuLich/1.0 (Vite Leaflet App)'
}

export default class RegionBoundaryService {
    /**
     * Reverse geocode tại điểm click → ưu tiên ranh giới cấp tỉnh/thành phố
     */
    async getBoundaryAtPoint(lat, lng) {
        for (const zoom of [8, 7, 6, 10]) {
            const data = await this.reverse(lat, lng, zoom)

            if (data?.geojson) {
                return data
            }
        }

        const detail = await this.reverse(lat, lng, 18)

        if (!detail) return null

        const adminNames = this.extractAdminNames(detail.address)

        for (const name of adminNames) {
            const byName = await this.getBoundaryByName(name)

            if (byName?.geojson || byName?.boundingbox) {
                return byName
            }

            const overpass = await this.getAdminBoundaryOverpass(name)

            if (overpass) {
                return overpass
            }
        }

        if (detail.boundingbox) {
            return {
                ...detail,
                geojson: this.bboxToGeoJSON(detail.boundingbox),
                source: 'bbox-fallback'
            }
        }

        return detail
    }

    async reverse(lat, lng, zoom = 10) {
        const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lng),
            format: 'json',
            polygon_geojson: '1',
            zoom: String(zoom),
            'accept-language': 'vi'
        })

        try {
            const response = await fetch(`${NOMINATIM_REVERSE}?${params}`, { headers: HEADERS })

            if (!response.ok) return null

            const data = await response.json()

            if (data.error) return null

            return this.normalizeBoundary(data, 'nominatim-reverse')
        } catch (error) {
            console.error('Boundary Error:', error)
            return null
        }
    }

    normalizeBoundary(data, source) {
        const address = data.address || {}

        return {
            name: data.name ||
                address.city ||
                address.state ||
                address.province ||
                data.display_name?.split(',')[0] ||
                'Khu vực đã chọn',
            fullName: data.display_name,
            type: data.type || data.category,
            lat: parseFloat(data.lat),
            lon: parseFloat(data.lon),
            geojson: data.geojson || null,
            boundingbox: data.boundingbox?.map(Number) || null,
            address,
            source
        }
    }

    extractAdminNames(address = {}) {
        const candidates = [
            address.city,
            address.state,
            address.province,
            address.county
        ].filter(Boolean)

        const normalized = candidates.map(name => name.trim())
        const expanded = []

        for (const name of normalized) {
            expanded.push(name)
            expanded.push(name.replace(/^(Tỉnh|Thành phố|TP\.)\s+/i, ''))
        }

        return [...new Set(expanded.filter(Boolean))]
    }

    /**
     * Tìm ranh giới theo tên vùng/tỉnh/thành phố
     */
    async getBoundaryByName(name) {
        const attempts = [
            { q: `${name}, Việt Nam`, featuretype: 'state' },
            { q: `${name}, Việt Nam`, featuretype: 'city' },
            { q: `Tỉnh ${name}, Việt Nam` },
            { q: `Thành phố ${name}, Việt Nam` },
            { q: `${name}, Việt Nam` }
        ]

        for (const attempt of attempts) {
            const result = await this.searchBoundary(attempt.q, attempt.featuretype)

            if (result?.geojson || result?.boundingbox) {
                return result
            }
        }

        return null
    }

    async searchBoundary(query, featuretype) {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            polygon_geojson: '1',
            limit: '3',
            countrycodes: 'vn',
            'accept-language': 'vi'
        })

        if (featuretype) {
            params.set('featuretype', featuretype)
        }

        try {
            const response = await fetch(`${NOMINATIM_SEARCH}?${params}`, { headers: HEADERS })

            if (!response.ok) return null

            const data = await response.json()
            if (!data.length) return null

            const adminResult = data.find(item => item.geojson) || data[0]
            const boundary = this.normalizeBoundary(adminResult, 'nominatim-search')

            if (!boundary.geojson && boundary.boundingbox) {
                boundary.geojson = this.bboxToGeoJSON(boundary.boundingbox)
                boundary.source = 'bbox-fallback'
            }

            return boundary
        } catch (error) {
            console.error('Boundary Search Error:', error)
            return null
        }
    }

    async getAdminBoundaryOverpass(name) {
        const safeName = name.replace(/"/g, '')

        const query = `
            [out:json][timeout:25];
            area["ISO3166-1"="VN"][admin_level=2]->.vn;
            (
              relation(area.vn)["boundary"="administrative"]["admin_level"~"^[34]$"]["name"~"${safeName}",i];
              relation(area.vn)["boundary"="administrative"]["admin_level"~"^[34]$"]["name:vi"~"${safeName}",i];
            );
            out geom;
        `

        try {
            const response = await fetch(OVERPASS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`
            })

            if (!response.ok) return null

            const data = await response.json()
            const relation = data.elements?.find(el => el.type === 'relation' && el.tags?.name)

            if (!relation) return null

            const geojson = this.relationToGeoJSON(relation)

            if (!geojson) return null

            return {
                name: relation.tags['name:vi'] || relation.tags.name,
                fullName: relation.tags.name,
                type: 'administrative',
                lat: relation.bounds ? (relation.bounds.minlat + relation.bounds.maxlat) / 2 : null,
                lon: relation.bounds ? (relation.bounds.minlon + relation.bounds.maxlon) / 2 : null,
                geojson,
                boundingbox: relation.bounds
                    ? [relation.bounds.minlat, relation.bounds.maxlat, relation.bounds.minlon, relation.bounds.maxlon]
                    : null,
                source: 'overpass'
            }
        } catch (error) {
            console.error('Overpass Boundary Error:', error)
            return null
        }
    }

    relationToGeoJSON(relation) {
        const outerWay = relation.members?.find(m => m.role === 'outer' && m.type === 'way')

        if (!outerWay?.geometry?.length) return null

        const coordinates = outerWay.geometry.map(point => [point.lon, point.lat])

        if (coordinates.length < 3) return null

        const first = coordinates[0]
        const last = coordinates[coordinates.length - 1]

        if (first[0] !== last[0] || first[1] !== last[1]) {
            coordinates.push(first)
        }

        return {
            type: 'Polygon',
            coordinates: [coordinates]
        }
    }

    bboxToGeoJSON(boundingbox) {
        const [south, north, west, east] = boundingbox

        return {
            type: 'Polygon',
            coordinates: [[
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south]
            ]]
        }
    }

    isPointInBounds(lat, lng, boundingbox) {
        if (!boundingbox) return false
        const [south, north, west, east] = boundingbox
        return lat >= south && lat <= north && lng >= west && lng <= east
    }

    filterPlacesInBounds(places, boundingbox) {
        if (!boundingbox) return places
        return places.filter(p => this.isPointInBounds(p.lat, p.lon, boundingbox))
    }
}
