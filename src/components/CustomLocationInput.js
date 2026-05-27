/**
 * CustomLocationInput.js
 * Input nhập vị trí xuất phát thay cho GPS
 */

export default class CustomLocationInput {
    constructor(elements, locationService, options = {}) {
        this.input = elements.input
        this.setBtn = elements.setBtn
        this.gpsBtn = elements.gpsBtn
        this.statusEl = elements.statusEl
        this.locationService = locationService
        this.onStatus = options.onStatus || (() => {})

        this.bindEvents()
        this.updateStatus(null, null)
    }

    bindEvents() {
        this.setBtn.addEventListener('click', () => this.handleSetCustom())
        this.gpsBtn.addEventListener('click', () => this.handleUseGps())

        this.input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault()
                this.handleSetCustom()
            }
        })

        this.locationService.onChange = (location, mode) => {
            if (mode === 'gps') {
                this.input.value = ''
            }
            this.updateStatus(location, mode)
        }
    }

    async handleSetCustom() {
        const value = this.input.value.trim()

        if (!value) {
            this.onStatus('Nhập địa chỉ hoặc tọa độ (lat, lng)', 'error')
            return
        }

        this.setBtn.disabled = true
        this.onStatus('Đang xác định vị trí...', 'info')

        try {
            const location = await this.locationService.setCustomFromInput(value)
            this.onStatus(`Đã đặt: ${location.label}`, 'success')
        } catch (error) {
            this.onStatus(error.message, 'error')
        } finally {
            this.setBtn.disabled = false
        }
    }

    async handleUseGps() {
        this.gpsBtn.disabled = true
        this.onStatus('Đang lấy vị trí GPS...', 'info')

        try {
            const location = await this.locationService.locateAndShow()
            this.input.value = ''
            this.onStatus(`Đang dùng GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`, 'success')
        } catch (error) {
            this.onStatus(error.message, 'error')
        } finally {
            this.gpsBtn.disabled = false
        }
    }

    updateStatus(location, mode) {
        if (!location) {
            this.statusEl.textContent = 'Chưa đặt vị trí xuất phát'
            this.statusEl.dataset.mode = ''
            return
        }

        const prefix = mode === 'custom' ? 'Điểm nhập' : 'GPS'
        const detail = location.address || location.label
        this.statusEl.textContent = `${prefix}: ${detail}`
        this.statusEl.dataset.mode = mode || ''
    }

    clear() {
        this.input.value = ''
        this.updateStatus(null, null)
    }
}
