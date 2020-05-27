import app from '../src/app';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import { User } from '../src/models';

describe('Rest endpoints', () => {
  beforeAll(async () => {
    return mongoose
      .connect('mongodb://127.0.0.1:27017/test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        user: 'test',
        pass: 'test',
      })
      .then(() => {
        console.log('successfully connected to the database');
      })
      .catch((err) => {
        console.log('error connecting to the database', err);
        process.exit();
      });
  });

  afterEach(async () => {
    return User.collection.drop().catch(() => {
      console.log('No collection to drop');
    });
  });

  afterAll((done) => {
    mongoose.disconnect(done);
  });

  describe('/api/users', () => {
    test('POST should create users', async () => {
      const payload = { email: 'testuser@mail.com', name: 'testuser', password: 'testpassword' };
      const resp = await request(app.callback()).post('/api/users').send(payload);

      expect(resp.status).toBe(201);
      expect(resp.body.user.email).toBe(payload.email);
      expect(resp.body.user.name).toBe(payload.name);
      expect(resp.body.user._id).toBeTruthy();
    });

    test('POST should return 400 for bad request', async () => {
      const payload = { email: 'testuser@mail.com', name: 'testuser', pass: 'testpassword' };
      const resp = await request(app.callback()).post('/api/users').send(payload);

      expect(resp.status).toBe(400);
    });

    test('POST should return 406 if email already exist', async () => {
      const payload = { email: 'testuser@mail.com', name: 'testuser', password: 'testpassword' };

      await User.create(payload);

      const resp = await request(app.callback()).post('/api/users').send(payload);

      expect(resp.status).toBe(406);
    });
  });

  describe('/api/auth', () => {
    test('POST should return valid token', async () => {
      const userData = { email: 'testuser@mail.com', name: 'testuser', password: 'testpassword' };
      const base64_creds = Buffer.from(`${userData.email}:${userData.password}`).toString('base64');

      await User.create({ ...userData, password: await bcrypt.hash(userData.password, 5) });

      const resp = await request(app.callback()).post('/api/auth').set('Authorization', `Basic ${base64_creds}`).send();

      expect(resp.status).toBe(200);
      expect(resp.body.token).toBeTruthy();
    });

    test('POST should return 401 for bad email', async () => {
      const userData = { email: 'testuser@mail.com', name: 'testuser', password: 'testpassword' };
      const base64_creds = Buffer.from(`wrong@mail.com:${userData.password}`).toString('base64');

      await User.create({ ...userData, password: await bcrypt.hash(userData.password, 5) });

      const resp = await request(app.callback()).post('/api/auth').set('Authorization', `Basic ${base64_creds}`).send();

      expect(resp.status).toBe(401);
      expect(resp.body.error).toBe('Bad email');
    });

    test('POST should return 401 for bad password', async () => {
      const userData = { email: 'testuser@mail.com', name: 'testuser', password: 'testpassword' };
      const base64_creds = Buffer.from(`${userData.email}:wrongpassword`).toString('base64');

      await User.create({ ...userData, password: await bcrypt.hash(userData.password, 5) });

      const resp = await request(app.callback()).post('/api/auth').set('Authorization', `Basic ${base64_creds}`).send();

      expect(resp.status).toBe(401);
      expect(resp.body.error).toBe('Bad password');
    });
  });
});
