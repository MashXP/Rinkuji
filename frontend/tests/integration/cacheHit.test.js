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

describe('Cache Hit Scenario', () => {
  const KANJI_ID = '語';
  const KANJI_DATA = { slug: KANJI_ID, japanese: [{ reading: 'ご' }], senses: [{ english_definitions: ['language'] }] };
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
      json: () => Promise.resolve({ data: [] }), // Return empty data for mock
    }));

    // Spy on displayResult to check if it's called with cached data
    jest.spyOn(meaningDisplayManager, 'displayResult');
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers
    jest.restoreAllMocks(); // Restore all mocks
  });

  test('should display Kanji info from cache without API call on subsequent access', async () => {
    // Pre-populate cache with data
    localStorageCacheService.set(KANJI_ID, KANJI_DATA);

    // Call showMeaning, simulating a user action
    await meaningDisplayManager.showMeaning(KANJI_ID);

    // Expect fetch not to have been called
    expect(global.fetch).not.toHaveBeenCalled();

    // Expect displayResult to have been called with the cached data
    expect(meaningDisplayManager.displayResult).toHaveBeenCalledWith(KANJI_DATA);

    // Optionally, assert on the innerHTML of the meaningBar
    expect(mockMeaningBarElement.innerHTML).toContain('language');
  });
});