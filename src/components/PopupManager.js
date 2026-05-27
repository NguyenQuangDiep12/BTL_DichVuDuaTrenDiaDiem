/**
 * PopupManager.js
 * Tạo nội dung popup cho marker
 */

import { CATEGORY_LABELS } from './TourismSearchControl.js'

/** Icon SVG placeholder theo danh mục khi không có ảnh */
const CATEGORY_ICONS = {
    di_tich: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6"/>
    </svg>`,
    thien_nhien: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 22V12M12 12C12 7 7 4 3 6c4 0 7 3 9 6M12 12c0-5 5-8 9-6-4 0-7 3-9 6"/>
        <path d="M5 22c0-4 3-7 7-7s7 3 7 7"/>
    </svg>`,
    bai_bien: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 18c2-2 4-3 6-2s4 2 6 0 4-2 6 0M12 2v8M8 6l4-4 4 4"/>
        <circle cx="12" cy="12" r="2"/>
    </svg>`,
    giai_tri: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
    </svg>`,
    default: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 21s-8-6.5-8-12a8 8 0 0 1 16 0c0 5.5-8 12-8 12z"/>
        <circle cx="12" cy="9" r="3"/>
    </svg>`
}

/** Màu nền placeholder theo danh mục */
const CATEGORY_COLORS = {
    di_tich:    { bg: '#fef3c7', color: '#92400e' },
    thien_nhien:{ bg: '#dcfce7', color: '#166534' },
    bai_bien:   { bg: '#dbeafe', color: '#1e40af' },
    giai_tri:   { bg: '#fce7f3', color: '#9d174d' },
    default:    { bg: '#f1f5f9', color: '#475569' }
}

export default class PopupManager {
    static createTourismPopup(place) {
        const categoryLabel = CATEGORY_LABELS[place.category] || 'Địa điểm du lịch'
        const colors = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.default
        const icon = CATEGORY_ICONS[place.category] || CATEGORY_ICONS.default

        // --- Ảnh hoặc placeholder ---
        const mediaHtml = place.image
            ? `<div class="popup-image-wrap">
                   <img
                       src="${place.image}"
                       alt="${place.name}"
                       loading="lazy"
                       onerror="this.closest('.popup-image-wrap').replaceWith(this.closest('.popup-image-wrap').nextElementSibling)"
                   />
               </div>
               <div class="popup-placeholder" style="background:${colors.bg};color:${colors.color};display:none">
                   ${icon}
                   <span>${categoryLabel}</span>
               </div>`
            : `<div class="popup-placeholder" style="background:${colors.bg};color:${colors.color}">
                   ${icon}
                   <span>${categoryLabel}</span>
               </div>`

        // --- Mô tả ---
        const desc = place.description?.trim()
        const descHtml = desc
            ? `<p class="popup-desc">${desc}</p>`
            : `<p class="popup-desc popup-no-info">Chưa có mô tả cho địa điểm này.</p>`

        // --- Địa chỉ ---
        const addr = place.address?.trim()
        const addrHtml = addr && addr !== 'Việt Nam'
            ? `<p class="popup-addr"><b>📍</b> ${addr}</p>`
            : ''

        // --- Thông tin bổ sung (OSM) ---
        const extraHtml = PopupManager.buildExtraInfo(place)

        // --- Nguồn dữ liệu ---
        const sourceLabel = place.source === 'overpass'
            ? `<span class="popup-source">OpenStreetMap</span>`
            : place.source === 'nominatim'
            ? `<span class="popup-source">Nominatim</span>`
            : ''

        return `
            <div class="popup-container">
                <h3>${place.name}</h3>
                ${mediaHtml}
                <div class="popup-body">
                    ${descHtml}
                    ${addrHtml}
                    ${extraHtml}
                    <div class="popup-footer">
                        <span class="category-tag">${categoryLabel}</span>
                        ${sourceLabel}
                    </div>
                </div>
            </div>
        `
    }

    /** Thông tin bổ sung từ tags OSM */
    static buildExtraInfo(place) {
        const rows = []

        if (place.website) {
            rows.push(`<a href="${place.website}" target="_blank" rel="noreferrer" class="popup-link">🌐 Website</a>`)
        }
        if (place.phone) {
            rows.push(`<span>📞 ${place.phone}</span>`)
        }
        if (place.openingHours) {
            rows.push(`<span>🕐 ${place.openingHours}</span>`)
        }
        if (place.wikidata) {
            const wdUrl = `https://www.wikidata.org/wiki/${place.wikidata}`
            rows.push(`<a href="${wdUrl}" target="_blank" rel="noreferrer" class="popup-link">📖 Wikipedia</a>`)
        }

        return rows.length
            ? `<div class="popup-extra">${rows.join('')}</div>`
            : ''
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