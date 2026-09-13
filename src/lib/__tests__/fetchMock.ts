import { vi } from 'vitest'

/**
 * Shared fetch-mock infrastructure for tests that exercise the API client
 * (src/lib/api.ts). Every page test stubs the global `fetch` with the same
 * helpers, so the front↔API flows are covered against a deterministic fake
 * backend instead of the real network.
 */

/** Creates the vi.fn() instance used to fake window.fetch. */
export function createFetchMock() {
  return vi.fn<typeof fetch>()
}

export type MockedFetch = ReturnType<typeof createFetchMock>

/** Response shape { ok, status, json } the API client expects. */
export function okJson<T>(body: T, status = 200): Response {
  return { ok: true, status, json: async () => body } as unknown as Response
}

/** Non-ok response carrying FastAPI's `{ detail }` error payload. */
export function errorJson(status: number, body: unknown = { detail: `Error ${status}` }): Response {
  return { ok: false, status, json: async () => body } as unknown as Response
}

/** Normalizes any fetch input to its URL string. */
export function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }
  return input instanceof URL ? input.toString() : input.url
}

/** Signature of one fake-backend route handler. */
export type FetchRoute = (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>

/**
 * Resets the mock and replaces the global fetch for one test; call in
 * beforeEach. Returns the same mock for convenience.
 */
export function installFetchMock(fetchMock: MockedFetch): MockedFetch {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Restores the real fetch; call in afterEach. */
export function uninstallFetchMock(): void {
  vi.unstubAllGlobals()
}

/**
 * Routes the mock by exact URL string -> handler. Unknown URLs fail loudly
 * (as a rejected promise, like a real network miss) so a test that forgets
 * to stub a route breaks instead of silently passing.
 */
export function stubRoutes(fetchMock: MockedFetch, routes: ReadonlyMap<string, FetchRoute>): void {
  fetchMock.mockImplementation(async (input, init) => {
    const url = urlOf(input)
    const handler = routes.get(url)
    if (handler === undefined) {
      throw new Error(`URL inesperada en el test: ${url}`)
    }
    return handler(input, init)
  })
}