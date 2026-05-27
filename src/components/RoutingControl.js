/**
 * RoutingControl.js
 * Chỉ đường qua OSRM API (miễn phí)
 */

import PopupManager from './PopupManager.js'

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

export default class RoutingControl {
    constructor(mapManager) {
        this.mapManager = mapManager
    }

    async getRoute(startLat, startLng, endLat, endLng) {
        const url =
            `${OSRM_URL}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

        try {
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error('Routing request failed')
            }

            return await response.json()
        } catch (error) {
            console.error('Routing Error:', error)
            return null
        }
    }

    displayRoute(routeData, destination) {
        this.mapManager.clearRoutes()

        if (!routeData?.routes?.length) {
            return null
        }

        const route = routeData.routes[0]
        const coordinates = route.geometry.coordinates
        const latLngs = coordinates.map(coord => [coord[1], coord[0]])

        const polyline = this.mapManager.addPolyline(latLngs)
        this.mapManager.fitBounds(latLngs)

        const popupContent = PopupManager.createRoutePopup(
            route.distance,
            route.duration,
            destination?.name
        )

        polyline.bindPopup(popupContent).openPopup()

        return route
    }

    async route(startLat, startLng, endLat, endLng, destination = null) {
        const routeData = await this.getRoute(startLat, startLng, endLat, endLng)

        if (routeData?.routes?.length) {
            return this.displayRoute(routeData, destination)
        }

        return null
    }
}
