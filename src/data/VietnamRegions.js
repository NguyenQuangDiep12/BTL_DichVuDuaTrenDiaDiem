/**
 * Dữ liệu vùng miền, tỉnh thành và địa điểm du lịch liên quan
 */

export const REGIONS = [
    {
        id: 'bac-bo',
        name: 'Bắc Bộ',
        type: 'region',
        aliases: ['bac bo', 'miền bắc', 'mien bac', 'bắc bộ', 'tay bac', 'tây bắc'],
        center: [21.5, 105.5],
        zoom: 7,
        placeIds: ['hanoi-hoankiem', 'hanoi-vanmieu', 'halong-bay', 'sapa-fansipan']
    },
    {
        id: 'trung-bo',
        name: 'Miền Trung',
        type: 'region',
        aliases: ['trung bo', 'miền trung', 'mien trung', 'trung bộ', 'duyên hải miền trung'],
        center: [16.5, 107.5],
        zoom: 7,
        placeIds: ['hoian-oldtown', 'danang-bana', 'hue-citadel', 'phongnha-cave', 'nhatrang-beach']
    },
    {
        id: 'nam-bo',
        name: 'Nam Bộ',
        type: 'region',
        aliases: ['nam bo', 'miền nam', 'mien nam', 'nam bộ', 'đông nam bộ', 'dong nam bo'],
        center: [10.8, 106.5],
        zoom: 7,
        placeIds: ['hcm-ben-thanh', 'cu-chi-tunnels', 'mekong-delta', 'phuquoc-beach']
    },
    {
        id: 'tay-nguyen',
        name: 'Tây Nguyên',
        type: 'region',
        aliases: ['tay nguyen', 'tây nguyên', 'cao nguyen'],
        center: [12.5, 108.0],
        zoom: 8,
        placeIds: ['dalat-xuanhuong']
    }
]

export const PROVINCES = [
    {
        id: 'ha-noi',
        name: 'Hà Nội',
        type: 'province',
        aliases: ['ha noi', 'hanoi', 'thu do', 'thủ đô'],
        center: [21.0285, 105.8542],
        zoom: 12,
        placeIds: ['hanoi-hoankiem', 'hanoi-vanmieu']
    },
    {
        id: 'quang-ninh',
        name: 'Quảng Ninh',
        type: 'province',
        aliases: ['quang ninh', 'ha long', 'hạ long'],
        center: [20.9101, 107.0502],
        zoom: 10,
        placeIds: ['halong-bay']
    },
    {
        id: 'lao-cai',
        name: 'Lào Cai',
        type: 'province',
        aliases: ['lao cai', 'sa pa', 'sapa', 'fansipan'],
        center: [22.336, 103.844],
        zoom: 11,
        placeIds: ['sapa-fansipan']
    },
    {
        id: 'quang-nam',
        name: 'Quảng Nam',
        type: 'province',
        aliases: ['quang nam', 'hoi an', 'hội an'],
        center: [15.8801, 108.3269],
        zoom: 12,
        placeIds: ['hoian-oldtown']
    },
    {
        id: 'da-nang',
        name: 'Đà Nẵng',
        type: 'province',
        aliases: ['da nang', 'danang', 'bà nà', 'ba na'],
        center: [16.0544, 108.2022],
        zoom: 12,
        placeIds: ['danang-bana']
    },
    {
        id: 'khanh-hoa',
        name: 'Khánh Hòa',
        type: 'province',
        aliases: ['khanh hoa', 'nha trang', 'nhatrang'],
        center: [12.2388, 109.1967],
        zoom: 11,
        placeIds: ['nhatrang-beach']
    },
    {
        id: 'lam-dong',
        name: 'Lâm Đồng',
        type: 'province',
        aliases: ['lam dong', 'da lat', 'đà lạt', 'dalat'],
        center: [11.9404, 108.4419],
        zoom: 12,
        placeIds: ['dalat-xuanhuong']
    },
    {
        id: 'kien-giang',
        name: 'Kiên Giang',
        type: 'province',
        aliases: ['kien giang', 'phu quoc', 'phú quốc'],
        center: [10.2899, 103.9574],
        zoom: 11,
        placeIds: ['phuquoc-beach']
    },
    {
        id: 'tp-hcm',
        name: 'TP. Hồ Chí Minh',
        type: 'province',
        aliases: ['ho chi minh', 'hcm', 'sai gon', 'sài gòn', 'tphcm'],
        center: [10.7725, 106.698],
        zoom: 12,
        placeIds: ['hcm-ben-thanh', 'cu-chi-tunnels']
    },
    {
        id: 'thua-thien-hue',
        name: 'Thừa Thiên Huế',
        type: 'province',
        aliases: ['hue', 'huế', 'thua thien hue', 'cố đô'],
        center: [16.4696, 107.5794],
        zoom: 12,
        placeIds: ['hue-citadel']
    },
    {
        id: 'quang-binh',
        name: 'Quảng Bình',
        type: 'province',
        aliases: ['quang binh', 'phong nha', 'phong nha ke bang'],
        center: [17.5906, 106.2833],
        zoom: 10,
        placeIds: ['phongnha-cave']
    },
    {
        id: 'can-tho',
        name: 'Cần Thơ',
        type: 'province',
        aliases: ['can tho', 'cần thơ', 'mekong', 'cửu long', 'cai rang'],
        center: [10.0167, 105.7833],
        zoom: 12,
        placeIds: ['mekong-delta']
    },
    {
        id: 'binh-thuan',
        name: 'Bình Thuận',
        type: 'province',
        aliases: ['binh thuan', 'mui ne', 'mũi né', 'phan thiet'],
        center: [10.95, 108.45],
        zoom: 11,
        placeIds: ['muine-sand-dunes']
    }
]

export const ALL_AREAS = [...REGIONS, ...PROVINCES]

function normalize(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim()
}

export function matchAreas(keyword) {
    const q = normalize(keyword)
    if (!q) return []

    return ALL_AREAS.filter(area => {
        if (normalize(area.name).includes(q)) return true
        return area.aliases.some(alias => alias.includes(q) || q.includes(alias))
    })
}

export function matchPlacesByKeyword(places, keyword) {
    const q = normalize(keyword)
    if (!q) return []

    return places.filter(place =>
        normalize(place.name).includes(q) ||
        normalize(place.address || '').includes(q) ||
        normalize(place.description || '').includes(q)
    )
}

export function getPlacesForArea(area, allPlaces) {
    const byId = new Map(allPlaces.map(p => [p.id, p]))
    return area.placeIds.map(id => byId.get(id)).filter(Boolean)
}
