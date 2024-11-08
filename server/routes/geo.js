const Router = require('koa-router');
const router = new Router({
  prefix: '/api/v1/geo'
});

// Validation middleware
const Joi = require('joi');

// Updated validation schema - using Joi.object()
const coordinatesSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

const searchSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(0).max(50000).default(1000),
  limit: Joi.number().min(1).max(50).default(10)
});

// Custom validation middleware since koa-joi-validate might be outdated
const validate = (schema) => {
  return async (ctx, next) => {
    try {
      const value = await schema.validateAsync(ctx.query);
      ctx.query = value;
      await next();
    } catch (err) {
      ctx.status = 400;
      ctx.body = {
        error: err.details[0].message
      };
    }
  };
};

router
  // Reverse geocoding: coordinates → address
  .get('/reverse', 
    validate(coordinatesSchema),
    async (ctx) => {
      const { latitude, longitude } = ctx.query;
      try {
        ctx.body = await ctx.services.geocoding.reverse(latitude, longitude);
      } catch (error) {
        ctx.status = error.cause ? error.cause.status : 500;
        ctx.body = { error: error.message };
      }
    }
  )

  // Forward geocoding: address → coordinates
  .get('/forward',
    validate(Joi.object({
      address: Joi.string().required().min(3)
    })),
    async (ctx) => {
      const { address } = ctx.query;
      try {
        ctx.body = await ctx.services.geocoding.forward(address);
      } catch (error) {
        ctx.status = error.cause ? error.cause.status : 500;
        ctx.body = { error: error.message };
      }
    }
  )

  // Places search
  .get('/places',
    validate(searchSchema),
    async (ctx) => {
      try {
        ctx.body = await ctx.services.places.search(ctx.query);
      } catch (error) {
        ctx.status = error.cause ? error.cause.status : 500;
        ctx.body = { error: error.message };
      }
    }
  );

module.exports = router;