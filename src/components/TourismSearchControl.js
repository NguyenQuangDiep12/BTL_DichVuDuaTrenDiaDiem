/**
 * TourismSearchControl.js
 * Tìm kiếm địa điểm qua Nominatim API (OpenStreetMap)
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export default class TourismSearchControl {
    constructor(mapManager) {
        this.mapManager = mapManager
    }

    async search(keyword, options = {}) {
        if (!keyword?.trim()) return []

        const params = new URLSearchParams({
            q: keyword.trim(),
            format: 'json',
            limit: String(options.limit || 10),
            countrycodes: 'vn',
            'accept-language': 'vi'
        })

        try {
            const response = await fetch(`${NOMINATIM_URL}?${params}`, {
                headers: {
                    'Accept-Language': 'vi',
                    'User-Agent': 'TimKiemDiaDiemDuLich/1.0 (Vite Leaflet App)'
                }
            })

            if (!response.ok) {
                throw new Error('Search request failed')
            }

            const data = await response.json()

            return data.map(place => this.normalizePlace(place))
        } catch (error) {
            console.error('Search Error:', error)
            return []
        }
    }

    normalizePlace(place) {
        return {
            id: place.place_id,
            name: place.name || place.display_name.split(',')[0],
            description: place.display_name,
            category: this.inferCategory(place),
            address: place.display_name,
            lat: parseFloat(place.lat),
            lon: parseFloat(place.lon),
            source: 'nominatim'
        }
    }

    /** Geocode địa chỉ → trả về kết quả đầu tiên */
    async geocode(keyword) {
        const results = await this.search(keyword, { limit: 1 })
        return results[0] || null
    }

    inferCategory(place) {
        const type = (place.type || '').toLowerCase()

        if (type.includes('beach') || type.includes('island')) return 'bai_bien'
        if (type.includes('museum') || type.includes('monument') || type.includes('historic')) {
            return 'di_tich'
        }
        if (type.includes('park') || type.includes('natural')) return 'thien_nhien'
        return 'giai_tri'
    }

    displaySearchResults(results, onMarkerClick) {
        this.mapManager.clearMarkers()

        results.forEach(place => {
            const popupContent = this.buildPopup(place, onMarkerClick)

            const marker = this.mapManager.addMarker(
                place.lat,
                place.lon,
                popupContent
            )

            marker.placeData = place

            if (onMarkerClick) {
                marker.on('click', () => onMarkerClick(place))
            }
        })

        if (results.length > 0) {
            const bounds = results.map(p => [p.lat, p.lon])
            this.mapManager.fitBounds(bounds)
        }
    }

    buildPopup(place, onRouteClick) {
        const categoryLabel = CATEGORY_LABELS[place.category] || place.category

        return `
            <div class="popup-container">
                <h3>${place.name}</h3>
                <p>${place.description || place.address || ''}</p>
                <span class="category-tag">${categoryLabel}</span>
                ${onRouteClick ? `<br><button class="route-btn" data-route="${place.id}">Chỉ đường</button>` : ''}
            </div>
        `
    }

    async searchAndDisplay(keyword, callbacks = {}) {
        const results = await this.search(keyword)
        this.displaySearchResults(results, callbacks.onSelect)
        return results
    }
}

export const CATEGORY_LABELS = {
    all: 'Tất cả',
    di_tich: 'Di tích & văn hóa',
    thien_nhien: 'Thiên nhiên',
    bai_bien: 'Biển & đảo',
    giai_tri: 'Giải trí'
}
