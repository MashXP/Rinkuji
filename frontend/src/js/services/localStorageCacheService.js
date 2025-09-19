// frontend/src/js/services/localStorageCacheService.js

const CACHE_PREFIX = 'kanji_cache_';
const INDEX_KEY = 'kanji_cache_index';
const SIZE_KEY = 'kanji_cache_size';
const EXPIRATION_TIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MAX_CACHE_SIZE_MB = 4; // 4 MB. Reduced to be testable within JSDOM's default 5MB quota.

const localStorageCacheService = (function() {

  function _getIndex() {
    const index = localStorage.getItem(INDEX_KEY);
    return index ? JSON.parse(index) : [];
  }

  function _setIndex(index) {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }

  function _getSize() {
    // Get the total size of the cache from localStorage.
    return parseInt(localStorage.getItem(SIZE_KEY) || '0', 10);
  }

  function _setSize(size) {
    localStorage.setItem(SIZE_KEY, size.toString());
  }

  function _updateIndex(key) {
    let index = _getIndex();
    // Remove key if it exists to move it to the end (most recent)
    index = index.filter(k => k !== key);
    index.push(key);
    _setIndex(index);
  }

  function _enforceSizeLimit(newItemSize = 0) {
    let index = _getIndex();
    let currentSize = _getSize(); // Use the fast, stored size
    const maxSize = MAX_CACHE_SIZE_MB * 1024 * 1024;

    // Evict least recently used items until there's space
    while ((currentSize + newItemSize) > maxSize && index.length > 0) {
      const lruKey = index.shift(); // Get the LRU key from the start of the index
      const itemToRemove = localStorage.getItem(lruKey);
      if (itemToRemove) {
        currentSize -= itemToRemove.length;
        localStorage.removeItem(lruKey);
      }
    }
    _setIndex(index);
    _setSize(currentSize); // Update the stored size after potential evictions
  }

  function get(kanji_identifier) {
    const key = CACHE_PREFIX + kanji_identifier;
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    const cached = JSON.parse(item);
    if (cached.expiration_time && Date.now() > cached.expiration_time) {
      remove(kanji_identifier); // Use remove to also clean up the index
      return null;
    }

    _updateIndex(key); // Mark as most recently used
    return cached.data;
  }

  function set(kanji_identifier, data) {
    const key = CACHE_PREFIX + kanji_identifier;

    // If key already exists, remove it completely first to handle updates correctly.
    if (localStorage.getItem(key)) {
      remove(kanji_identifier);
    }

    const expiration_time = Date.now() + EXPIRATION_TIME_MS;
    const item = JSON.stringify({ data, timestamp: Date.now(), expiration_time });

    _enforceSizeLimit(item.length);

    localStorage.setItem(key, item);
    _setSize(_getSize() + item.length); // Add new item's size to the total
    _updateIndex(key);
  }

  function remove(kanji_identifier) {
    const key = CACHE_PREFIX + kanji_identifier;
    const item = localStorage.getItem(key);
    if (item) {
      _setSize(_getSize() - item.length);
      localStorage.removeItem(key);
    }
    let index = _getIndex();
    index = index.filter(k => k !== key);
    _setIndex(index);
  }

  function clear() {
    const index = _getIndex();
    for (const key of index) {
      localStorage.removeItem(key);
    }
    localStorage.removeItem(INDEX_KEY);
    localStorage.removeItem(SIZE_KEY);
  }

  return {
    get,
    set,
    remove,
    clear
  };
})();

export default localStorageCacheService;
