import { getAddressFromCoords, getCoordsFromAddress, getNearbyPlaces, milesToMeters, metersToMiles, throttle, getAutocompleteResults } from './utils.js';
import LOCATION_ICON_URL from '../images/location.svg'
import CHAIN_ICON_URL from '../images/skull.svg';
import INDIE_ICON_URL from '../images/coffee.svg';

const DEFAULT_LATITUDE = 35.994034;
const DEFAULT_LONGITUDE = -78.898621;
const DEFAULT_ZOOM_LEVEL = 12; // TODO adjust zoom level based on radius

// OSM
const TILE_LAYER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// state
let animationIntervalId;
let map, tileLayer, circle;
let tilesLoaded = false;
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
    const toggleResultsWrapperEl = document.querySelector('.toggle-results-wrapper');
    const locationErrorMsgEl = document.getElementById('coffee-form__starting-location-err');
    const loadingEl = document.querySelector('.loading-wrapper');
    const loadingElImg = document.querySelector('.loading-img');
    const locationIconEl = document.querySelector('.location-icon');
    const autocompleteResultsEl = document.querySelector('#autocomplete-results');

    // leaflet icons
    const locationIcon = L.icon({
        iconUrl: LOCATION_ICON_URL,
        mapIconColor: '#cc756b',
        iconSize: [32, 32],
        popupAnchor: [0, -16],
    });
    const chainIcon = L.icon({
        iconUrl: CHAIN_ICON_URL,
        iconSize: [28, 28],
        popupAnchor: [0, -16],
    });
    const indieIcon = L.icon({
        iconUrl: INDIE_ICON_URL,
        iconSize: [32, 32], // size of the icon in px
        // iconAnchor:   [10, 10], // coordinates of the "tip" of the icon (relative to its top left corner)
        popupAnchor: [0, -16] // coordinates of the point from which the popup should open relative to the iconAnchor
    });

    initializeMapWithCurrentLocation();

    function debounce(func, delay) {
        let timeoutId;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        };
    }
    const debouncedOnStartingLocationInputChange = debounce(onStartingLocationInputChange, 300);

    // TODO escape clears the autocomplete results
    // TODO should be able to keyboard navigate the autocomplete results
    startingLocationInputEl.addEventListener('input', async (e) => {
        // prevent autocomplete from being triggered when use current location is clicked
        if (document.activeElement.id !== startingLocationInputEl.id) {
            return;
        }
        await debouncedOnStartingLocationInputChange(e);

    });

    async function onStartingLocationInputChange(e) {
        autocompleteResultsEl.innerHTML = '';
        const q = e.target.value;
        // used for proximity bias
        const { latitude, longitude } = await getCurrentLocation();
        const results = await getAutocompleteResults(latitude, longitude, q);
        // display results under the input
        results.forEach((result) => {
            const li = document.createElement('li');
            li.classList.add('autocomplete-result');
            li.textContent = result.formatted;
            autocompleteResultsEl.appendChild(li);
            li.addEventListener('click', () => {
                startingLocationInputEl.value = result.formatted;
                startingLocationInputEl.setAttribute('data-latitude', result.lat);
                startingLocationInputEl.setAttribute('data-longitude', result.lon);
                autocompleteResultsEl.innerHTML = '';
            });
        });
    }

    toggleResultsViewEl.addEventListener('click', function () {
        resultsContainerEl.classList.toggle('expanded');
        if (resultsContainerEl.classList.contains('expanded')) {
            toggleResultsViewEl.textContent = 'Collapse list view';
        } else {
            toggleResultsViewEl.textContent = 'Expand list view';
        }
    });

    window.addEventListener('resize', throttle(checkResultsOverflow, 250));

    filterChainsSwitchEl.addEventListener('click', function () {
        const checked = this.getAttribute('aria-checked') === 'true';
        this.setAttribute('aria-checked', String(!checked));
    });

    useCurrentLocationBtnEl.addEventListener('click', async () => {
        autocompleteResultsEl.innerHTML = '';
        try {
            hideFormErrorMsg();
            showLocationLoading();
            useCurrentLocationBtnEl.setAttribute('disabled', 'true');
            const { latitude, longitude } = await getCurrentLocation();
            const address = await getAddressFromCoords(latitude, longitude);
            startingLocationInputEl.value = address;
            hideLocationLoading();
            addStartingLocationMarker(latitude, longitude, address);
            // use panTo for less animation
            map.flyTo([latitude, longitude], DEFAULT_ZOOM_LEVEL);
        } catch (error) {
            console.error('Failed to get current location: ', error);
            hideLocationLoading();
            locationErrorMsgEl.textContent = 'Failed to get current location. Please try again with location services enabled.';
            locationErrorMsgEl.classList.remove('hidden');
        } finally {
            useCurrentLocationBtnEl.removeAttribute('disabled');
        }
    });

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMap();
        showFullScreenLoading();
        let latitude, longitude, address;
        // if they used autocomplete, use the lat/long from the data attributes
        if (startingLocationInputEl.hasAttribute('data-latitude') && startingLocationInputEl.hasAttribute('data-longitude')) {
            latitude = startingLocationInputEl.getAttribute('data-latitude');
            longitude = startingLocationInputEl.getAttribute('data-longitude');
            address = startingLocationInputEl.value;
        } else {
            let locationData;
            try {
                locationData = await getCoordsFromAddress(startingLocationInputEl.value);
            } catch (error) {
                console.error('Error fetching coordinates:', error);
                locationErrorMsgEl.textContent = 'Failed to locate your address. Please try again.';
                locationErrorMsgEl.classList.remove('hidden');
                hideFullScreenLoading();
                return;
            }
            hideFormErrorMsg();
            latitude = locationData.latitude;
            longitude = locationData.longitude;
            address = locationData.address;
        }
        addStartingLocationMarker(latitude, longitude, address);

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
            // TODO show error msg on the page
            console.error('Error fetching nearby places:', error);
        } finally {
            hideFullScreenLoading();
        }
    });

    function checkResultsOverflow() {
        // if expanded view was left on, don't check for overflow
        if (resultsContainerEl.classList.contains('expanded')) {
            return;
        }
        if (resultsContainerEl.scrollHeight > resultsContainerEl.clientHeight) {
            toggleResultsWrapperEl.style.display = 'block'; // TODO toggle class instead?
        } else {
            toggleResultsWrapperEl.style.display = 'none';
        }
    }

    function showFullScreenLoading() {
        loadingElImg.classList.add('tada');
        // gives the effect of pausing the animation between iterations
        animationIntervalId = setInterval(() => {
            loadingElImg.classList.toggle('tada');
        }, 2000);
        loadingEl.classList.remove('hidden');
    }

    function hideFullScreenLoading() {
        clearInterval(animationIntervalId);
        loadingEl.classList.add('hidden');
    }

    function showLocationLoading() {
        locationIconEl.classList.add('tada');
    }

    function hideLocationLoading() {
        locationIconEl.classList.remove('tada');
    }

    function hideFormErrorMsg() {
        locationErrorMsgEl.textContent = '';
        locationErrorMsgEl.classList.add('hidden');
    }

    function initializeMap(latitude = DEFAULT_LATITUDE, longitude = DEFAULT_LONGITUDE, zoomLevel = DEFAULT_ZOOM_LEVEL) {
        // create the map
        map = L.map('map', {
            zoomControl: false
        }).setView([latitude, longitude], zoomLevel);
        // add the zoom control
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);
        // add map tiles
        tileLayer = L.tileLayer(TILE_LAYER_URL, {
            maxZoom: 19,
            attribution: MAP_ATTRIBUTION
        }).addTo(map);
        // init layer group for map markers
        mapMarkers = L.layerGroup([]);
        // hide loading indicator after tiles complete loading // TODO handle with async/await
        tileLayer.on('load', () => {
            hideFullScreenLoading();
        });
        // create a custom leaflet control for the search form element
        L.Control.CustomControl = L.Control.extend({
            onAdd: function (map) {
                var container = L.DomUtil.get('coffee-form');
                // prevent click events from propagating to the map
                L.DomEvent.disableClickPropagation(container);
                // unhide the form
                container.style.display = 'block';
                return container;
            }
        });
        L.control.customControl = function (opts) {
            return new L.Control.CustomControl(opts);
        }
        // Add the custom control to the map
        L.control.customControl({ position: 'topleft' }).addTo(map);
    }

    async function initializeMapWithCurrentLocation() {
        try {
            showFullScreenLoading();
            const { latitude, longitude } = await getCurrentLocation();
            initializeMap(latitude, longitude);
        } catch (error) {
            console.error('Failed to get current location: ', error);
            console.info('Setting map to default location.');
            initializeMap();
        }
    };

    function addStartingLocationMarker(latitude, longitude, address) {
        if (startingLocationMarker) {
            startingLocationMarker.removeFrom(map);
        }
        startingLocationMarker = L.marker([latitude, longitude],
            {
                icon: locationIcon,
                // draggable: true // TODO https://leafletjs.com/reference.html#marker-draggable
            }
        ).addTo(map);
        startingLocationMarker.bindPopup(address);
    }

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
        // TODO pan to starting location marker when no results
        if (results.length === 0) {
            resultsCountEl.textContent = `No coffee shops found within ${maxRadiusMiles} ${maxRadiusMiles > 1 ? 'miles' : 'mile'}.`;
            resultsContainerEl.classList.remove('hidden');
            return;
        }

        const ul = document.createElement('ul');

        results.forEach(feature => {
            // create a list item for each result
            const li = document.createElement('li');
            const name = feature.properties.name;
            const distance = metersToMiles(feature.properties.distance);
            const isIndie = feature.properties.indie;
            li.classList.add(isIndie ? 'indie' : 'chain');
            const nameEl = document.createElement(feature.properties.website ? 'a' : 'span');
            nameEl.textContent = name;
            if (feature.properties.website) {
                nameEl.href = feature.properties.website;
                nameEl.target = '_blank';
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
            // create marker for each result
            const latlng = L.latLng(feature.properties.lat, feature.properties.lon);
            const marker = L.marker(
                latlng,
                { icon: isIndie ? indieIcon : chainIcon }
            );
            // add popup to each marker
            const popupContent = document.createElement('div');
            const nameElPopup = document.createElement(feature.properties.website ? 'a' : 'span');
            nameElPopup.textContent = name;
            if (feature.properties.website) {
                nameElPopup.href = feature.properties.website;
                nameElPopup.target = '_blank';
            }
            popupContent.appendChild(nameElPopup);

            marker.bindPopup(popupContent);
            mapMarkers.addLayer(marker);
        });

        mapMarkers.addTo(map);

        // TODO add "indie" if chains filtered <span class="results-summary__descriptor">indie</span>
        resultsCountEl.textContent = `Found ${results.length} coffee shop${results.length !== 1 ? 's' : ''}.`;
        resultsListEl.appendChild(ul);
        resultsContainerEl.classList.remove('hidden');
        checkResultsOverflow();
        // to update the map after changing its size dynamically
        map.invalidateSize();
        // fit the map bounds to the markers
        let bounds = mapMarkers.getLayers().map(marker => {
            const { lat, lng } = marker.getLatLng();
            return [lat, lng];
        });

        // TBD use fitBounds instead for no animation
        map.flyToBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15,
            animate: true
        });
    }

    async function getCurrentLocation() {
        return new Promise(function (resolve, reject) {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    resolve({ latitude, longitude });
                }, (err) => {
                    console.error(err);
                    reject('Geolocation permissions may be turned off...');
                });
            } else {
                reject('Geolocation is not supported by your browser.');
            }
        })
    }

});
