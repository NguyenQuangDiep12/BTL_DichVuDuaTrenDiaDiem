/**
 * TourismLayer.js
 * Quản lý layer địa điểm du lịch từ GeoJSON
 */

import { L } from '../utils/leafletIcons.js'
import PopupManager from './PopupManager.js'
import { CATEGORY_LABELS } from './TourismSearchControl.js'

export default class TourismLayer {
    constructor(mapManager) {
        this.mapManager = mapManager
        this.geoJsonLayer = null
        this.allFeatures = []
        this.onPlaceSelect = null
    }

    async loadGeoJSON(url) {
        try {
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error('Cannot load GeoJSON')
            }

            const geojsonData = await response.json()
            this.allFeatures = geojsonData.features || []
            this.renderGeoJSON(geojsonData)

            return geojsonData
        } catch (error) {
            console.error('GeoJSON Load Error:', error)
            return null
        }
    }

    renderGeoJSON(geojsonData, category = 'all') {
        if (this.geoJsonLayer) {
            this.mapManager.getMap().removeLayer(this.geoJsonLayer)
        }

        const filtered = {
            ...geojsonData,
            features: geojsonData.features.filter(feature => {
                if (category === 'all') return true
                return feature.properties?.category === category
            })
        }

        this.geoJsonLayer = L.geoJSON(filtered, {
            pointToLayer: (feature, latlng) => {
                return L.marker(latlng)
            },

            onEachFeature: (feature, layer) => {
                const props = feature.properties
                const place = {
                    id: props.id,
                    name: props.name,
                    description: props.description,
                    category: props.category,
                    address: props.address,
                    image: props.image,
                    lat: feature.geometry.coordinates[1],
                    lon: feature.geometry.coordinates[0],
                    source: 'geojson'
                }

                layer.bindPopup(PopupManager.createTourismPopup(place))

                layer.on('click', () => {
                    if (this.onPlaceSelect) {
                        this.onPlaceSelect(place)
                    }
                })

                layer.placeData = place
            }
        })

        this.geoJsonLayer.addTo(this.mapManager.getMap())
    }

    filterByCategory(category) {
        this.renderGeoJSON(
            { type: 'FeatureCollection', features: this.allFeatures },
            category
        )
    }

    getPlaces(category = 'all') {
        return this.allFeatures
            .filter(f => category === 'all' || f.properties.category === category)
            .map(f => ({
                id: f.properties.id,
                name: f.properties.name,
                description: f.properties.description,
                category: f.properties.category,
                address: f.properties.address,
                image: f.properties.image,
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
                source: 'geojson'
            }))
    }

    searchLocal(keyword, category = 'all') {
        const normalized = keyword.toLowerCase().trim()

        return this.getPlaces(category).filter(place => {
            return (
                place.name.toLowerCase().includes(normalized) ||
                place.description?.toLowerCase().includes(normalized) ||
                place.address?.toLowerCase().includes(normalized)
            )
        })
    }

    zoomToLayer() {
        if (this.geoJsonLayer?.getBounds().isValid()) {
            this.mapManager.getMap().fitBounds(this.geoJsonLayer.getBounds(), {
                padding: [40, 40]
            })
        }
    }

    showLayer() {
        if (this.geoJsonLayer) {
            this.geoJsonLayer.addTo(this.mapManager.getMap())
        }
    }

    hideLayer() {
        if (this.geoJsonLayer) {
            this.mapManager.getMap().removeLayer(this.geoJsonLayer)
        }
    }
}

export { CATEGORY_LABELS }
