import app from '../src/app';
import request from 'supertest';
import mongoose, { mongo } from 'mongoose';

import { User } from '../src/models';

describe('Rest endpoints', () => {
  beforeAll(() => {
    mongoose
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
    User.collection.drop().catch(() => {
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
});
