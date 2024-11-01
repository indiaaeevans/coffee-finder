import { getAddressFromCoords, getCoordsFromAddress, getNearbyPlaces, milesToMeters, metersToMiles, throttle } from './utils.js';

const DEFAULT_LATITUDE = 35.994034;
const DEFAULT_LONGITUDE = -78.898621;
const DEFAULT_ZOOM_LEVEL = 12; // TODO adjust zoom level based on radius

// icons
const LOCATION_ICON_URL = 'images/icons8-location-48.png';
const CHAIN_ICON_URL = 'images/icons8-skull-48.png';
const INDIE_ICON_URL = 'images/icons8-kawaii-coffee-48.png';
// OSM
const TILE_LAYER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// state
let map, circle;
let resultsLimit = 20; // TODO user input for # of results
let startingLocationMarker, mapMarkers;

document.addEventListener('DOMContentLoaded', () => {
    // dom elements
    const formEl = document.getElementById('coffee-form');
    const useCurrentLocationBtnEl = document.getElementById('coffee-form__use-current-location');
    const startingLocationInputEl = document.getElementById('coffee-form__starting-location');
    const maxRadiusInputEl = document.getElementById('coffee-form__max-radius');
    const resultsListEl = document.getElementById('results-list');
    const resultsCountEl = document.querySelector('.results-summary__results-count');
    const resultsContainerEl = document.querySelector('.results-container');
    const filterChainsSwitchEl = document.getElementById('filter-switch');
    const toggleResultsViewEl = document.querySelector('.toggle-results');

    toggleResultsViewEl.addEventListener('click', function () {
        resultsContainerEl.classList.toggle('expanded');
        if (resultsContainerEl.classList.contains('expanded')) {
            toggleResultsViewEl.textContent = 'Collapse list view';
        } else {
            toggleResultsViewEl.textContent = 'Expand list view';
        }
    });


    filterChainsSwitchEl.addEventListener('click', function () {
        const checked = this.getAttribute('aria-checked') === 'true';
        this.setAttribute('aria-checked', String(!checked));
    });

    function checkResultsOverflow() {
        // if expanded view was left on, don't check for overflow
        if (resultsContainerEl.classList.contains('expanded')) {
            return;
        }
        if (resultsContainerEl.scrollHeight > resultsContainerEl.clientHeight) {
            toggleResultsViewEl.style.display = 'block'; // TODO toggle class instead?
        } else {
            toggleResultsViewEl.style.display = 'none';
        }
    }

    window.addEventListener('resize', throttle(checkResultsOverflow, 250));

    function initializeMap(latitude = DEFAULT_LATITUDE, longitude = DEFAULT_LONGITUDE, zoomLevel = DEFAULT_ZOOM_LEVEL) {
        // create the map w/ current location
        map = L.map('map', {
            zoomControl: false
        }).setView([latitude, longitude], zoomLevel);
        // add the zoom control to the top right corner
        L.control.zoom({
            position: 'topright'
        }).addTo(map);
        // add map tiles
        L.tileLayer(TILE_LAYER_URL, {
            maxZoom: 19,
            attribution: MAP_ATTRIBUTION
        }).addTo(map);
        mapMarkers = L.layerGroup([]);

        // create a custom leaflet control for the search form element
        L.Control.CustomControl = L.Control.extend({
            onAdd: function (map) {
                var container = L.DomUtil.get('coffee-form');
                // Prevent click events from propagating to the map
                L.DomEvent.disableClickPropagation(container);
                // unhide the form
                container.style.display = 'block';
                return container;
            }
        });
        // Create a constructor function for easy instantiation
        L.control.customControl = function (opts) {
            return new L.Control.CustomControl(opts);
        }
        // Add the custom control to the map
        L.control.customControl({ position: 'topleft' }).addTo(map);
    }

    getCurrentLocation().then(({ latitude, longitude }) => {
        initializeMap(latitude, longitude);
    }).catch(console.error);

    const locationIcon = L.icon({
        iconUrl: LOCATION_ICON_URL,
        iconSize: [32, 32], // size of the icon in px
        popupAnchor: [0, -16], // coordinates of the point from which the popup should open relative to the iconAnchor
    });
    const chainIcon = L.icon({
        iconUrl: CHAIN_ICON_URL,
        iconSize: [32, 32], // size of the icon in px
        popupAnchor: [0, -16], // coordinates of the point from which the popup should open relative to the iconAnchor
    });
    const indieIcon = L.icon({
        iconUrl: INDIE_ICON_URL,
        iconSize: [32, 32], // size of the icon in px
        // iconAnchor:   [10, 10], // coordinates of the "tip" of the icon (relative to its top left corner)
        popupAnchor: [0, -16] // coordinates of the point from which the popup should open relative to the iconAnchor
    });

    function clearMap() {
        resultsContainerEl.classList.add('hidden');
        if (circle) {
            map.removeLayer(circle);
        }
        mapMarkers.removeFrom(map);
        mapMarkers.clearLayers();
        resultsListEl.innerHTML = '';
    }

    function displayResults(results, maxRadiusMiles) {
        if (results.length === 0) {
            resultsCountEl.textContent = `No coffee shops found within ${maxRadiusMiles} ${maxRadiusMiles > 1 ? 'miles' : 'mile'}.`;
            resultsContainerEl.classList.remove('hidden');
            return;
        }

        const ul = document.createElement('ul');

        results.forEach(feature => {
            const li = document.createElement('li');
            const name = feature.properties.name;
            const distance = metersToMiles(feature.properties.distance);
            const isIndie = feature.properties.indie;

            // Add the appropriate class based on whether it's a chain or indie
            li.classList.add(isIndie ? 'indie' : 'chain');

            // Create a link for the name if a website is available
            const nameEl = document.createElement(feature.properties.website ? 'a' : 'span');
            nameEl.textContent = name;
            if (feature.properties.website) {
                nameEl.href = feature.properties.website;
                nameEl.target = '_blank'; // Open link in a new tab
            }
            const span = document.createElement('span');
            span.appendChild(nameEl);
            span.appendChild(document.createElement('br'));
            const distanceSpan = document.createElement('span');
            distanceSpan.classList.add('distance');
            distanceSpan.textContent = `${distance} miles`;
            span.appendChild(distanceSpan);
            li.appendChild(span);
            ul.appendChild(li);
            let marker = L.marker(
                [feature.properties.lat, feature.properties.lon], { icon: isIndie ? indieIcon : chainIcon }
            );

            // Create popup content with linked name
            const popupContent = document.createElement('div');
            const nameElPopup = document.createElement(feature.properties.website ? 'a' : 'span');
            nameElPopup.textContent = name;
            if (feature.properties.website) {
                nameElPopup.href = feature.properties.website;
                nameElPopup.target = '_blank'; // Open link in a new tab
            }
            popupContent.appendChild(nameElPopup);

            marker.bindPopup(popupContent);
            mapMarkers.addLayer(marker);
        });
        mapMarkers.addTo(map);
        // adjust the map to fit all the markers
        let bounds = mapMarkers.getLayers().map((marker) => {
            return marker.getLatLng();
        }).map((latlng) => [latlng.lat, latlng.lng ]);
        // use fitBounds instead for no animation
        map.flyToBounds(bounds, {
            padding: [50, 50], // Add padding around markers
            maxZoom: 15        // Prevent too much zoom
        });

        resultsCountEl.textContent = `Found ${results.length} coffee shop${results.length !== 1 ? 's' : ''}.`;
        resultsListEl.appendChild(ul);
        resultsContainerEl.classList.remove('hidden');
        checkResultsOverflow();
    }

    async function getCurrentLocation() {
        if ("geolocation" in navigator) {
            return new Promise(function (resolve, reject) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    resolve({ latitude, longitude });
                }, (err) => {
                    console.error(err, 'Geolocation failed...using default location');
                    // use default values as fallback
                    resolve({ DEFAULT_LATITUDE, DEFAULT_LONGITUDE })
                });
            })
        } else {
            alert("Geolocation is not supported by your browser. Please enter your location manually.");
        }
    }

    useCurrentLocationBtnEl.addEventListener('click', async () => {
        const { latitude, longitude } = await getCurrentLocation();
        const address = await getAddressFromCoords(latitude, longitude);
        startingLocationInputEl.value = address;
        addStartingLocationMarker(latitude, longitude, address);
    });

    function addStartingLocationMarker(latitude, longitude, address) {
        if (startingLocationMarker) {
            startingLocationMarker.removeFrom(map);
        }
        startingLocationMarker = L.marker([latitude, longitude], { icon: locationIcon }).addTo(map);
        startingLocationMarker.bindPopup(address);
    }

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMap();
        const startingLocation = startingLocationInputEl.value;
        const { latitude, longitude } = await getCoordsFromAddress(startingLocation);
        addStartingLocationMarker(latitude, longitude); // TODO update map to new location

        const maxRadiusMiles = maxRadiusInputEl.value;
        const maxRadiusMeters = milesToMeters(maxRadiusMiles);
        const filterChains = filterChainsSwitchEl.getAttribute('aria-checked') === 'true';

        // draw the radius on the map https://leafletjs.com/reference.html#layer
        circle = L.circle([latitude, longitude], {
            color: '#ED4A49',
            fillColor: '#ED4A49',
            fillOpacity: 0.1,
            radius: maxRadiusMeters
        }).addTo(map);

        try {
            let results = await getNearbyPlaces(longitude, latitude, maxRadiusMeters, resultsLimit);

            if (filterChains) {
                results = results.filter(feature => feature.properties.indie);
            }
            displayResults(results, maxRadiusMiles);
        } catch (error) {
            console.error('Error fetching nearby places:', error);
        }
    });

});
