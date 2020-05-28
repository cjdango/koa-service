import app from '../src/app';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import { User } from '../src/models';

const testUserData = { email: 'testuser@mail.com', name: 'testuser', password: 'testpassword' };

const createUser = async (payload) => {
  return request(app.callback()).post('/api/users').send(payload);
};

const authenticateUser = async (email: string, password: string) => {
  const base64_creds = Buffer.from(`${email}:${password}`).toString('base64');
  return request(app.callback()).post('/api/auth').set('Authorization', `Basic ${base64_creds}`).send();
};

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
      const resp = await createUser(testUserData);

      expect(resp.status).toBe(201);
      expect(resp.body.user.email).toBe(testUserData.email);
      expect(resp.body.user.name).toBe(testUserData.name);
      expect(resp.body.user._id).toBeTruthy();
    });

    test('POST should return 400 for bad request', async () => {
      const { email, name, password } = testUserData;
      const resp = await createUser({ email, name, pass: password });

      expect(resp.status).toBe(400);
    });

    test('POST should return 406 if email already exist', async () => {
      await User.create(testUserData);

      const resp = await createUser(testUserData);

      expect(resp.status).toBe(406);
    });

    test('GET should get all users', async () => {
      await createUser(testUserData);

      const authResp = await authenticateUser(testUserData.email, testUserData.password);
      const userToken = authResp.body.token;

      const resp = await request(app.callback()).get(`/api/users`).set('Authorization', `Bearer ${userToken}`).send();

      expect(Array.isArray(resp.body.users)).toBe(true);
      expect(resp.body.users.length).toBeGreaterThanOrEqual(1);
      expect(resp.status).toBe(200);
    });

    test('PATCH should update own info', async () => {
      const createResp = await createUser(testUserData);

      const authResp = await authenticateUser(testUserData.email, testUserData.password);
      const userToken = authResp.body.token;

      const email = 'new@mail.com';
      const password = 'newpassword';

      const resp = await request(app.callback())
        .patch(`/api/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ password, email });

      const updatedUser = await User.findById(resp.body.user._id);

      expect(resp.body.user._id).toBe(createResp.body.user._id);
      expect(updatedUser.email).toBe(email);
      expect(await bcrypt.compare(password, updatedUser.password)).toBe(true);
      expect(resp.status).toBe(200);
    });

    test('GET /api/users/:id should get a user info', async () => {
      const createResp = await createUser(testUserData);
      const authResp = await authenticateUser(testUserData.email, testUserData.password);

      const userID = createResp.body.user._id;
      const userToken = authResp.body.token;

      const resp = await request(app.callback())
        .get(`/api/users/${userID}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      expect(resp.body.user._id).toBeTruthy();
      expect(resp.body.user.email).toBe(testUserData.email);
      expect(resp.body.user.name).toBe(testUserData.name);
      expect(resp.status).toBe(200);
    });

    test('GET /api/users/:id should return 404 if user not found', async () => {
      await createUser(testUserData);

      const authResp = await authenticateUser(testUserData.email, testUserData.password);
      const userToken = authResp.body.token;

      const resp = await request(app.callback())
        .get(`/api/users/NonExistentID`)
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      expect(resp.body.error).toBe('User not found');
      expect(resp.status).toBe(404);
    });
  });

  describe('/api/auth', () => {
    test('POST should return valid token', async () => {
      await createUser(testUserData);

      const resp = await authenticateUser(testUserData.email, testUserData.password);

      expect(resp.status).toBe(200);
      expect(resp.body.token).toBeTruthy();
    });

    test('POST should return 401 for bad email', async () => {
      await createUser(testUserData);

      const resp = await authenticateUser('wrong@mail.com', testUserData.password);

      expect(resp.status).toBe(401);
      expect(resp.body.error).toBe('Bad email');
    });

    test('POST should return 401 for bad password', async () => {
      await createUser(testUserData);

      const resp = await authenticateUser(testUserData.email, 'wrongpassword');

      expect(resp.status).toBe(401);
      expect(resp.body.error).toBe('Bad password');
    });
  });
});
