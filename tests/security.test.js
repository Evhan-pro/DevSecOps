const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-please-change';

const app = require('../src/server');
const pool = require('../src/config/database');

// NOTE: ces tests supposent que la DB tourne (docker-compose) et que scripts/init-db.sql a été appliqué.

async function loginAdmin() {
  const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  expect(res.statusCode).toBe(200);
  expect(res.body.token).toBeTruthy();
  return res.body.token;
}

afterAll(async () => {
  await pool.end();
});

describe('DevSecOps security non-regression', () => {
  test('SQL injection on login is blocked', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: "admin' --", password: 'whatever123' });
    expect(res.statusCode).toBe(401);
  });

  test('Path traversal is blocked on file download', async () => {
    const token = await loginAdmin();
    const res = await request(app)
      .get('/api/files')
      .query({ name: '../package.json' })
      .set('Authorization', `Bearer ${token}`);

    // Either invalid payload (400) or not found (404). The key point: not 200.
    expect([400, 404]).toContain(res.statusCode);
  });

  test('Admin-only user creation is enforced (authz)', async () => {
    // Login as normal user
    const loginUser = await request(app)
      .post('/api/auth/login')
      .send({ username: 'user', password: 'password' });
    expect(loginUser.statusCode).toBe(200);

    const token = loginUser.body.token;
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: `x${Date.now()}@example.com`, password: 'supersecure123', role: 'admin' });

    expect(res.statusCode).toBe(403);
  });
});
