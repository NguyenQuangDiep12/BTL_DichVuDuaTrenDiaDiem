/**
 * OverpassService.js
 * Tìm điểm du lịch gần vị trí qua Overpass API (OpenStreetMap)
 * Trích xuất đầy đủ metadata: địa chỉ, mô tả, website, giờ mở cửa, số điện thoại
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const TOURISM_TAGS = [
    'tourism=attraction',
    'tourism=museum',
    'tourism=viewpoint',
    'tourism=theme_park',
    'tourism=zoo',
    'tourism=artwork',
    'tourism=gallery',
    'tourism=aquarium',
    'historic=monument',
    'historic=castle',
    'historic=ruins',
    'historic=archaeological_site',
    'leisure=park',
    'leisure=nature_reserve',
    'natural=beach',
    'natural=peak',
    'natural=waterfall',
    'amenity=place_of_worship'
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
            out body 40;
        `

        try {
            const response = await fetch(OVERPASS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`
            })

            if (!response.ok) throw new Error('Overpass request failed')

            const data = await response.json()

            return data.elements
                .filter(el => el.tags?.name || el.tags?.['name:vi'])
                .map(el => this.normalizePlace(el))
        } catch (error) {
            console.error('Overpass Error:', error)
            return []
        }
    }

    normalizePlace(el) {
        const tags = el.tags || {}

        return {
            id: `osm-${el.id}`,
            name: tags['name:vi'] || tags.name,
            description: this.buildDescription(tags),
            category: this.inferCategory(tags),
            address: this.buildAddress(tags),
            lat: el.lat,
            lon: el.lon,
            // Thông tin bổ sung từ OSM
            website:      tags.website || tags.url || null,
            phone:        tags.phone || tags['contact:phone'] || null,
            openingHours: tags.opening_hours || null,
            wikidata:     tags.wikidata || null,
            wikipedia:    tags.wikipedia || null,
            source: 'overpass'
        }
    }

    /**
     * Xây dựng mô tả có nghĩa từ các tag OSM
     * Thứ tự ưu tiên: description:vi → description → name:vi (nếu khác name) → heritage info
     */
    buildDescription(tags) {
        if (tags['description:vi']) return tags['description:vi']
        if (tags.description) return tags.description

        const parts = []

        // Loại di tích / lịch sử
        if (tags.historic) {
            const historicLabels = {
                monument: 'Di tích lịch sử',
                castle: 'Lâu đài / thành cổ',
                ruins: 'Di tích còn lại',
                archaeological_site: 'Khu khảo cổ',
                memorial: 'Đài tưởng niệm',
                tomb: 'Lăng mộ'
            }
            const label = historicLabels[tags.historic] || `Di tích (${tags.historic})`
            parts.push(label)
        }

        // Loại du lịch
        if (tags.tourism) {
            const tourismLabels = {
                attraction: 'Điểm tham quan',
                museum: 'Bảo tàng',
                viewpoint: 'Điểm ngắm cảnh',
                theme_park: 'Công viên giải trí',
                zoo: 'Vườn thú',
                artwork: 'Tác phẩm nghệ thuật',
                gallery: 'Phòng tranh',
                aquarium: 'Thủy cung'
            }
            const label = tourismLabels[tags.tourism]
            if (label) parts.push(label)
        }

        // Loại tự nhiên
        if (tags.natural) {
            const naturalLabels = {
                beach: 'Bãi biển',
                peak: `Đỉnh núi${tags.ele ? ` (${tags.ele}m)` : ''}`,
                waterfall: 'Thác nước',
                cave_entrance: 'Hang động'
            }
            const label = naturalLabels[tags.natural]
            if (label) parts.push(label)
        }

        // Tôn giáo
        if (tags.amenity === 'place_of_worship' && tags.religion) {
            const religionLabels = {
                buddhist: 'Chùa Phật giáo',
                christian: 'Nhà thờ',
                muslim: 'Thánh đường Hồi giáo'
            }
            parts.push(religionLabels[tags.religion] || 'Nơi thờ tự')
        }

        // Độ cao (nếu có)
        if (tags.ele && !parts.some(p => p.includes('m)'))) {
            parts.push(`Độ cao: ${tags.ele}m`)
        }

        // Thông tin di sản
        if (tags['heritage'] || tags['heritage:operator']) {
            parts.push('Di sản được bảo tồn')
        }

        return parts.length > 0 ? parts.join(' · ') : ''
    }

    /**
     * Xây dựng địa chỉ từ các tag addr:* và thông tin hành chính
     */
    buildAddress(tags) {
        const parts = []

        // Địa chỉ cụ thể
        if (tags['addr:housenumber'] && tags['addr:street']) {
            parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`)
        } else if (tags['addr:street']) {
            parts.push(tags['addr:street'])
        }

        // Phường/xã
        if (tags['addr:quarter'] || tags['addr:suburb']) {
            parts.push(tags['addr:quarter'] || tags['addr:suburb'])
        }

        // Quận/huyện
        if (tags['addr:district'] || tags['addr:city_district']) {
            parts.push(tags['addr:district'] || tags['addr:city_district'])
        }

        // Thành phố / tỉnh
        if (tags['addr:city']) parts.push(tags['addr:city'])
        if (tags['addr:province'] || tags['addr:state']) {
            parts.push(tags['addr:province'] || tags['addr:state'])
        }

        // Fallback: tên tiếng Việt + "Việt Nam" nếu không có gì
        if (parts.length === 0) {
            const placeName = tags['is_in:city'] || tags['is_in:province'] || tags['is_in']
            if (placeName) return placeName
            return 'Việt Nam'
        }

        return parts.join(', ')
    }

    inferCategory(tags) {
        if (tags.natural === 'beach') return 'bai_bien'
        if (tags.tourism === 'museum' || tags.historic || tags.amenity === 'place_of_worship') {
            return 'di_tich'
        }
        if (tags.tourism === 'theme_park' || tags.tourism === 'zoo' || tags.tourism === 'aquarium') {
            return 'giai_tri'
        }
        if (
            tags.leisure === 'park' ||
            tags.leisure === 'nature_reserve' ||
            tags.tourism === 'viewpoint' ||
            tags.natural
        ) {
            return 'thien_nhien'
        }
        return 'giai_tri'
    }
}