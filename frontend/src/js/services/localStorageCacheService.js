const CACHE_PREFIX = 'kanji_cache_';
const INDEX_KEY = 'kanji_cache_index';
const SIZE_KEY = 'kanji_cache_size';
const EXPIRATION_TIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
let MAX_CACHE_SIZE_MB = 4; // 4 MB. Reduced to be testable within JSDOM's default 5MB quota.

const localStorageCacheService = (function() {

  function _getIndex() {
    const index = localStorage.getItem(INDEX_KEY);
    return index ? JSON.parse(index) : [];
  }

  function _setIndex(index) {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }

  function _getSize() {
    return parseInt(localStorage.getItem(SIZE_KEY) || '0', 10);
  }

  function _setSize(size) {
    localStorage.setItem(SIZE_KEY, size.toString());
  }

  function _updateIndex(key) {
    let index = _getIndex();
    index = index.filter(k => k !== key);
    index.push(key);
    _setIndex(index);
  }

  function _enforceSizeLimit(index, currentSize, newItemSize = 0) {
    const maxSize = MAX_CACHE_SIZE_MB * 1024 * 1024;
    while ((currentSize + newItemSize) > maxSize && index.length > 0) {
      const lruKey = index.shift();
      const itemToRemove = localStorage.getItem(lruKey);
      if (itemToRemove) {
        currentSize -= itemToRemove.length;
        localStorage.removeItem(lruKey);
      }
    }
    _setIndex(index);
    _setSize(currentSize);
    return currentSize;
  }

  function get(kanji_identifier) {
    const key = CACHE_PREFIX + kanji_identifier;
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    const cached = JSON.parse(item);
    if (cached.expiration_time && Date.now() > cached.expiration_time) {
      remove(kanji_identifier);
      return null;
    }
    _updateIndex(key);
    return cached.data;
  }

  function set(kanji_identifier, data) {
    const key = CACHE_PREFIX + kanji_identifier;

    if (localStorage.getItem(key)) {
      remove(kanji_identifier);
    }

    const expiration_time = Date.now() + EXPIRATION_TIME_MS;
    const item = JSON.stringify({ data, timestamp: Date.now(), expiration_time });
    const newItemSize = item.length;
    
    let index = _getIndex();
    let currentSize = _getSize();

    currentSize = _enforceSizeLimit(index, currentSize, newItemSize);

    // After potential eviction, check if there's enough space
    const maxSize = MAX_CACHE_SIZE_MB * 1024 * 1024;
    if (currentSize + newItemSize <= maxSize) {
        localStorage.setItem(key, item);
        _setSize(currentSize + newItemSize);
        _updateIndex(key);
    }
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

  function setMaxSize(mb) {
    MAX_CACHE_SIZE_MB = mb;
    let index = _getIndex();
    let currentSize = _getSize();
    _enforceSizeLimit(index, currentSize);
  }

  return {
    get,
    set,
    remove,
    clear,
    setMaxSize
  };
})();

export default localStorageCacheService;