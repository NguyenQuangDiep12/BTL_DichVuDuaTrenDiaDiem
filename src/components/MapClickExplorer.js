/**
 * MapClickExplorer.js
 * Click trên bản đồ → đánh dấu điểm, vẽ ranh giới vùng, hiển thị địa điểm nổi bật
 * Hỗ trợ kéo bản đồ để di chuyển trước khi click chọn vùng
 */

import { L } from '../utils/leafletIcons.js'
import PopupManager from './PopupManager.js'

export default class MapClickExplorer {
    constructor(mapManager, options = {}) {
        this.mapManager = mapManager
        this.boundaryService = options.boundaryService
        this.overpassService = options.overpassService
        this.getAllPlaces = options.getAllPlaces

        this.active = false
        this.isLoading = false
        this.didDrag = false
        this.clickMarker = null
        this.onExploreComplete = null
        this.onModeChange = null
    }

    enable() {
        if (this.active) return true

        this.active = true
        this.didDrag = false
        const map = this.mapManager.getMap()

        map.getContainer().classList.add('map-explore-mode')
        map.on('dragstart', this.handleDragStart, this)
        map.on('click', this.handleClick, this)

        this.onModeChange?.(true)
        return true
    }

    disable() {
        if (!this.active) return false

        this.active = false
        this.isLoading = false
        this.didDrag = false
        const map = this.mapManager.getMap()
        const container = map.getContainer()

        container.classList.remove('map-explore-mode')
        container.style.cursor = ''
        map.off('dragstart', this.handleDragStart, this)
        map.off('click', this.handleClick, this)

        container.querySelectorAll('.leaflet-interactive').forEach(el => {
            el.style.cursor = ''
        })

        this.onModeChange?.(false)
        return false
    }

    toggle(force) {
        if (force === true) return this.enable()
        if (force === false) return !this.disable()
        return this.active ? this.disable() : this.enable()
    }

    handleDragStart = () => {
        this.didDrag = true
    }

    handleClick = async event => {
        if (!this.active || this.isLoading) return

        if (this.didDrag) {
            this.didDrag = false
            return
        }

        const { lat, lng } = event.latlng

        this.isLoading = true
        this.onExploreComplete?.({ status: 'loading', lat, lng })

        try {
            await this.exploreAt(lat, lng)
        } finally {
            this.isLoading = false
        }
    }

    async exploreAt(lat, lng) {
        this.showClickMarker(lat, lng)

        // --- 1. Lấy ranh giới vùng ---
        const boundary = await this.boundaryService.getBoundaryAtPoint(lat, lng)

        // --- 2. Tính bounding box từ boundary hoặc geojson ---
        let boundingbox = null
        if (boundary) {
            boundingbox = boundary.boundingbox || this.extractBboxFromGeoJSON(boundary.geojson)
            this.mapManager.drawBoundary(
                boundary.geojson,
                boundary.name,
                boundingbox
            )
        }

        // --- 3. Lọc địa điểm GeoJSON trong vùng ---
        // Nếu có boundingbox → lọc chính xác; nếu không → không hiện gì từ local
        const localPlaces = boundingbox
            ? this.boundaryService.filterPlacesInBounds(this.getAllPlaces(), boundingbox)
            : []

        // --- 4. Tìm địa điểm từ Overpass (bán kính phủ toàn tỉnh/thành) ---
        let nearbyPlaces = []
        if (this.overpassService) {
            // Radius lớn hơn để phủ toàn tỉnh/thành
            const radius = boundingbox ? this.calcRadiusFromBbox(boundingbox) : 15000
            nearbyPlaces = await this.overpassService.searchNearby(lat, lng, radius)
        }

        const merged = this.mergePlaces(localPlaces, nearbyPlaces)

        // --- 5. Hiển thị marker trên bản đồ ---
        this.mapManager.clearSearchMarkers()
        this.displayPlaces(merged)

        // --- 6. Fit bounds ---
        if (boundingbox) {
            const [south, north, west, east] = boundingbox
            this.mapManager.fitBounds([[south, west], [north, east]], [60, 60])
        } else {
            this.mapManager.flyTo(lat, lng, boundary ? 11 : 12)
        }

        // --- 7. Thông báo kết quả ---
        this.onExploreComplete?.({
            status: 'success',
            boundary: boundary || {
                name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                source: 'coordinate'
            },
            places: merged,
            lat,
            lng
        })

        // Tự tắt chế độ chọn vùng → trả con trỏ về bình thường
        this.disable()
    }

    /**
     * Trích xuất bounding box [south, north, west, east] từ GeoJSON
     */
    extractBboxFromGeoJSON(geojson) {
        if (!geojson) return null

        try {
            const coords = this.flattenCoordinates(geojson.coordinates)
            if (!coords.length) return null

            const lngs = coords.map(c => c[0])
            const lats = coords.map(c => c[1])

            return [
                Math.min(...lats),
                Math.max(...lats),
                Math.min(...lngs),
                Math.max(...lngs)
            ]
        } catch {
            return null
        }
    }

    flattenCoordinates(arr) {
        if (!arr || !arr.length) return []
        if (typeof arr[0] === 'number') return [arr]
        return arr.flatMap(a => this.flattenCoordinates(a))
    }

    /**
     * Tính bán kính (m) bao phủ bounding box, nhân 1.2 để an toàn
     */
    calcRadiusFromBbox(boundingbox) {
        const [south, north, west, east] = boundingbox
        const latDiff = north - south
        const lngDiff = east - west
        const maxDeg = Math.max(latDiff, lngDiff)
        // 1 độ ≈ 111km; chia đôi để lấy bán kính, tối thiểu 15km, tối đa 80km
        const radius = Math.min(Math.max((maxDeg / 2) * 111000 * 1.2, 15000), 80000)
        return Math.round(radius)
    }

    showClickMarker(lat, lng) {
        if (this.clickMarker) {
            this.mapManager.getMap().removeLayer(this.clickMarker)
        }

        this.clickMarker = L.marker([lat, lng], {
            title: 'Điểm đã chọn'
        }).addTo(this.mapManager.getMap())

        this.clickMarker.bindPopup('<b>Điểm bạn đã chọn</b>')
    }

    displayPlaces(places) {
        places.forEach(place => {
            const popup = PopupManager.createTourismPopup(place)
            this.mapManager.addSearchMarker(place.lat, place.lon, popup)
        })
    }

    mergePlaces(local, remote) {
        const seen = new Set()
        const result = []

        for (const place of [...local, ...remote]) {
            const key = `${place.name}-${place.lat?.toFixed(3)}`
            if (seen.has(key)) continue
            seen.add(key)
            result.push(place)
        }

        return result
    }

    clear() {
        if (this.clickMarker) {
            this.mapManager.getMap().removeLayer(this.clickMarker)
            this.clickMarker = null
        }

        this.mapManager.clearBoundary()
        this.mapManager.clearSearchMarkers()
    }
}