// tests/e2e/helpers/assertions.ts
import { expect, type APIResponse } from '@playwright/test';

async function resolveResponse(response: APIResponse | Promise<APIResponse>): Promise<APIResponse> {
  return response instanceof Promise ? await response : response;
}

/** Assert response matches the standard error envelope: { error: { message, statusCode } } */
export async function expectError(
  response: APIResponse | Promise<APIResponse>,
  expectedStatus: number,
  expectedMessage?: string,
): Promise<void> {
  response = await resolveResponse(response);
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
export async function expectDataArray(
  response: APIResponse | Promise<APIResponse>,
  minLength = 0,
): Promise<any[]> {
  response = await resolveResponse(response);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
  if (minLength > 0) {
    expect(body.data.length).toBeGreaterThanOrEqual(minLength);
  }
  return body.data;
}

/** Assert response is 2xx and body is a non-array entity (single entity response) */
export async function expectEntity(
  response: APIResponse | Promise<APIResponse>,
): Promise<Record<string, unknown>> {
  response = await resolveResponse(response);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(typeof body).toBe('object');
  expect(Array.isArray(body)).toBe(false);
  return body as Record<string, unknown>;
}

/** Assert response is 201 Created and body is the created entity */
export async function expectCreated(
  response: APIResponse | Promise<APIResponse>,
): Promise<Record<string, unknown>> {
  response = await resolveResponse(response);
  expect(response.status()).toBe(201);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(typeof body).toBe('object');
  expect(Array.isArray(body)).toBe(false);
  return body as Record<string, unknown>;
}
