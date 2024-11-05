const CHAINS = [
    'Starbucks',
    'Dunkin',
    'Costa Coffee',
    'Tim Hortons',
    'Caribou Coffee'
];
// map settings
export const PLACES_API_KEY = 'TODO';
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
    try {
        const response = await fetch(`${REVERSE_GEOCODE_API_URL}?lat=${latitude}&lon=${longitude}&format=json&apiKey=${PLACES_API_KEY}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error(`Unable to find address for coordinates: ${latitude}, ${longitude}`);
        }
        return data.results[0].address_line1;
    } catch (error) {
        console.error('Error fetching address:', error);
        return { error: error.message };
    }
}

export const getCoordsFromAddress = async (address) => {
    try {
        const response = await fetch(`${FORWARD_GEOCODE_API_URL}?text=${address}&filter=countrycode:us&bias=countrycode:us&format=json&apiKey=${PLACES_API_KEY}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error(`Unable to find coordinates for address: ${address}`);
        }
        return { latitude: data.results[0].lat, longitude: data.results[0].lon, address: data.results[0].address_line1 };
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        return { error: error.message };
    }
}

export const getNearbyPlaces = async (longitude, latitude, maxRadiusMeters, resultsLimit) => {
    try {
        const response = await fetch(
            `${PLACES_API_URL}?${PLACES_TAGS}&filter=circle:${longitude},${latitude},${maxRadiusMeters}&bias=proximity:${longitude},${latitude}&limit=${resultsLimit}&apiKey=${PLACES_API_KEY}`
        );
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
    } catch (error) {
        console.error('Error fetching nearby places:', error);
        return { error: error.message };
    }
}
