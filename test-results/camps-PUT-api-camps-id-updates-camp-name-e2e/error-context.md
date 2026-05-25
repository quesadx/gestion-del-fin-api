# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: camps.spec.ts >> PUT /api/camps/:id >> updates camp name
- Location: tests/e2e/camps.spec.ts:113:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | // tests/e2e/helpers/assertions.ts
  2  | import { expect, type APIResponse } from '@playwright/test';
  3  | 
  4  | async function resolveResponse(response: APIResponse | Promise<APIResponse>): Promise<APIResponse> {
  5  |   return response instanceof Promise ? await response : response;
  6  | }
  7  | 
  8  | /** Assert response matches the standard error envelope: { error: { message, statusCode } } */
  9  | export async function expectError(
  10 |   response: APIResponse | Promise<APIResponse>,
  11 |   expectedStatus: number,
  12 |   expectedMessage?: string,
  13 | ): Promise<void> {
  14 |   response = await resolveResponse(response);
  15 |   expect(response.status()).toBe(expectedStatus);
  16 |   const body = await response.json();
  17 |   expect(body).toHaveProperty('error');
  18 |   expect(body.error).toHaveProperty('statusCode', expectedStatus);
  19 |   expect(body.error).toHaveProperty('message');
  20 |   if (expectedMessage) {
  21 |     expect(body.error.message).toContain(expectedMessage);
  22 |   }
  23 | }
  24 | 
  25 | /** Assert response is 2xx and body has data array (for list endpoints) */
  26 | export async function expectDataArray(
  27 |   response: APIResponse | Promise<APIResponse>,
  28 |   minLength = 0,
  29 | ): Promise<any[]> {
  30 |   response = await resolveResponse(response);
  31 |   expect(response.ok()).toBeTruthy();
  32 |   const body = await response.json();
  33 |   expect(body).toHaveProperty('data');
  34 |   expect(Array.isArray(body.data)).toBe(true);
  35 |   if (minLength > 0) {
  36 |     expect(body.data.length).toBeGreaterThanOrEqual(minLength);
  37 |   }
  38 |   return body.data;
  39 | }
  40 | 
  41 | /** Assert response is 2xx and body is a non-array entity (single entity response) */
  42 | export async function expectEntity(
  43 |   response: APIResponse | Promise<APIResponse>,
  44 | ): Promise<Record<string, unknown>> {
  45 |   response = await resolveResponse(response);
> 46 |   expect(response.ok()).toBeTruthy();
     |                         ^ Error: expect(received).toBeTruthy()
  47 |   const body = await response.json();
  48 |   expect(typeof body).toBe('object');
  49 |   expect(Array.isArray(body)).toBe(false);
  50 |   return body as Record<string, unknown>;
  51 | }
  52 | 
  53 | /** Assert response is 201 Created and body is the created entity */
  54 | export async function expectCreated(
  55 |   response: APIResponse | Promise<APIResponse>,
  56 | ): Promise<Record<string, unknown>> {
  57 |   response = await resolveResponse(response);
  58 |   expect(response.status()).toBe(201);
  59 |   expect(response.ok()).toBeTruthy();
  60 |   const body = await response.json();
  61 |   expect(typeof body).toBe('object');
  62 |   expect(Array.isArray(body)).toBe(false);
  63 |   return body as Record<string, unknown>;
  64 | }
  65 | 
```