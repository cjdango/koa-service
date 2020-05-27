import logger from 'koa-logger';
import json from 'koa-json';
import jwt from 'koa-jwt';
import bodyParser from 'koa-bodyparser';
import Koa from 'koa';

import { protectedRouter, publicRouter } from './endpoints';

const app = new Koa();

// Error Handler
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message,
    };

    ctx.set('X-Status-Reason', err.message);
    ctx.app.emit('error', err, ctx);
  }
});

// Other Middlewares
app.use(json());
app.use(logger());
app.use(bodyParser());

//  Public Routes
app.use(publicRouter.routes()).use(publicRouter.allowedMethods());

// JWT Middleware
app.use(jwt({ secret: 'shared-secret' }));

// Private Routes
app.use(protectedRouter.routes()).use(protectedRouter.allowedMethods());

export default app;
