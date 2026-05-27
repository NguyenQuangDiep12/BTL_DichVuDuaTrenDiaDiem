/**
 * Sửa lỗi icon marker mặc định khi dùng Leaflet với Vite
 */
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

export function fixDefaultIcons() {
    delete L.Icon.Default.prototype._getIconUrl

    L.Icon.Default.mergeOptions({
        iconUrl,
        iconRetinaUrl,
        shadowUrl
    })
}

export { L }
