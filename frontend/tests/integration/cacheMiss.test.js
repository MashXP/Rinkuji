import { MeaningDisplayManager } from '../../src/js/managers/MeaningDisplayManager.js';
import localStorageCacheService from '../../src/js/services/localStorageCacheService.js';

// Mock the DOM elements that MeaningDisplayManager interacts with
const mockMeaningBarElement = {
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
  },
  innerHTML: '',
};

describe('Cache Miss Scenario', () => {
  const KANJI_ID = '日';
  const KANJI_DATA_FROM_API = { slug: KANJI_ID, japanese: [{ reading: 'にち' }], senses: [{ english_definitions: ['day'] }] };
  const CACHE_PREFIX = 'kanji_cache_';

  let meaningDisplayManager;

  beforeEach(() => {
    localStorage.clear(); // Clear localStorage before each test
    jest.useFakeTimers(); // Use fake timers for consistent date/time

    // Initialize MeaningDisplayManager
    meaningDisplayManager = new MeaningDisplayManager(mockMeaningBarElement);

    // Mock global fetch
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [KANJI_DATA_FROM_API] }), // Return mock data
    }));

    // Spy on displayResult to check if it's called with fetched data
    jest.spyOn(meaningDisplayManager, 'displayResult');
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers
    jest.restoreAllMocks(); // Restore all mocks
  });

  test('should make API call and cache data when Kanji info is not in cache or expired', async () => {
    // Ensure localStorage is empty (cache miss)
    localStorage.clear();

    // Call showMeaning, simulating a user action
    await meaningDisplayManager.showMeaning(KANJI_ID);

    // Expect fetch to have been called
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(`/search_words?query=${encodeURIComponent(KANJI_ID)}`);

    // Expect displayResult to have been called with the fetched data
    expect(meaningDisplayManager.displayResult).toHaveBeenCalledWith(KANJI_DATA_FROM_API);

    // Assert that the data is now in localStorage
    const storedItem = JSON.parse(localStorage.getItem(CACHE_PREFIX + KANJI_ID));
    expect(storedItem).toBeDefined();
    expect(storedItem.data).toEqual(KANJI_DATA_FROM_API);
    expect(storedItem.expiration_time).toBeDefined();

    // Optionally, assert on the innerHTML of the meaningBar
    expect(mockMeaningBarElement.innerHTML).toContain('day');
  });
});