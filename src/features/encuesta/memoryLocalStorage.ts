/** In-memory Storage for tests. Node's experimental localStorage stub is incomplete. */
export function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
  }
}

/** Replaces `window.localStorage` with a working in-memory implementation. */
export function installMemoryLocalStorage(): Storage {
  const memory = createMemoryStorage()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: memory,
  })
  return memory
}
