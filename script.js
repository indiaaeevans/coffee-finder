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
    const resultsFadeEl = document.querySelector('.results-fade');
    // map settings
    const ZOOM_LEVEL = 12;
    const PLACES_API_KEY = 'TODO';
    const PLACES_API_URL = 'https://api.geoapify.com/v2/places';
    const PLACES_TAGS = 'categories=commercial.food_and_drink.coffee_and_tea,catering.cafe.coffee_shop,catering.cafe.coffee';
    const DEFAULT_LATITUDE = 35.994034;
    const DEFAULT_LONGITUDE = -78.898621;
    // state
    let latitude, longitude, map, circle;
    let resultsLimit = 20; // TODO user input for # of results
    let mapMarkers;

    toggleResultsViewEl.addEventListener('click', function () {
        resultsContainerEl.classList.toggle('expanded');
        if (resultsContainerEl.classList.contains('expanded')) {
            toggleResultsViewEl.textContent = 'Collapse list view';
            resultsFadeEl.style.display = 'none';
        } else {
            toggleResultsViewEl.textContent = 'Expand list view';
            resultsFadeEl.style.display = 'block';
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
            resultsFadeEl.style.display = 'block';
        } else {
            toggleResultsViewEl.style.display = 'none';
            resultsFadeEl.style.display = 'none';
        }
    }

    // Run on load and resize
    // window.addEventListener('load', checkResultsOverflow);
    window.addEventListener('resize', checkResultsOverflow);

    function initializeMap(latitude, longitude, ZOOM_LEVEL) {
        // create the map w/ current location
        map = L.map('map', {
            zoomControl: false
        }).setView([latitude || DEFAULT_LATITUDE, longitude || DEFAULT_LONGITUDE], ZOOM_LEVEL);
        // add the zoom control to the top right corner
        L.control.zoom({
            position: 'topright'
        }).addTo(map);
        // add map tiles
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
        initializeMap(latitude, longitude, ZOOM_LEVEL);
    }).catch(console.error);

    const locationIcon = L.icon({
        iconUrl: 'images/icons8-location-48.png',
        iconSize: [32, 32], // size of the icon in px
        popupAnchor: [0, -16], // coordinates of the point from which the popup should open relative to the iconAnchor
    });
    const chainIcon = L.icon({
        iconUrl: 'images/icons8-skull-48.png',
        iconSize: [32, 32], // size of the icon in px
        popupAnchor: [0, -16], // coordinates of the point from which the popup should open relative to the iconAnchor
    });
    const indieIcon = L.icon({
        iconUrl: 'images/icons8-kawaii-coffee-48.png',
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
        resultsCountEl.textContent = `Found ${results.length} coffee shop${results.length !== 1 ? 's' : ''}.`;
        resultsListEl.appendChild(ul);
        resultsContainerEl.classList.remove('hidden');
        checkResultsOverflow();
    }

    async function getCurrentLocation() {
        if ("geolocation" in navigator) {
            return new Promise(function (resolve, reject) {
                navigator.geolocation.getCurrentPosition((position) => {
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                    resolve({ latitude, longitude });
                }, (error) => {
                    reject("Error getting location: ", error.message);
                    alert("Unable to retrieve your location. Please enter it manually.");
                });
            })
        } else {
            alert("Geolocation is not supported by your browser. Please enter your location manually.");
        }
    }
    useCurrentLocationBtnEl.addEventListener('click', async () => {
        if (!latitude || !longitude) {
            await getCurrentLocation().then(({ latitude, longitude }) => {
                initializeMap(latitude, longitude, ZOOM_LEVEL);
            }).catch(console.error);
        }

        startingLocationInputEl.value = `${latitude}, ${longitude}`;
        // TODO cleanup in case location is pressed multiple times
        let marker = L.marker([latitude, longitude], { icon: locationIcon }).addTo(map);
        marker.bindPopup("Current location");
    });

    formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        clearMap();

        const startingLocation = startingLocationInputEl.value;
        const maxRadiusMiles = maxRadiusInputEl.value;
        const maxRadiusMeters = milesToMeters(maxRadiusMiles);
        const filterChains = filterChainsSwitchEl.getAttribute('aria-checked') === 'true';
        // const filterChains = filterChainsInput.checked;

        // draw the radius on the map https://leafletjs.com/reference.html#layer
        circle = L.circle([latitude, longitude], {
            color: '#ED4A49',
            fillColor: '#ED4A49',
            fillOpacity: 0.1,
            radius: maxRadiusMeters
        }).addTo(map);

        fetch(`${PLACES_API_URL}?${PLACES_TAGS}&filter=circle:${longitude},${latitude},${maxRadiusMeters}&bias=proximity:${longitude},${latitude}&limit=${resultsLimit}&apiKey=${PLACES_API_KEY}`)
            .then(response => response.json())
            .then(result => {
                let results = result.features;
                // let filteredOutCount = 0;

                results = results.map(feature => {
                    const isChainLocation = isChain(feature.properties.name);
                    return {
                        ...feature,
                        properties: {
                            ...feature.properties,
                            indie: !isChainLocation
                        }
                    };
                });

                if (filterChains) {
                    const originalCount = results.length;
                    results = results.filter(feature => feature.properties.indie);
                    // filteredOutCount = originalCount - results.length;
                }
                displayResults(results, maxRadiusMiles);
            })
            .catch(error => console.log('error', error));
    });

    function milesToMeters(miles) {
        return Math.round(miles * 1609.34);
    }

    function metersToMiles(meters) {
        return (meters / 1609.34).toFixed(2);
    }
    function isChain(name) {
        const chains = ['Starbucks', 'Dunkin', 'Costa Coffee', 'Tim Hortons', 'Caribou Coffee'];
        return chains.some(chain => name.toLowerCase().includes(chain.toLowerCase()));
    }
});
