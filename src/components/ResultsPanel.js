/**
 * ResultsPanel.js
 * Hiển thị danh sách kết quả tìm kiếm trên sidebar
 */

import { CATEGORY_LABELS } from './TourismSearchControl.js'

const SOURCE_LABELS = {
    geojson:    '',
    overpass:   'OSM',
    nominatim:  'OSM',
}

export default class ResultsPanel {
    constructor(listElement, countElement) {
        this.listElement = listElement
        this.countElement = countElement
        this.places = []
        this.onSelect = null
        this.onRoute = null
        this.activeId = null
    }

    render(places) {
        this.places = places
        this.countElement.textContent = String(places.length)
        this.listElement.innerHTML = ''

        if (places.length === 0) {
            this.listElement.innerHTML = `
                <li class="result-item result-empty">
                    <div class="result-empty-icon">🗺️</div>
                    <p>Chưa có kết quả. Thử từ khóa khác hoặc click vào bản đồ để khám phá vùng.</p>
                </li>`
            return
        }

        places.forEach(place => {
            const li = document.createElement('li')
            li.className = 'result-item'
            li.dataset.id = place.id

            if (place.id === this.activeId) {
                li.classList.add('active')
            }

            const categoryLabel = CATEGORY_LABELS[place.category] || 'Địa điểm'
            const sourceLabel = SOURCE_LABELS[place.source] ?? ''

            // Dòng thông tin phụ: ưu tiên địa chỉ → mô tả → fallback
            const subInfo = this.buildSubInfo(place)

            // Thumbnail nhỏ hoặc icon category
            const thumbHtml = this.buildThumb(place)

            li.innerHTML = `
                <div class="result-inner">
                    ${thumbHtml}
                    <div class="result-text">
                        <h3 title="${place.name}">${place.name}</h3>
                        <p class="result-sub${subInfo.empty ? ' result-no-info' : ''}">${subInfo.text}</p>
                        <div class="result-tags">
                            <span class="category-tag">${categoryLabel}</span>
                            ${sourceLabel ? `<span class="source-tag">${sourceLabel}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="result-actions">
                    <button type="button" data-action="view">Xem bản đồ</button>
                    <button type="button" data-action="route">Chỉ đường</button>
                </div>
            `

            li.addEventListener('click', event => {
                const action = event.target.dataset.action

                if (action === 'route') {
                    event.stopPropagation()
                    this.onRoute?.(place)
                    return
                }

                if (action === 'view' || !action) {
                    this.setActive(place.id)
                    this.onSelect?.(place)
                }
            })

            this.listElement.appendChild(li)
        })
    }

    /** Tạo thông tin phụ có ý nghĩa, không để trống */
    buildSubInfo(place) {
        const addr = place.address?.trim()
        const desc = place.description?.trim()

        if (addr && addr !== 'Việt Nam') {
            // Rút gọn địa chỉ dài
            const shortAddr = addr.split(',').slice(0, 3).join(',').trim()
            return { text: shortAddr, empty: false }
        }

        if (desc) {
            // Rút gọn mô tả dài
            const shortDesc = desc.length > 80 ? desc.slice(0, 77) + '…' : desc
            return { text: shortDesc, empty: false }
        }

        return { text: 'Chưa có thông tin địa chỉ', empty: true }
    }

    /** Thumbnail nhỏ hoặc icon placeholder */
    buildThumb(place) {
        if (place.image) {
            return `
                <div class="result-thumb">
                    <img
                        src="${place.image}"
                        alt=""
                        loading="lazy"
                        onerror="this.parentElement.classList.add('result-thumb--fallback'); this.remove()"
                    />
                </div>`
        }

        const emojis = {
            di_tich:    '🏛️',
            thien_nhien:'🌿',
            bai_bien:   '🏖️',
            giai_tri:   '🎡',
        }
        const emoji = emojis[place.category] || '📍'

        return `<div class="result-thumb result-thumb--icon">${emoji}</div>`
    }

    setActive(id) {
        this.activeId = id

        this.listElement.querySelectorAll('.result-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === String(id))
        })
    }
}