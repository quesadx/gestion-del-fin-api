// tests/e2e/helpers/assertions.ts
import { expect, type APIResponse } from '@playwright/test';

/** Assert response matches the standard error envelope: { error: { message, statusCode } } */
export async function expectError(
  response: APIResponse,
  expectedStatus: number,
  expectedMessage?: string,
): Promise<void> {
  expect(response.status()).toBe(expectedStatus);
  const body = await response.json();
  expect(body).toHaveProperty('error');
  expect(body.error).toHaveProperty('statusCode', expectedStatus);
  expect(body.error).toHaveProperty('message');
  if (expectedMessage) {
    expect(body.error.message).toContain(expectedMessage);
  }
}

/** Assert response is 2xx and body has data array (for list endpoints) */
export async function expectDataArray(response: APIResponse, minLength = 0): Promise<any[]> {
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
  if (minLength > 0) {
    expect(body.data.length).toBeGreaterThanOrEqual(minLength);
  }
  return body.data;
}

/** Assert response is 2xx and body has single entity */
export async function expectEntity(response: APIResponse): Promise<Record<string, unknown>> {
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toHaveProperty('data');
  expect(body.data).toBeTruthy();
  return body.data as Record<string, unknown>;
}

/** Assert response is 201 Created and body has the created entity */
export async function expectCreated(response: APIResponse): Promise<Record<string, unknown>> {
  expect(response.status()).toBe(201);
  return expectEntity(response);
}
