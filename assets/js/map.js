// Campus map: one pin per building where items were lost or found.
// Uses Leaflet with OpenStreetMap tiles; the dark theme recolours them with a CSS filter.
(function () {
    const FoundIt = (window.FoundIt = window.FoundIt || {});
    const CAMPUS = [43.8176, -111.7829];

    // Popup listing every report at one building; each item opens the details dialog.
    function popupContent(building, reports, onSelect) {
        const box = document.createElement('div');
        box.className = 'map-popup';
        const title = document.createElement('strong');
        title.textContent = building.name;
        const count = document.createElement('span');
        count.className = 'map-popup__count';
        count.textContent = `${reports.length} report${reports.length === 1 ? '' : 's'}`;
        const list = document.createElement('ul');
        reports.slice(0, 6).forEach(report => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `map-popup__item map-popup__item--${report.type}`;
            const emoji = document.createElement('span');
            emoji.textContent = report.emoji;
            emoji.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span');
            label.textContent = `${report.item}${report.sample ? ' (sample)' : ''}`;
            button.append(emoji, label);
            button.addEventListener('click', () => onSelect && onSelect(report));
            li.appendChild(button);
            list.appendChild(li);
        });
        box.append(title, count, list);
        if (reports.length > 6) {
            const more = document.createElement('p');
            more.className = 'map-popup__more';
            more.textContent = `+ ${reports.length - 6} more`;
            box.appendChild(more);
        }
        return box;
    }

    // On touch screens a map in the middle of a page would catch every swipe,
    // so it stays still until it's tapped once.
    function lockUntilTapped(map, element) {
        if (!matchMedia('(pointer: coarse)').matches) return;
        map.dragging.disable();
        map.touchZoom.disable();
        const cover = document.createElement('button');
        cover.type = 'button';
        cover.className = 'map-lock';
        cover.innerHTML = `<span>${FoundIt.icon ? FoundIt.icon('map') : ''}Tap to explore the map</span>`;
        cover.addEventListener('click', () => {
            cover.hidden = true;
            map.dragging.enable();
            map.touchZoom.enable();
        });
        element.appendChild(cover);
    }

    FoundIt.createMap = function (element, options) {
        const { onSelect, zoom = 16, lockOnTouch = false } = options || {};
        if (!window.L) {
            element.innerHTML = '<p class="map-fallback">The campus map couldn’t load. Check your connection and refresh.</p>';
            return null;
        }

        const map = L.map(element, { scrollWheelZoom: false, zoomControl: true }).setView(CAMPUS, zoom);
        // Scroll-zoom only after the map is clicked, so the page still scrolls past it.
        map.on('click focus', () => map.scrollWheelZoom.enable());
        map.on('mouseout', () => map.scrollWheelZoom.disable());
        if (lockOnTouch) lockUntilTapped(map, element);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const layer = L.layerGroup().addTo(map);
        const markers = new Map();

        function update(reports, fit) {
            layer.clearLayers();
            markers.clear();
            const groups = new Map();
            reports.forEach(report => {
                if (!report.building) return;
                const group = groups.get(report.building.name) || { building: report.building, reports: [] };
                group.reports.push(report);
                groups.set(report.building.name, group);
            });

            groups.forEach(({ building, reports: here }) => {
                const lost = here.filter(report => report.type === 'lost').length;
                const kind = lost === here.length ? 'lost' : lost === 0 ? 'found' : 'mixed';
                const icon = L.divIcon({
                    className: 'pin-wrap',
                    html: `<div class="pin pin--${kind}"><span>${here.length}</span></div>`,
                    iconSize: [38, 38],
                    iconAnchor: [19, 38],
                    popupAnchor: [0, -36]
                });
                const marker = L.marker([building.lat, building.lng], { icon, title: building.name, alt: building.name, riseOnHover: true }).addTo(layer);
                marker.bindPopup(() => popupContent(building, here, onSelect), { maxWidth: 280 });
                markers.set(building.name, marker);
            });

            if (fit && groups.size) {
                const bounds = L.latLngBounds([...groups.values()].map(group => [group.building.lat, group.building.lng]));
                map.fitBounds(bounds.pad(0.12), { maxZoom: 17 });
            }
            return groups.size;
        }

        function focus(buildingName) {
            const marker = markers.get(buildingName);
            if (!marker) return;
            map.flyTo(marker.getLatLng(), 18, { duration: FoundIt.reducedMotion ? 0 : 0.8 });
            setTimeout(() => marker.openPopup(), FoundIt.reducedMotion ? 0 : 850);
        }

        return { map, update, focus, refresh: () => map.invalidateSize() };
    };
})();
