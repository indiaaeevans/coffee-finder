const CHAINS = [
    'Starbucks',
    'Dunkin',
    'Costa Coffee',
    'Tim Hortons',
    'Caribou Coffee'
];
// map settings
export const PLACES_API_URL = 'http://localhost:4000/api/v1/geo/places';
export const REVERSE_GEOCODE_API_URL = 'http://localhost:4000/api/v1/geo/reverse';
export const FORWARD_GEOCODE_API_URL = 'http://localhost:4000/api/v1/geo/forward';

export const milesToMeters = (miles) => Math.round(miles * 1609.34);
export const metersToMiles = (meters) => (meters / 1609.34).toFixed(2);

export const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
};

export const isChain = (name) => {
    return CHAINS.some(chain => name.toLowerCase().includes(chain.toLowerCase()));
}

export const getAddressFromCoords = async (latitude, longitude) => {
    const url = new URL(REVERSE_GEOCODE_API_URL);
    const params = new URLSearchParams({
        latitude,
        longitude
    });
    url.search = params.toString();
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error(`Unable to find address for coordinates: ${latitude}, ${longitude}`);
    }
    return data.results[0].address_line1;
}

export const getCoordsFromAddress = async (address) => {
    const url = new URL(FORWARD_GEOCODE_API_URL);
    const params = new URLSearchParams({
        address
    });
    url.search = params.toString();
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error(`Unable to find coordinates for address: ${address}`);
    }
    return { latitude: data.results[0].lat, longitude: data.results[0].lon, address: data.results[0].address_line1 };
}

export const getNearbyPlaces = async (longitude, latitude, radiusMeters, limit) => {
    const url = new URL(PLACES_API_URL);
    const params = new URLSearchParams({
        longitude,
        latitude,
        radius: radiusMeters,
        limit
    });
    url.search = params.toString();

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const result = await response.json();

    return result.features.map(feature => ({
        ...feature,
        properties: {
            ...feature.properties,
            indie: !isChain(feature.properties.name)
        }
    }));
}
