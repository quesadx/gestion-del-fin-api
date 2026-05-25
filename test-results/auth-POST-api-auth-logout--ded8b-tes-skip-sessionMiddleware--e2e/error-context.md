# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> POST /api/auth/logout >> returns 200 on repeated logout (auth routes skip sessionMiddleware)
- Location: tests/e2e/auth.spec.ts:108:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 401
```

# Test source

```ts
  19  |     expect(typeof data.token).toBe('string');
  20  |     await ctx.dispose();
  21  |   });
  22  | 
  23  |   test('returns 400 when username is missing', async () => {
  24  |     const ctx = await request.newContext({ baseURL: BASE_URL });
  25  |     const res = await ctx.post('/api/auth/login', {
  26  |       data: { password: TEST.password },
  27  |     });
  28  |     await expectError(res, 400);
  29  |     await ctx.dispose();
  30  |   });
  31  | 
  32  |   test('returns 400 when password is missing', async () => {
  33  |     const ctx = await request.newContext({ baseURL: BASE_URL });
  34  |     const res = await ctx.post('/api/auth/login', {
  35  |       data: { username: 'e2e_auth_test' },
  36  |     });
  37  |     await expectError(res, 400);
  38  |     await ctx.dispose();
  39  |   });
  40  | 
  41  |   test('returns 400 when body is empty', async () => {
  42  |     const ctx = await request.newContext({ baseURL: BASE_URL });
  43  |     const res = await ctx.post('/api/auth/login', { data: {} });
  44  |     await expectError(res, 400);
  45  |     await ctx.dispose();
  46  |   });
  47  | 
  48  |   test('returns 401 when password is wrong', async () => {
  49  |     const ctx = await request.newContext({ baseURL: BASE_URL });
  50  |     const res = await ctx.post('/api/auth/login', {
  51  |       data: { username: 'e2e_auth_test', password: 'wrong-password' },
  52  |     });
  53  |     await expectError(res, 401);
  54  |     await ctx.dispose();
  55  |   });
  56  | 
  57  |   test('returns 401 for non-existent user', async () => {
  58  |     const ctx = await request.newContext({ baseURL: BASE_URL });
  59  |     const res = await ctx.post('/api/auth/login', {
  60  |       data: { username: 'ghost_user_999', password: TEST.password },
  61  |     });
  62  |     await expectError(res, 401);
  63  |     await ctx.dispose();
  64  |   });
  65  | 
  66  |   test('returns 400 when username exceeds max length', async () => {
  67  |     const ctx = await request.newContext({ baseURL: BASE_URL });
  68  |     const res = await ctx.post('/api/auth/login', {
  69  |       data: { username: 'a'.repeat(61), password: TEST.password },
  70  |     });
  71  |     await expectError(res, 400);
  72  |     await ctx.dispose();
  73  |   });
  74  | });
  75  | 
  76  | test.describe('POST /api/auth/logout', () => {
  77  |   test('returns success when valid token provided', async () => {
  78  |     const ctx = await request.newContext({ baseURL: BASE_URL });
  79  |     const loginRes = await ctx.post('/api/auth/login', {
  80  |       data: { username: 'e2e_auth_test', password: TEST.password },
  81  |     });
  82  |     const loginData = await loginRes.json();
  83  |     const token = loginData.token;
  84  | 
  85  |     const res = await ctx.post('/api/auth/logout', {
  86  |       headers: { Authorization: `Bearer ${token}` },
  87  |     });
  88  |     expect(res.status()).toBe(200);
  89  |     await ctx.dispose();
  90  |   });
  91  | 
  92  |   test('returns 401 when no token provided', async () => {
  93  |     const ctx = await request.newContext({ baseURL: BASE_URL });
  94  |     const res = await ctx.post('/api/auth/logout');
  95  |     await expectError(res, 401);
  96  |     await ctx.dispose();
  97  |   });
  98  | 
  99  |   test('returns 401 when invalid token provided', async () => {
  100 |     const ctx = await request.newContext({ baseURL: BASE_URL });
  101 |     const res = await ctx.post('/api/auth/logout', {
  102 |       headers: { Authorization: 'Bearer invalid.token.here' },
  103 |     });
  104 |     await expectError(res, 401);
  105 |     await ctx.dispose();
  106 |   });
  107 | 
  108 |   test('returns 200 on repeated logout (auth routes skip sessionMiddleware)', async () => {
  109 |     const ctx = await request.newContext({ baseURL: BASE_URL });
  110 |     const loginRes = await ctx.post('/api/auth/login', {
  111 |       data: { username: 'e2e_auth_test', password: TEST.password },
  112 |     });
  113 |     const loginData = await loginRes.json();
  114 |     const token = loginData.token;
  115 | 
  116 |     const first = await ctx.post('/api/auth/logout', {
  117 |       headers: { Authorization: `Bearer ${token}` },
  118 |     });
> 119 |     expect(first.status()).toBe(200);
      |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  120 | 
  121 |     const second = await ctx.post('/api/auth/logout', {
  122 |       headers: { Authorization: `Bearer ${token}` },
  123 |     });
  124 |     expect(second.status()).toBe(200);
  125 |     await ctx.dispose();
  126 |   });
  127 | });
  128 | 
```