// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    removeItem: function(key) {
      delete store[key];
    },
    clear: function() {
      store = {};
    },
    key: function(index) {
      return Object.keys(store)[index];
    },
    get length() {
      return Object.keys(store).length;
    },
    // Helper for testing LRU
    _getStore: function() {
      return store;
    },
    _setStore: function(newStore) {
      store = newStore;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

import localStorageCacheService from '../../src/js/services/localStorageCacheService.js';


describe('localStorageCacheService', () => {
  const KANJI_ID = '語';
  const KANJI_DATA = { meaning: 'language', readings: ['ご'] };
  const ANOTHER_KANJI_ID = '日';
  const ANOTHER_KANJI_DATA = { meaning: 'day', readings: ['にち'] };

  beforeEach(() => {
    localStorage.clear(); // Clear localStorage before each test
    jest.useFakeTimers(); // Use fake timers for consistent date/time
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers
  });

  // T004: returns correct data for valid, non-expired keys
  test('should return correct data for a valid, non-expired key', () => {
    localStorageCacheService.set(KANJI_ID, KANJI_DATA);
    expect(localStorageCacheService.get(KANJI_ID)).toEqual(KANJI_DATA);
  });

  // T005: returns null for non-existent keys
  test('should return null for a non-existent key', () => {
    expect(localStorageCacheService.get('non_existent')).toBeNull();
  });

  // T006: returns null for an expired key (7-day expiration)
  test('should return null for an expired key', () => {
    localStorageCacheService.set(KANJI_ID, KANJI_DATA);
    jest.advanceTimersByTime(7 * 24 * 60 * 60 * 1000 + 1); // Advance time past expiration
    expect(localStorageCacheService.get(KANJI_ID)).toBeNull();
  });

  // T007: correctly stores data
  test('should correctly store data', () => {
    localStorageCacheService.set(KANJI_ID, KANJI_DATA);
    const storedItem = JSON.parse(localStorage.getItem('kanji_cache_語'));
    expect(storedItem.data).toEqual(KANJI_DATA);
    expect(storedItem.timestamp).toBeDefined();
    expect(storedItem.expiration_time).toBeDefined();
  });

  // T008: correctly deletes data
  test('should correctly delete data', () => {
    localStorageCacheService.set(KANJI_ID, KANJI_DATA);
    localStorageCacheService.remove(KANJI_ID);
    expect(localStorageCacheService.get(KANJI_ID)).toBeNull();
    expect(localStorage.getItem('kanji_cache_語')).toBeNull();
  });

  // T009: empties the entire cache
  test('should clear the entire cache', () => {
    localStorageCacheService.set(KANJI_ID, KANJI_DATA);
    localStorageCacheService.set(ANOTHER_KANJI_ID, ANOTHER_KANJI_DATA);
    localStorageCacheService.clear();
    expect(localStorage.length).toBe(0);
    expect(localStorageCacheService.get(KANJI_ID)).toBeNull();
    expect(localStorageCacheService.get(ANOTHER_KANJI_ID)).toBeNull();
  });

  // T010: LRU eviction when capacity (10MB) is reached
  test('should evict least recently used items when capacity is reached', () => {
    // Use an object wrapper for data to prevent console spam on test failure.
    const largeData = { data: 'a'.repeat(1024 * 1024 * 0.9) }; // ~0.9MB to be safe with overhead

    // 1. Fill the cache up to its 4MB limit.
    // Order of recency: 1 (oldest) -> 4 (newest)
    localStorageCacheService.set('kanji1', largeData);
    localStorageCacheService.set('kanji2', largeData);
    localStorageCacheService.set('kanji3', largeData);
    localStorageCacheService.set('kanji4', largeData);

    // 2. Access 'kanji1', making it the most recently used.
    // The new LRU item should now be 'kanji2'.
    localStorageCacheService.get('kanji1');

    // 3. Add a new item, which should exceed the 4MB limit and evict 'kanji2'.
    localStorageCacheService.set('kanji5', largeData);

    // 4. Assert that 'kanji2' was evicted and all others remain.
    expect(localStorageCacheService.get('kanji2')).toBeNull();
    expect(localStorageCacheService.get('kanji1')).toEqual(largeData);
    expect(localStorageCacheService.get('kanji3')).toEqual(largeData);
    expect(localStorageCacheService.get('kanji4')).toEqual(largeData);
    expect(localStorageCacheService.get('kanji5')).toEqual(largeData);
  });
});
