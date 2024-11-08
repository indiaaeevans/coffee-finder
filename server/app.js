// server/app.js
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const cors = require('@koa/cors');
const geoRoutes = require('./routes/geo');
const geocodingService = require('./services/geocoding');
const placesService = require('./services/places');

const app = new Koa();

// Inject services into context
app.context.services = {
  geocoding: geocodingService,
  places: placesService
};

app
  .use(cors())
  .use(logger())
  .use(bodyParser())
  .use(geoRoutes.routes())
  .use(geoRoutes.allowedMethods());

module.exports = app;