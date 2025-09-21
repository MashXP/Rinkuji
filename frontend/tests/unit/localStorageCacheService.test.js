import localStorageCacheService from '../../src/js/services/localStorageCacheService.js';

describe('localStorageCacheService', () => {
  let localStorageMock = {};

  beforeEach(() => {
    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => localStorageMock[key]),
        setItem: jest.fn((key, value) => { localStorageMock[key] = value; }),
        removeItem: jest.fn((key) => { delete localStorageMock[key]; }),
        clear: jest.fn(() => { localStorageMock = {}; }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('get should return null if item not found', () => {
    expect(localStorageCacheService.get('nonExistent')).toBeNull();
    expect(window.localStorage.getItem).toHaveBeenCalledWith('kanji_cache_nonExistent');
  });

  test('set should store data in localStorage', () => {
    const data = { meaning: 'language', readings: ['ご'] };
    const now = Date.now();
    const EXPIRATION_TIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    jest.spyOn(Date, 'now').mockReturnValue(now);

    localStorageCacheService.set('語', data);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'kanji_cache_語',
      JSON.stringify({ data, timestamp: now, expiration_time: now + EXPIRATION_TIME_MS })
    );
    expect(localStorageCacheService.get('語')).toEqual(data);
  });

  test('remove should delete item from localStorage', () => {
    const data = { meaning: 'language', readings: ['ご'] };
    // Set and then immediately remove
    localStorageCacheService.set('語', data);
    localStorageCacheService.remove('語');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('kanji_cache_語');
    expect(localStorageCacheService.get('語')).toBeNull();
  });

  test('clear should remove only cache-related items from localStorage', () => {
    localStorageCacheService.set('語', { meaning: 'language' });
    localStorageCacheService.set('日', { meaning: 'day' });
    localStorageCacheService.clear();
    expect(window.localStorage.clear).not.toHaveBeenCalled();
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('kanji_cache_語');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('kanji_cache_日');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('kanji_cache_index');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('kanji_cache_size');
    expect(localStorageCacheService.get('語')).toBeNull();
    expect(localStorageCacheService.get('日')).toBeNull();
  });

  test('get should return null for expired items', () => {
    const expiredData = { data: { meaning: 'old' }, expiration_time: Date.now() - 1000 };
    localStorageMock['kanji_cache_expired'] = JSON.stringify(expiredData);
    expect(localStorageCacheService.get('expired')).toBeNull();
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('kanji_cache_expired');
  });

  test('set should update existing item and move to end of LRU index', () => {
    const data1 = { meaning: 'one' };
    const data2 = { meaning: 'two' };
    localStorageCacheService.set('one', data1);
    localStorageCacheService.set('two', data2);
    // Access 'one' to make it more recently used
    localStorageCacheService.get('one');
    const updatedData1 = { meaning: 'updated one' };
    localStorageCacheService.set('one', updatedData1);

    // Verify 'one' is at the end of the index (most recent)
    const index = JSON.parse(window.localStorage.getItem('kanji_cache_index'));
    expect(index[index.length - 1]).toBe('kanji_cache_one');
    expect(localStorageCacheService.get('one')).toEqual(updatedData1);
  });

  test('setMaxSize should update the maximum cache size and enforce limit', () => {
    localStorageCacheService.setMaxSize(0.000001); // Very small size to force eviction
    const largeData = { data: 'a'.repeat(10000) }; // 10KB
    localStorageCacheService.set('largeItem', largeData);
    expect(localStorageCacheService.get('largeItem')).toBeNull(); // Should be evicted
  });
});