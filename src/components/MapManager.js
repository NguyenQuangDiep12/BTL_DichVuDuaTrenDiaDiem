/**
 * MapManager.js
 * Module quản lý bản đồ WebGIS (Leaflet + ES6)
 */

import { L } from '../utils/leafletIcons.js'

export default class MapManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.defaultCenter = options.center || [21.0285, 105.8542]
        this.defaultZoom = options.zoom || 6
        this.map = null
        this.markerLayer = L.layerGroup()
        this.searchMarkerLayer = L.layerGroup()
        this.polygonLayer = L.layerGroup()
        this.boundaryLayer = L.layerGroup()
        this.routeLayer = L.layerGroup()
        this.userLocationLayer = L.layerGroup()
        this.userMarker = null
        this.userCircle = null
        this.boundaryGeoLayer = null
    }

    initializeMap() {
        this.map = L.map(this.containerId, {
            zoomControl: true
        }).setView(this.defaultCenter, this.defaultZoom)

        this.initializeTileLayer()
        this.initializeLayers()
    }

    initializeTileLayer() {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(this.map)
    }

    initializeLayers() {
        this.boundaryLayer.addTo(this.map)
        this.polygonLayer.addTo(this.map)
        this.routeLayer.addTo(this.map)
        this.markerLayer.addTo(this.map)
        this.searchMarkerLayer.addTo(this.map)
        this.userLocationLayer.addTo(this.map)
    }

    flyTo(lat, lng, zoom = 15) {
        this.map.flyTo([lat, lng], zoom, { duration: 1.5 })
    }

    addMarker(lat, lng, popupContent = '', options = {}) {
        const marker = L.marker([lat, lng], options)

        if (popupContent) {
            marker.bindPopup(popupContent)
        }

        marker.addTo(this.markerLayer)
        return marker
    }

    addSearchMarker(lat, lng, popupContent = '') {
        const marker = L.marker([lat, lng])

        if (popupContent) {
            marker.bindPopup(popupContent)
        }

        marker.addTo(this.searchMarkerLayer)
        return marker
    }

    addPolyline(coordinates, options = {}) {
        const polyline = L.polyline(coordinates, {
            color: options.color || '#0ea5e9',
            weight: options.weight || 5,
            opacity: 0.85
        })

        polyline.addTo(this.routeLayer)
        return polyline
    }

    drawBoundary(geojson, label = '', boundingbox = null) {
        this.clearBoundary()

        if (geojson) {
            this.boundaryGeoLayer = L.geoJSON(geojson, {
                style: {
                    color: '#f59e0b',
                    weight: 2.5,
                    fillColor: '#f59e0b',
                    fillOpacity: 0.12,
                    dashArray: boundingbox && !geojson.coordinates?.[0]?.length ? '6 4' : null
                }
            })
        } else if (boundingbox) {
            const [south, north, west, east] = boundingbox

            this.boundaryGeoLayer = L.rectangle(
                [[south, west], [north, east]],
                {
                    color: '#f59e0b',
                    weight: 2.5,
                    fillColor: '#f59e0b',
                    fillOpacity: 0.1,
                    dashArray: '6 4'
                }
            )
        } else {
            return null
        }

        this.boundaryGeoLayer.addTo(this.boundaryLayer)

        if (label) {
            this.boundaryGeoLayer.bindPopup(`<b>Ranh giới:</b> ${label}`)
        }

        return this.boundaryGeoLayer
    }

    clearMarkers() {
        this.markerLayer.clearLayers()
    }

    clearSearchMarkers() {
        this.searchMarkerLayer.clearLayers()
    }

    clearRoutes() {
        this.routeLayer.clearLayers()
    }

    clearPolygons() {
        this.polygonLayer.clearLayers()
    }

    clearBoundary() {
        this.boundaryLayer.clearLayers()
        this.boundaryGeoLayer = null
    }

    clearAllLayers() {
        this.clearMarkers()
        this.clearSearchMarkers()
        this.clearRoutes()
        this.clearPolygons()
        this.clearBoundary()
        this.clearUserLocation()
    }

    setUserLocation(lat, lng, options = {}) {
        this.userLocationLayer.clearLayers()

        const type = options.type || 'gps'
        const isCustom = type === 'custom'
        const color = isCustom ? '#a855f7' : '#22c55e'
        const title = isCustom ? 'Vị trí xuất phát (nhập tay)' : 'Vị trí GPS của bạn'
        const popupLabel = options.label || title

        this.userMarker = L.marker([lat, lng], {
            title,
            zIndexOffset: 1000
        })

        this.userCircle = L.circle([lat, lng], {
            radius: 300,
            color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 2
        })

        this.userMarker.addTo(this.userLocationLayer)
        this.userCircle.addTo(this.userLocationLayer)
        this.userMarker.bindPopup(`<b>${popupLabel}</b>`)
    }

    clearUserLocation() {
        this.userLocationLayer.clearLayers()
        this.userMarker = null
        this.userCircle = null
    }

    fitBounds(latLngs, padding = [50, 50]) {
        if (latLngs.length === 0) return
        this.map.fitBounds(latLngs, { padding })
    }

    getMap() {
        return this.map
    }
}
