/**
 * LocationService.js
 * Quản lý vị trí GPS và vị trí nhập tay
 */

export default class LocationService {
    constructor(mapManager, options = {}) {
        this.mapManager = mapManager
        this.geocode = options.geocode
        this.gpsLocation = null
        this.customLocation = null
        this.activeMode = null
        this.onChange = null
    }

    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Trình duyệt không hỗ trợ định vị'))
                return
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    })
                },
                error => {
                    const messages = {
                        1: 'Bạn cần cho phép truy cập vị trí',
                        2: 'Không thể xác định vị trí',
                        3: 'Hết thời gian chờ định vị'
                    }
                    reject(new Error(messages[error.code] || 'Không thể lấy vị trí'))
                },
                {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 30000
                }
            )
        })
    }

    async locateAndShow(options = {}) {
        const coords = await this.getCurrentLocation()
        const zoom = options.zoom ?? 15

        this.gpsLocation = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            label: 'Vị trí GPS hiện tại',
            source: 'gps'
        }
        this.activeMode = 'gps'

        this.mapManager.flyTo(coords.latitude, coords.longitude, zoom)
        this.showOnMap(this.gpsLocation)
        this.notifyChange()

        return this.gpsLocation
    }

    async setCustomFromInput(input) {
        const trimmed = input.trim()
        if (!trimmed) {
            throw new Error('Vui lòng nhập địa chỉ hoặc tọa độ')
        }

        const coords = this.parseCoordinates(trimmed)

        if (coords) {
            return this.setCustomLocation(
                coords.latitude,
                coords.longitude,
                trimmed,
                { flyTo: true }
            )
        }

        if (!this.geocode) {
            throw new Error('Không thể tra cứu địa chỉ')
        }

        const place = await this.geocode(trimmed)

        if (!place) {
            throw new Error('Không tìm thấy địa điểm. Thử nhập tọa độ: 21.0285, 105.8542')
        }

        return this.setCustomLocation(
            place.lat,
            place.lon,
            place.name,
            { flyTo: true, address: place.address }
        )
    }

    setCustomLocation(lat, lng, label, options = {}) {
        this.customLocation = {
            latitude: lat,
            longitude: lng,
            label,
            address: options.address || label,
            source: 'custom'
        }
        this.activeMode = 'custom'

        if (options.flyTo) {
            this.mapManager.flyTo(lat, lng, options.zoom ?? 14)
        }

        this.showOnMap(this.customLocation)
        this.notifyChange()

        return this.customLocation
    }

    parseCoordinates(input) {
        const match = input.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/)

        if (!match) return null

        const latitude = parseFloat(match[1])
        const longitude = parseFloat(match[2])

        if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return null
        }

        return { latitude, longitude }
    }

    showOnMap(location) {
        this.mapManager.setUserLocation(
            location.latitude,
            location.longitude,
            {
                type: location.source,
                label: location.label
            }
        )
    }

    /** Vị trí đang dùng cho chỉ đường / tìm gần đây */
    getActiveLocation() {
        if (this.activeMode === 'custom' && this.customLocation) {
            return this.customLocation
        }

        if (this.activeMode === 'gps' && this.gpsLocation) {
            return this.gpsLocation
        }

        return this.customLocation || this.gpsLocation
    }

    getLocation() {
        return this.getActiveLocation()
    }

    getActiveMode() {
        return this.activeMode
    }

    hasActiveLocation() {
        return Boolean(this.getActiveLocation())
    }

    clearCustomLocation() {
        this.customLocation = null

        if (this.activeMode === 'custom') {
            this.activeMode = this.gpsLocation ? 'gps' : null

            if (this.gpsLocation) {
                this.showOnMap(this.gpsLocation)
            } else {
                this.mapManager.clearUserLocation()
            }
        }

        this.notifyChange()
    }

    reset() {
        this.gpsLocation = null
        this.customLocation = null
        this.activeMode = null
        this.mapManager.clearUserLocation()
        this.notifyChange()
    }

    notifyChange() {
        this.onChange?.(this.getActiveLocation(), this.activeMode)
    }
}
