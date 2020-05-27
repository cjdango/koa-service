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

publicRouter.post('/api/auth', async (ctx) => {
  const base64_creds = ctx.header.authorization.split(' ')[1];
  const str_creds = Buffer.from(base64_creds, 'base64').toString();
  const [email, password] = str_creds.split(':');

  const user = await User.findOne({ email });

  if (!user) {
    ctx.throw(401, 'Bad email');
  }

  const { _id, name } = user;
  if (await bcrypt.compare(password, user.password)) {
    ctx.body = {
      token: jsonwebtoken.sign(
        {
          data: { _id, name, email },
          exp: Math.floor(Date.now() / 1000) - 60 * 60, // 1 hour
        },
        'shared-secret',
      ),
    };
  } else {
    ctx.throw(401, 'Bad password');
  }
});
