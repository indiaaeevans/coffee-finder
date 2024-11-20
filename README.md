# Indie Maps

A web application to help you find independent (indie) coffee shops near you.

[View the site live](https://indiemaps.netlify.app/)

## Features

### Current features

- [x] Find coffee shops near your current location
- [x] Find coffee shops near a manually set starting location
- [x] Optionally filter out chains to see only indie coffee shops in the results
- [x] Adjust the search radius
- [x] View results on the map and/or in a list
- [x] Interact with results on the map

### Feature wishlist

- [ ] Autocomplete starting location
- [ ] Customize which chains get filtered out
- [ ] New categories (e.g. boba)
- [ ] View more details about a result (e.g. hours, amenities, menu)
- [ ] Save a result to favorites
- [ ] Reflect search params in the url

## Tech Stack

**Frontend**
- HTML, CSS, JavaScript, Leaflet.js
- Hosted on Netlify

**Backend**
- Node.js, Koa, free tier of geolocation/point-of-interest APIs
- Hosted on Render

## Project Structure
- [client](./client/) - Frontend application
- [server](./server/) - Backend / proxy server, handles forwarding requests to third party APIs

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation

Install dependencies:

`npm run install:all`

### Development

Start both client and server:

`npm start`

Run the client:

`npm run start:client`

Run the server:

`npm run start:server`

### Building for production

`npm run build:all`