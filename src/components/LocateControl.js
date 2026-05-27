/**
 * LocateControl.js
 * Nút định vị riêng trên bản đồ (Leaflet Control)
 */

import { L } from '../utils/leafletIcons.js'

export default class LocateControl extends L.Control {
    constructor(locationService, options = {}) {
        super({ position: options.position || 'bottomright' })
        this.locationService = locationService
        this.onStatus = options.onStatus || (() => {})
        this.isLocating = false
    }

    onAdd() {
        this.container = L.DomUtil.create('div', 'leaflet-bar locate-control')

        this.button = L.DomUtil.create('button', 'locate-control-btn', this.container)
        this.button.type = 'button'
        this.button.title = 'Định vị vị trí của tôi'
        this.button.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
        `

        L.DomEvent.disableClickPropagation(this.container)
        L.DomEvent.on(this.button, 'click', this.handleClick, this)

        return this.container
    }

    handleClick = async event => {
        L.DomEvent.preventDefault(event)

        if (this.isLocating) return

        this.isLocating = true
        this.button.classList.add('locating')
        this.onStatus('Đang định vị...', 'info')

        try {
            const location = await this.locationService.locateAndShow()
            this.button.classList.add('locate-active')
            this.onStatus(
                `Vị trí: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
                'success'
            )
        } catch (error) {
            this.onStatus(error.message || 'Không thể định vị', 'error')
        } finally {
            this.isLocating = false
            this.button.classList.remove('locating')
        }
    }
}
