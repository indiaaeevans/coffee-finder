// server/app.js
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const cors = require('@koa/cors');
const geoRoutes = require('./routes/geo');
const geocodingService = require('./services/geocoding');
const placesService = require('./services/places');
const autocompleteService = require('./services/autocomplete');

const app = new Koa();

// Inject services into context
app.context.services = {
  geocoding: geocodingService,
  places: placesService,
  autocomplete: autocompleteService
};

// TODO Error handling middleware
// app.use(async (ctx, next) => {
//   try {
//     await next();
//   } catch (err) {
//     ctx.status = err.status || 500;
//     ctx.body = {
//       error: process.env.NODE_ENV === 'production' 
//         ? 'An error occurred' 
//         : err.message
//     };
//     // Log error for debugging
//     console.error(err);
//   }
// });

app
  .use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.ALLOWED_ORIGIN] : '*',
    credentials: true
  }))
  .use(logger())
  .use(bodyParser())
  .use(geoRoutes.routes())
  .use(geoRoutes.allowedMethods());

module.exports = app;