/**
 * AutocompleteControl.js
 * Gợi ý địa điểm du lịch và vùng miền khi gõ
 */

import { matchAreas, matchPlacesByKeyword, getPlacesForArea } from '../data/VietnamRegions.js'
import { CATEGORY_LABELS } from './TourismSearchControl.js'

export default class AutocompleteControl {
    constructor(inputElement, dropdownElement, options = {}) {
        this.input = inputElement
        this.dropdown = dropdownElement
        this.searchControl = options.searchControl
        this.getAllPlaces = options.getAllPlaces
        this.debounceMs = options.debounceMs || 400
        this.timer = null
        this.activeIndex = -1
        this.suggestions = []

        this.onSelectPlace = null
        this.onSelectArea = null

        this.bindEvents()
    }

    bindEvents() {
        this.input.addEventListener('input', () => this.handleInput())
        this.input.addEventListener('focus', () => {
            if (this.input.value.trim()) this.handleInput()
        })
        this.input.addEventListener('keydown', event => this.handleKeydown(event))

        document.addEventListener('click', event => {
            if (!this.dropdown.contains(event.target) && event.target !== this.input) {
                this.hide()
            }
        })
    }

    handleInput() {
        clearTimeout(this.timer)

        this.timer = setTimeout(async () => {
            const keyword = this.input.value.trim()

            if (!keyword) {
                this.hide()
                return
            }

            await this.buildSuggestions(keyword)
            this.render()
        }, this.debounceMs)
    }

    async buildSuggestions(keyword) {
        const allPlaces = this.getAllPlaces()
        const localPlaces = matchPlacesByKeyword(allPlaces, keyword).slice(0, 6)
        const matchedAreas = matchAreas(keyword).slice(0, 4)

        const areaPlaces = matchedAreas.flatMap(area =>
            getPlacesForArea(area, allPlaces).map(place => ({
                ...place,
                _areaName: area.name,
                _suggestionType: 'area-place'
            }))
        )

        const uniqueAreaPlaces = areaPlaces.filter(
            (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
        ).slice(0, 6)

        let remotePlaces = []

        if (keyword.length >= 2 && this.searchControl) {
            remotePlaces = await this.searchControl.search(keyword, { limit: 4 })
        }

        this.suggestions = [
            ...matchedAreas.map(area => ({
                type: 'area',
                id: area.id,
                name: area.name,
                subtitle: `Vùng miền · ${getPlacesForArea(area, allPlaces).length} địa điểm`,
                data: area
            })),
            ...localPlaces.map(place => ({
                type: 'place',
                id: place.id,
                name: place.name,
                subtitle: place.address || CATEGORY_LABELS[place.category],
                data: place
            })),
            ...uniqueAreaPlaces
                .filter(p => !localPlaces.some(lp => lp.id === p.id))
                .map(place => ({
                    type: 'area-place',
                    id: `ap-${place.id}`,
                    name: place.name,
                    subtitle: `Thuộc ${place._areaName}`,
                    data: place
                })),
            ...remotePlaces
                .filter(rp => !localPlaces.some(lp => lp.name === rp.name))
                .map(place => ({
                    type: 'remote',
                    id: `remote-${place.id}`,
                    name: place.name,
                    subtitle: place.address?.split(',').slice(0, 2).join(',') || 'OpenStreetMap',
                    data: place
                }))
        ].slice(0, 12)

        this.activeIndex = -1
    }

    render() {
        if (this.suggestions.length === 0) {
            this.dropdown.innerHTML = '<div class="autocomplete-empty">Không có gợi ý</div>'
            this.dropdown.classList.add('visible')
            return
        }

        const groups = {
            area: { label: 'Vùng miền', items: [] },
            place: { label: 'Địa điểm du lịch', items: [] },
            'area-place': { label: 'Địa điểm theo vùng', items: [] },
            remote: { label: 'Gợi ý khác', items: [] }
        }

        this.suggestions.forEach((item, index) => {
            groups[item.type]?.items.push({ ...item, index })
        })

        let html = ''

        for (const group of Object.values(groups)) {
            if (group.items.length === 0) continue

            html += `<div class="autocomplete-group"><div class="autocomplete-group-label">${group.label}</div>`

            for (const item of group.items) {
                html += `
                    <button
                        type="button"
                        class="autocomplete-item${item.index === this.activeIndex ? ' active' : ''}"
                        data-index="${item.index}"
                        role="option"
                    >
                        <span class="autocomplete-item-name">${item.name}</span>
                        <span class="autocomplete-item-sub">${item.subtitle}</span>
                    </button>
                `
            }

            html += '</div>'
        }

        this.dropdown.innerHTML = html
        this.dropdown.classList.add('visible')

        this.dropdown.querySelectorAll('.autocomplete-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectIndex(Number(btn.dataset.index))
            })
        })
    }

    handleKeydown(event) {
        if (!this.dropdown.classList.contains('visible')) return

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            this.activeIndex = Math.min(this.activeIndex + 1, this.suggestions.length - 1)
            this.render()
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            this.activeIndex = Math.max(this.activeIndex - 1, 0)
            this.render()
        } else if (event.key === 'Enter' && this.activeIndex >= 0) {
            event.preventDefault()
            this.selectIndex(this.activeIndex)
        } else if (event.key === 'Escape') {
            this.hide()
        }
    }

    selectIndex(index) {
        const item = this.suggestions[index]
        if (!item) return

        this.input.value = item.name
        this.hide()

        if (item.type === 'area') {
            this.onSelectArea?.(item.data)
        } else {
            this.onSelectPlace?.(item.data)
        }
    }

    hide() {
        this.dropdown.classList.remove('visible')
        this.activeIndex = -1
    }
}
