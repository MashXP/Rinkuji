import { MeaningDisplayManager } from '../../src/js/managers/MeaningDisplayManager.js';
import localStorageCacheService from '../../src/js/services/localStorageCacheService.js';

// Mock the DOM elements
const mockMeaningBarElement = {
  classList: { add: jest.fn(), remove: jest.fn() },
  innerHTML: '',
};

describe('Cache Eviction Scenario', () => {
  let meaningDisplayManager;

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    meaningDisplayManager = new MeaningDisplayManager(mockMeaningBarElement);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('should evict the least recently used item and re-fetch it on access', async () => {
    // Use a size that works with the service's 4MB limit.
    const largeData = { slug: 'large', data: 'a'.repeat(1024 * 1024 * 0.9) }; // 0.9MB to be safe with overhead

    // 1. Fill the cache up to its 4MB limit.
    for (let i = 1; i <= 4; i++) {
      localStorageCacheService.set(`kanji${i}`, { ...largeData, slug: `kanji${i}` });
    }

    // 2. Access 'kanji1' via the manager, which should use the cache and make it most-recently-used.
    await meaningDisplayManager.showMeaning('kanji1');
    expect(global.fetch).not.toHaveBeenCalled(); // Verifies it was a cache hit.

    // 3. Add another large item, which should trigger the eviction of 'kanji2' (the new LRU item).
    localStorageCacheService.set('kanji5', { ...largeData, slug: 'kanji5' });
    expect(localStorageCacheService.get('kanji2')).toBeNull(); // Verify eviction.

    // 4. Now, try to access the evicted item 'kanji2'. It should result in a cache miss and trigger an API call.
    const kanji2DataFromApi = { slug: 'kanji2', data: 're-fetched' };
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [kanji2DataFromApi] }) });
    await meaningDisplayManager.showMeaning('kanji2');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/search_words?query=kanji2');
    expect(localStorageCacheService.get('kanji2')).toEqual(kanji2DataFromApi); // Verify it was re-cached.
  });
});
