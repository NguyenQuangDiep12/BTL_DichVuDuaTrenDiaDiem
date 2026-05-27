/**
 * main.js
 * Khởi chạy hệ thống tìm kiếm địa điểm du lịch
 */

import 'leaflet/dist/leaflet.css'
import './style.css'

import { fixDefaultIcons } from './utils/leafletIcons.js'
import MapManager from './components/MapManager.js'
import TourismSearchControl from './components/TourismSearchControl.js'
import TourismLayer from './components/TourismLayer.js'
import LocationService from './components/LocationService.js'
import RoutingControl from './components/RoutingControl.js'
import OverpassService from './components/OverpassService.js'
import ResultsPanel from './components/ResultsPanel.js'
import PopupManager from './components/PopupManager.js'
import AutocompleteControl from './components/AutocompleteControl.js'
import RegionBoundaryService from './components/RegionBoundaryService.js'
import MapClickExplorer from './components/MapClickExplorer.js'
import LocateControl from './components/LocateControl.js'
import ExploreControl from './components/ExploreControl.js'
import CustomLocationInput from './components/CustomLocationInput.js'
import { getPlacesForArea } from './data/VietnamRegions.js'

fixDefaultIcons()

const mapManager = new MapManager('map')
const searchControl = new TourismSearchControl(mapManager)
const tourismLayer = new TourismLayer(mapManager)
const locationService = new LocationService(mapManager, {
    geocode: keyword => searchControl.geocode(keyword)
})
const routingControl = new RoutingControl(mapManager)
const overpassService = new OverpassService()
const boundaryService = new RegionBoundaryService()

const searchInput = document.getElementById('searchInput')
const searchBtn = document.getElementById('searchBtn')
const nearbyBtn = document.getElementById('nearbyBtn')
const resetBtn = document.getElementById('resetBtn')
const categoryFilter = document.getElementById('categoryFilter')
const statusToast = document.getElementById('statusToast')
const autocompleteDropdown = document.getElementById('autocompleteDropdown')
const originInput = document.getElementById('originInput')
const originBtn = document.getElementById('originBtn')
const originGpsBtn = document.getElementById('originGpsBtn')
const originStatus = document.getElementById('originStatus')

const resultsPanel = new ResultsPanel(
    document.getElementById('resultsList'),
    document.getElementById('resultCount')
)

const mapClickExplorer = new MapClickExplorer(mapManager, {
    boundaryService,
    overpassService,
    getAllPlaces: () => tourismLayer.getPlaces()
})

let toastTimer = null
let exploreControlInstance = null
let locateControlInstance = null

async function getStartLocation(promptIfMissing = true) {
    const existing = locationService.getActiveLocation()

    if (existing) {
        return existing
    }

    if (!promptIfMissing) {
        return null
    }

    showStatus('Chưa có điểm xuất phát. Nhập địa chỉ hoặc dùng GPS.', 'info')
    originInput.focus()
    throw new Error('Vui lòng đặt điểm xuất phát trước')
}

function showStatus(message, type = 'info') {
    statusToast.textContent = message
    statusToast.className = `status-toast visible ${type}`

    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
        statusToast.classList.remove('visible')
    }, 3500)
}

function getCategory() {
    return categoryFilter.value
}

function focusPlace(place) {
    resultsPanel.setActive(place.id)
    mapManager.flyTo(place.lat, place.lon, 15)

    const popupContent = place.source === 'geojson'
        ? PopupManager.createTourismPopup(place)
        : searchControl.buildPopup(place)

    mapManager.clearSearchMarkers()
    mapManager.addSearchMarker(place.lat, place.lon, popupContent).openPopup()
}

async function exploreArea(area) {
    showStatus(`Đang tải vùng ${area.name}...`, 'info')

    searchInput.value = area.name

    const boundary = await boundaryService.getBoundaryByName(area.name)
    const areaPlaces = getPlacesForArea(area, tourismLayer.getPlaces(getCategory()))

    if (boundary?.geojson || boundary?.boundingbox) {
        mapManager.drawBoundary(boundary.geojson, boundary.name, boundary.boundingbox)
    }

    mapManager.flyTo(area.center[0], area.center[1], area.zoom)

    let places = areaPlaces

    if (boundary?.boundingbox) {
        const inBounds = boundaryService.filterPlacesInBounds(
            tourismLayer.getPlaces(),
            boundary.boundingbox
        )
        places = mergeResults(areaPlaces, inBounds)
    }

    resultsPanel.render(places)
    mapManager.clearSearchMarkers()

    places.forEach(place => {
        mapManager.addSearchMarker(
            place.lat,
            place.lon,
            PopupManager.createTourismPopup(place)
        )
    })

    showStatus(`${area.name}: ${places.length} địa điểm nổi bật`, 'success')
}

async function routeToPlace(place) {
    try {
        const start = await getStartLocation()

        showStatus(`Đang tính đường từ ${start.label} tới ${place.name}...`, 'info')

        const route = await routingControl.route(
            start.latitude,
            start.longitude,
            place.lat,
            place.lon,
            place
        )

        if (route) {
            showStatus(
                `Tuyến đường: ${(route.distance / 1000).toFixed(1)} km, ~${Math.round(route.duration / 60)} phút`,
                'success'
            )
        } else {
            showStatus('Không tìm được tuyến đường', 'error')
        }
    } catch (error) {
        showStatus(error.message || 'Lỗi chỉ đường', 'error')
    }
}

async function performSearch() {
    const keyword = searchInput.value.trim()
    const category = getCategory()

    if (!keyword) {
        const localPlaces = tourismLayer.getPlaces(category)
        resultsPanel.render(localPlaces)
        tourismLayer.filterByCategory(category)
        showStatus(`Hiển thị ${localPlaces.length} địa điểm nổi bật`, 'info')
        return
    }

    showStatus('Đang tìm kiếm...', 'info')

    const localResults = tourismLayer.searchLocal(keyword, category)
    const apiResults = await searchControl.search(`${keyword} Vietnam`, { limit: 8 })

    const merged = mergeResults(localResults, apiResults)
    const filtered = category === 'all'
        ? merged
        : merged.filter(p => p.category === category)

    resultsPanel.render(filtered)
    displaySearchMarkers(filtered)

    showStatus(`Tìm thấy ${filtered.length} kết quả`, filtered.length ? 'success' : 'error')
}

function displaySearchMarkers(results) {
    mapManager.clearSearchMarkers()

    results.forEach(place => {
        const popupContent = place.source === 'geojson'
            ? PopupManager.createTourismPopup(place)
            : searchControl.buildPopup(place)

        const marker = mapManager.addSearchMarker(place.lat, place.lon, popupContent)
        marker.placeData = place
        marker.on('click', () => focusPlace(place))
    })

    if (results.length > 0) {
        mapManager.fitBounds(results.map(p => [p.lat, p.lon]))
    }
}

function mergeResults(local, remote) {
    const seen = new Set()
    const combined = []

    for (const place of [...local, ...remote]) {
        const key = `${place.name}-${place.lat?.toFixed(3)}`
        if (seen.has(key)) continue
        seen.add(key)
        combined.push(place)
    }

    return combined
}

async function searchNearby() {
    try {
        const location = await getStartLocation()

        showStatus(`Đang tìm điểm gần ${location.label}...`, 'info')

        const category = getCategory()
        const results = await overpassService.searchNearby(
            location.latitude,
            location.longitude
        )

        const filtered = category === 'all'
            ? results
            : results.filter(p => p.category === category)

        resultsPanel.render(filtered)
        displaySearchMarkers(filtered)

        showStatus(`Tìm thấy ${filtered.length} điểm gần điểm xuất phát`, filtered.length ? 'success' : 'error')
    } catch (error) {
        showStatus(error.message || 'Không thể tìm điểm gần đây', 'error')
    }
}

function resetMap() {
    mapManager.clearAllLayers()
    mapClickExplorer.clear()

    if (mapClickExplorer.active) {
        mapClickExplorer.toggle(false)
    }

    if (exploreControlInstance?.button) {
        exploreControlInstance.button.classList.remove('active')
    }

    searchInput.value = ''
    originInput.value = ''
    locationService.reset()
    customLocationInput.clear()

    if (locateControlInstance?.button) {
        locateControlInstance.button.classList.remove('locate-active')
    }

    categoryFilter.value = 'all'
    tourismLayer.filterByCategory('all')
    resultsPanel.render(tourismLayer.getPlaces())
    mapManager.flyTo(21.0285, 105.8542, 6)
    showStatus('Đã xóa bản đồ', 'info')
}

resultsPanel.onSelect = focusPlace
resultsPanel.onRoute = routeToPlace

tourismLayer.onPlaceSelect = place => {
    resultsPanel.setActive(place.id)
}

mapManager.initializeMap()

const customLocationInput = new CustomLocationInput(
    { input: originInput, setBtn: originBtn, gpsBtn: originGpsBtn, statusEl: originStatus },
    locationService,
    { onStatus: showStatus }
)

locateControlInstance = new LocateControl(locationService, {
    onStatus: showStatus
})
locateControlInstance.addTo(mapManager.getMap())

exploreControlInstance = new ExploreControl(mapClickExplorer, {
    onStatus: showStatus
})
exploreControlInstance.addTo(mapManager.getMap())

mapClickExplorer.onExploreComplete = result => {
    if (result.status === 'loading') {
        exploreControlInstance?.setLoading(true)
        showStatus('Đang phân tích vùng (tỉnh/thành phố)...', 'info')
        return
    }

    exploreControlInstance?.setLoading(false)

    if (result.status === 'error') {
        showStatus(result.message, 'error')
        return
    }

    resultsPanel.render(result.places)

    const sourceLabel = {
        overpass: 'Overpass',
        'nominatim-search': 'Nominatim',
        'nominatim-reverse': 'Nominatim',
        'bbox-fallback': 'vùng xấp xỉ'
    }[result.boundary.source] || ''

    showStatus(
        `${result.boundary.name}: ${result.places.length} địa điểm · Ranh giới ${sourceLabel}. Chuột đã về bình thường.`,
        'success'
    )
}

const autocomplete = new AutocompleteControl(searchInput, autocompleteDropdown, {
    searchControl,
    getAllPlaces: () => tourismLayer.getPlaces()
})

autocomplete.onSelectPlace = place => {
    focusPlace(place)
    resultsPanel.render([place])
}

autocomplete.onSelectArea = area => {
    exploreArea(area)
}

tourismLayer.loadGeoJSON('/data/tourism.geojson').then(() => {
    const places = tourismLayer.getPlaces()
    resultsPanel.render(places)
    tourismLayer.zoomToLayer()
})

searchBtn.addEventListener('click', () => {
    autocomplete.hide()
    performSearch()
})

searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && autocomplete.activeIndex < 0) {
        autocomplete.hide()
        performSearch()
    }
})

nearbyBtn.addEventListener('click', searchNearby)
resetBtn.addEventListener('click', resetMap)

categoryFilter.addEventListener('change', () => {
    const category = getCategory()
    tourismLayer.filterByCategory(category)

    const keyword = searchInput.value.trim()

    if (keyword) {
        performSearch()
    } else {
        resultsPanel.render(tourismLayer.getPlaces(category))
    }
})
