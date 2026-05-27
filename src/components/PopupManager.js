/**
 * PopupManager.js
 * Tạo nội dung popup cho marker
 */

import { CATEGORY_LABELS } from './TourismSearchControl.js'

export default class PopupManager {
    static createTourismPopup(place) {
        const categoryLabel = CATEGORY_LABELS[place.category] || place.category
        const imageHtml = place.image
            ? `<img src="${place.image}" alt="${place.name}" width="240" loading="lazy" />`
            : ''

        return `
            <div class="popup-container">
                <h3>${place.name}</h3>
                ${imageHtml}
                <p>${place.description || ''}</p>
                <p><b>Địa chỉ:</b> ${place.address || 'Việt Nam'}</p>
                <span class="category-tag">${categoryLabel}</span>
            </div>
        `
    }

    static createLocationPopup() {
        return `
            <div class="popup-container">
                <h3>Vị trí hiện tại</h3>
                <p>Bạn đang ở đây</p>
            </div>
        `
    }

    static createRoutePopup(distance, duration, destinationName = '') {
        const title = destinationName
            ? `Tuyến đường tới ${destinationName}`
            : 'Thông tin tuyến đường'

        return `
            <div class="popup-container">
                <h3>${title}</h3>
                <p><b>Khoảng cách:</b> ${(distance / 1000).toFixed(1)} km</p>
                <p><b>Thời gian:</b> ~${Math.round(duration / 60)} phút</p>
            </div>
        `
    }
}
