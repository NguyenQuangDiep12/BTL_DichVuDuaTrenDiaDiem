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

        const boundary = await this.boundaryService.getBoundaryAtPoint(lat, lng)

        if (!boundary) {
            this.onExploreComplete?.({
                status: 'error',
                message: 'Không xác định được vùng tại điểm này'
            })
            return
        }

        this.mapManager.drawBoundary(
            boundary.geojson,
            boundary.name,
            boundary.boundingbox
        )

        const localPlaces = this.boundaryService.filterPlacesInBounds(
            this.getAllPlaces(),
            boundary.boundingbox
        )

        let nearbyPlaces = []

        if (this.overpassService) {
            nearbyPlaces = await this.overpassService.searchNearby(lat, lng, 15000)
        }

        const merged = this.mergePlaces(localPlaces, nearbyPlaces)

        this.mapManager.clearSearchMarkers()
        this.displayPlaces(merged)

        if (boundary.boundingbox) {
            const [south, north, west, east] = boundary.boundingbox
            this.mapManager.fitBounds([[south, west], [north, east]], [60, 60])
        } else {
            this.mapManager.flyTo(lat, lng, 11)
        }

        this.onExploreComplete?.({
            status: 'success',
            boundary,
            places: merged,
            lat,
            lng
        })

        // Tự tắt chế độ chọn vùng → trả con trỏ về bình thường
        this.disable()
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
