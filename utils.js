const CHAINS = [
    'Starbucks',
    'Dunkin',
    'Costa Coffee',
    'Tim Hortons',
    'Caribou Coffee'
];
// map settings
export const PLACES_API_KEY = '';
export const PLACES_API_URL = 'https://api.geoapify.com/v2/places';
export const REVERSE_GEOCODE_API_URL = 'https://api.geoapify.com/v1/geocode/reverse';
export const FORWARD_GEOCODE_API_URL = 'https://api.geoapify.com/v1/geocode/search';
const PLACES_TAGS = 'categories=commercial.food_and_drink.coffee_and_tea,catering.cafe.coffee_shop,catering.cafe.coffee';

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
    return fetch(`${REVERSE_GEOCODE_API_URL}?lat=${latitude}&lon=${longitude}&format=json&apiKey=${PLACES_API_KEY}`)
        .then(response => response.json())
        .then(response => response.results[0].address_line1);
}

export const getCoordsFromAddress = async (address) => {
    return fetch(`${FORWARD_GEOCODE_API_URL}?text=${address}&filter=countrycode:us&bias=countrycode:us&format=json&apiKey=${PLACES_API_KEY}`)
        .then(response => response.json())
        .then(response => {
            return { latitude: response.results[0].lat, longitude: response.results[0].lon }
        });
}

export const getNearbyPlaces = async (longitude, latitude, maxRadiusMeters, resultsLimit) => {
    const response = await fetch(
        `${PLACES_API_URL}?${PLACES_TAGS}&filter=circle:${longitude},${latitude},${maxRadiusMeters}&bias=proximity:${longitude},${latitude}&limit=${resultsLimit}&apiKey=${PLACES_API_KEY}`
    );
    const result = await response.json();

    return result.features.map(feature => ({
        ...feature,
        properties: {
            ...feature.properties,
            indie: !isChain(feature.properties.name)
        }
    }));
}