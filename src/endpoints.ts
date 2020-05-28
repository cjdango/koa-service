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
        },
        'shared-secret',
        { expiresIn: '1h' },
      ),
    };
  } else {
    ctx.throw(401, 'Bad password');
  }
});

// Protected endpoints
protectedRouter.patch('/api/users', async (ctx) => {
  const { password, email, name } = ctx.request.body;
  const authEmail = ctx.state.user.data.email;

  const user = await User.findOne({ email: authEmail });

  if (user) {
    if (email) user.email = email;
    if (name) user.name = name;
    if (password) user.password = await bcrypt.hash(password, 5);

    user.save();

    ctx.body = { message: 'success', user: { _id: user._id, email: user.email, name: user.name } };
  } else {
    ctx.throw(403, "Can't do that");
  }
});

protectedRouter.get('/api/users', async (ctx) => {
  const users = await User.find({}, '_id name email');
  ctx.body = {
    message: 'success',
    users,
  };
});

protectedRouter.get('/api/users/:id', async (ctx) => {
  try {
    const { _id, name, email } = await User.findById(ctx.params.id);
    ctx.body = { message: 'success', user: { _id, name, email } };
  } catch (err) {
    ctx.throw(404, 'User not found');
  }
});
