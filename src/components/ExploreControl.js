/**
 * ExploreControl.js
 * Nút bật/tắt chế độ khám phá vùng bằng click trên bản đồ
 */

import { L } from '../utils/leafletIcons.js'

export default class ExploreControl extends L.Control {
    constructor(mapClickExplorer, options = {}) {
        super({ position: options.position || 'topright' })
        this.mapClickExplorer = mapClickExplorer
        this.onStatus = options.onStatus || (() => {})
    }

    onAdd() {
        this.container = L.DomUtil.create('div', 'leaflet-bar explore-control')

        this.button = L.DomUtil.create('button', 'explore-control-btn', this.container)
        this.button.type = 'button'
        this.button.title = 'Khám phá vùng — kéo bản đồ hoặc click để chọn'
        this.button.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="none" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="9" r="2.5" fill="currentColor"/>
            </svg>
        `

        L.DomEvent.disableClickPropagation(this.container)
        L.DomEvent.on(this.button, 'click', this.handleClick, this)

        this.mapClickExplorer.onModeChange = active => {
            this.button.classList.toggle('active', active)
            if (!active) {
                this.button.classList.remove('loading')
            }
        }

        return this.container
    }

    handleClick = event => {
        L.DomEvent.preventDefault(event)
        L.DomEvent.stopPropagation(event)

        const active = this.mapClickExplorer.toggle()

        this.button.classList.toggle('active', active)

        if (active) {
            this.onStatus(
                'Kéo bản đồ để tìm vùng, click một lần để chọn (Hà Nội, Hòa Bình...)',
                'info'
            )
        } else {
            this.mapClickExplorer.clear()
            this.onStatus('Đã tắt chế độ khám phá — chuột bình thường', 'info')
        }
    }

    setLoading(loading) {
        this.button.classList.toggle('loading', loading)
    }
}
