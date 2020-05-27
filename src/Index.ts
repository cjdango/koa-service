import Koa from 'koa';
import Router from 'koa-router';
import logger from 'koa-logger';
import json from 'koa-json';
import jwt from 'koa-jwt';
import bodyParser from 'koa-bodyparser';
import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

import { IUser, User } from './Models';

mongoose
  .connect('mongodb://127.0.0.1:27017/service-koa', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: 'approot',
    pass: 'approot',
  })
  .then(() => {
    console.log('successfully connected to the database');
  })
  .catch((err) => {
    console.log('error connecting to the database', err);
    process.exit();
  });

const app = new Koa();
const publicRouter = new Router();
const protectedRouter = new Router();

// Endpoints
publicRouter.post('/api/users', async (ctx) => {
  if (!ctx.request.body.password || !ctx.request.body.email) {
    ctx.throw(400, 'expected an object with password, email and an optional name');
  }

  const user: IUser = await getUserByUsername(ctx.request.body.username);

  if (!user) {
    ctx.request.body.password = await bcrypt.hash(ctx.request.body.password, 5);
    const { _id, email, name } = await User.create(ctx.request.body);

    ctx.status = 200;

    ctx.body = {
      message: 'success',
      user: { _id, email, name },
    };
  } else {
    ctx.throw(406, 'User already exist');
  }
});

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

// Middlewares
app.use(json());
app.use(logger());
app.use(bodyParser());

//  Public Routes
app.use(publicRouter.routes()).use(publicRouter.allowedMethods());

// JWT Middleware
app.use(jwt({ secret: 'shared-secret' }));

// Private Routes
app.use(protectedRouter.routes()).use(protectedRouter.allowedMethods());

app.listen(3000, () => {
  console.log('listening on: http://localhost:3000');
});

function getUserByUsername(username: string) {
  return User.findOne({ username });
}
