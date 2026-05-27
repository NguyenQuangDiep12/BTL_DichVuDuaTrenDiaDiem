/**
 * RegionBoundaryService.js
 * Lấy ranh giới CẤP TỈNH/THÀNH PHỐ qua Nominatim + Overpass (miễn phí)
 * Luôn chuẩn hóa về cấp tỉnh, bỏ qua quận/huyện/phường/xã
 */

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const HEADERS = {
    'Accept-Language': 'vi',
    'User-Agent': 'TimKiemDiaDiemDuLich/1.0 (Vite Leaflet App)'
}

/**
 * Nominatim zoom → admin level tương ứng:
 *   zoom 5  → state / tỉnh
 *   zoom 6  → state / tỉnh (một số trường hợp ở VN)
 *   zoom 8  → county / huyện  ← KHÔNG dùng
 *   zoom 10 → city / thành phố thuộc tỉnh ← KHÔNG dùng
 *
 * addresstype của Nominatim trả về cấp tỉnh: "state"
 */
const PROVINCE_ZOOM_LEVELS = [5, 6]

/** addresstype/type được chấp nhận là cấp tỉnh/thành phố */
const PROVINCE_TYPES = new Set(['state', 'province', 'region', 'administrative'])

/** addresstype bị loại (quận/huyện/phường/xã/thị trấn) */
const DISTRICT_WARD_TYPES = new Set([
    'city', 'town', 'village', 'suburb', 'quarter',
    'neighbourhood', 'county', 'municipality', 'borough'
])

export default class RegionBoundaryService {
    /**
     * Lấy ranh giới CẤP TỈNH tại điểm click
     */
    async getBoundaryAtPoint(lat, lng) {
        // Bước 1 — reverse ở zoom cấp tỉnh (5, 6)
        for (const zoom of PROVINCE_ZOOM_LEVELS) {
            const data = await this.reverse(lat, lng, zoom)

            if (data?.geojson && this.isProvinceLevel(data)) {
                return data
            }
        }

        // Bước 2 — lấy tên tỉnh từ reverse chi tiết rồi search riêng
        const detail = await this.reverse(lat, lng, 18)
        if (!detail) return null

        const provinceNames = this.extractProvinceNames(detail.address)

        for (const name of provinceNames) {
            const byName = await this.getBoundaryByName(name)
            if (byName?.geojson || byName?.boundingbox) {
                return byName
            }

            const overpass = await this.getAdminBoundaryOverpass(name)
            if (overpass) return overpass
        }

        // Bước 3 — fallback bbox từ state address nếu có
        if (detail.address?.state && detail.boundingbox) {
            return {
                ...detail,
                name: detail.address.state,
                geojson: this.bboxToGeoJSON(detail.boundingbox),
                source: 'bbox-fallback'
            }
        }

        return null
    }

    /**
     * Kiểm tra kết quả có phải cấp tỉnh/thành phố không
     * Loại bỏ quận/huyện/phường/xã
     */
    isProvinceLevel(data) {
        const type = (data.type || '').toLowerCase()
        const addresstype = (data.addresstype || '').toLowerCase()

        // Loại ngay nếu là district/ward
        if (DISTRICT_WARD_TYPES.has(type) || DISTRICT_WARD_TYPES.has(addresstype)) {
            return false
        }

        // Chấp nhận nếu có tên tỉnh trong địa chỉ
        const addr = data.address || {}
        const hasProvince = Boolean(addr.state || addr.province)

        return hasProvince && (PROVINCE_TYPES.has(type) || PROVINCE_TYPES.has(addresstype) || type === 'administrative')
    }

    async reverse(lat, lng, zoom = 5) {
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

        // Ưu tiên tên tỉnh/thành phố, không lấy tên quận/phường
        const name =
            address.state ||
            address.province ||
            data.name ||
            data.display_name?.split(',')[0] ||
            'Khu vực đã chọn'

        return {
            name,
            fullName: data.display_name,
            type: data.type || data.category,
            addresstype: data.addresstype,
            lat: parseFloat(data.lat),
            lon: parseFloat(data.lon),
            geojson: data.geojson || null,
            boundingbox: data.boundingbox?.map(Number) || null,
            address,
            source
        }
    }

    /**
     * Chỉ trích xuất tên cấp TỈNH/THÀNH PHỐ, bỏ quận/huyện/phường/xã
     */
    extractProvinceNames(address = {}) {
        const candidates = [
            address.state,
            address.province
            // KHÔNG lấy: address.city, address.county, address.suburb
        ].filter(Boolean)

        const expanded = []
        for (const name of candidates) {
            const trimmed = name.trim()
            expanded.push(trimmed)
            // Thêm tên không có tiền tố "Tỉnh" / "Thành phố"
            expanded.push(trimmed.replace(/^(Tỉnh|Thành phố|TP\.)\s+/i, ''))
        }

        return [...new Set(expanded.filter(Boolean))]
    }

    /** Tìm ranh giới theo tên tỉnh/thành */
    async getBoundaryByName(name) {
        const attempts = [
            { q: `${name}, Việt Nam`, featuretype: 'state' },
            { q: `Tỉnh ${name}, Việt Nam`, featuretype: 'state' },
            { q: `Thành phố ${name}, Việt Nam`, featuretype: 'state' },
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
            limit: '5',
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

            // Ưu tiên kết quả có geojson VÀ là cấp tỉnh (admin_level 4)
            const adminResult =
                data.find(item => item.geojson && this.isProvinceLevelResult(item)) ||
                data.find(item => item.geojson) ||
                data[0]

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

    /** Kiểm tra kết quả search có phải cấp tỉnh (dùng cho mảng kết quả) */
    isProvinceLevelResult(item) {
        const type = (item.type || '').toLowerCase()
        const category = (item.category || '').toLowerCase()
        return type === 'administrative' || category === 'boundary' ||
               PROVINCE_TYPES.has(type)
    }

    /** Tìm ranh giới admin_level=4 (tỉnh/thành phố trực thuộc TW) qua Overpass */
    async getAdminBoundaryOverpass(name) {
        const safeName = name.replace(/"/g, '')

        // admin_level=4 là tỉnh/thành phố trực thuộc TW ở Việt Nam
        const query = `
            [out:json][timeout:25];
            area["ISO3166-1"="VN"][admin_level=2]->.vn;
            (
              relation(area.vn)["boundary"="administrative"]["admin_level"="4"]["name"~"${safeName}",i];
              relation(area.vn)["boundary"="administrative"]["admin_level"="4"]["name:vi"~"${safeName}",i];
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
                adminLevel: 4,
                lat: relation.bounds
                    ? (relation.bounds.minlat + relation.bounds.maxlat) / 2
                    : null,
                lon: relation.bounds
                    ? (relation.bounds.minlon + relation.bounds.maxlon) / 2
                    : null,
                geojson,
                boundingbox: relation.bounds
                    ? [relation.bounds.minlat, relation.bounds.maxlat,
                       relation.bounds.minlon, relation.bounds.maxlon]
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
        if (!boundingbox) return []
        return places.filter(p => this.isPointInBounds(p.lat, p.lon, boundingbox))
    }
}