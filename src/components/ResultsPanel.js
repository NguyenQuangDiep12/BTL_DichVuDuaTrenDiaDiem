/**
 * ResultsPanel.js
 * Hiển thị danh sách kết quả tìm kiếm trên sidebar
 */

import { CATEGORY_LABELS } from './TourismSearchControl.js'

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
            this.listElement.innerHTML =
                '<li class="result-item"><p>Chưa có kết quả. Hãy thử từ khóa khác.</p></li>'
            return
        }

        places.forEach(place => {
            const li = document.createElement('li')
            li.className = 'result-item'
            li.dataset.id = place.id

            if (place.id === this.activeId) {
                li.classList.add('active')
            }

            const categoryLabel = CATEGORY_LABELS[place.category] || place.category

            li.innerHTML = `
                <h3>${place.name}</h3>
                <p>${place.address || place.description || ''}</p>
                <span class="category-tag">${categoryLabel}</span>
                <div class="result-actions">
                    <button type="button" data-action="view">Xem trên bản đồ</button>
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

    setActive(id) {
        this.activeId = id

        this.listElement.querySelectorAll('.result-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === String(id))
        })
    }
}
