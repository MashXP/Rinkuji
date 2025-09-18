// frontend/src/js/services/localStorageCacheService.js

const CACHE_PREFIX = 'kanji_cache_';
const EXPIRATION_TIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MAX_CACHE_SIZE_MB = 10; // 10 MB

const localStorageCacheService = (function() {

  function get(kanji_identifier) {
    const key = CACHE_PREFIX + kanji_identifier;
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    const cached = JSON.parse(item);
    // Expiration logic will be fully implemented in T015
    if (cached.expiration_time && Date.now() > cached.expiration_time) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  }

  function set(kanji_identifier, data) {
    const key = CACHE_PREFIX + kanji_identifier;
    const expiration_time = Date.now() + EXPIRATION_TIME_MS;
    const item = JSON.stringify({ data, timestamp: Date.now(), expiration_time });

    // LRU eviction logic will be fully implemented in T016
    // For now, just set the item
    localStorage.setItem(key, item);
  }

  function remove(kanji_identifier) {
    const key = CACHE_PREFIX + kanji_identifier;
    localStorage.removeItem(key);
  }

  function clear() {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  }

  return {
    get,
    set,
    remove,
    clear
  };
})();

export default localStorageCacheService;
