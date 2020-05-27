import Router from 'koa-router';
import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { IUser, User } from './models';

export const publicRouter = new Router();
export const protectedRouter = new Router();

// Public endpoints
publicRouter.post('/api/users', async (ctx) => {
  const password = ctx.request.body.password;
  const email = ctx.request.body.email;

  if (!password || !email) {
    ctx.throw(400, 'expected an object with password, email and an optional name');
  }

  const user: IUser = await User.findOne({ email });

  if (!user) {
    ctx.request.body.password = await bcrypt.hash(password, 5);
    const { _id, email, name } = await User.create(ctx.request.body);

    ctx.status = 201;

    ctx.body = {
      message: 'success',
      user: { _id, email, name },
    };
  } else {
    ctx.throw(406, 'User already exist');
  }
});
