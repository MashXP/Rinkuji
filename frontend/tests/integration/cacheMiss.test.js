import { MeaningDisplayManager } from '@app/managers/MeaningDisplayManager.js';
import localStorageCacheService from '@app/services/localStorageCacheService.js';
import * as apiService from '@app/services/api.js';

jest.mock('@app/services/api.js');

describe('MeaningDisplayManager - Cache Miss', () => {
    let mockMeaningBarElement;
    let localStorageMock;

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

        mockMeaningBarElement = document.createElement('div'); // Use a real DOM element
        localStorageCacheService.clear();
        apiService.searchWord.mockClear();
        jest.useFakeTimers(); // Use fake timers
    });

    afterEach(() => {
        jest.useRealTimers(); // Restore real timers
    });

    test('should fetch from API and cache if data is not in cache', async () => {
        const wordSlug = 'test-word';
        const mockApiData = { // Corrected mockApiData structure
            slug: wordSlug,
            japanese: [{ reading: 'テストワード' }],
            senses: [{ english_definitions: ['a test word'] }]
        };
        apiService.searchWord.mockResolvedValue(mockApiData);

        const manager = new MeaningDisplayManager(mockMeaningBarElement);
        await manager.showMeaning(wordSlug);
        jest.runAllTimers(); // Advance timers for debounce

        expect(localStorageCacheService.get(wordSlug)).toEqual(mockApiData); // Corrected assertion
        expect(apiService.searchWord).toHaveBeenCalledWith(wordSlug);
        expect(mockMeaningBarElement.innerHTML).toContain('a test word');
    });

    test('should display "No definition found" if API returns no data', async () => {
        const wordSlug = 'no-data-word';
        apiService.searchWord.mockResolvedValue(null); // Corrected mock resolved value

        const manager = new MeaningDisplayManager(mockMeaningBarElement);
        await manager.showMeaning(wordSlug);
        jest.runAllTimers(); // Advance timers for debounce

        expect(localStorageCacheService.get(wordSlug)).toBeNull();
        expect(apiService.searchWord).toHaveBeenCalledWith(wordSlug);
        expect(mockMeaningBarElement.innerHTML).toContain('No definition found');
    });

    test('should display error message if API call fails', async () => {
        const wordSlug = 'error-word';
        // Mock console.error to prevent logging during this test and check if it's called.
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        apiService.searchWord.mockRejectedValue(new Error('API error'));

        const manager = new MeaningDisplayManager(mockMeaningBarElement);
        await manager.showMeaning(wordSlug);
        jest.runAllTimers(); // Advance timers for debounce

        // Assert that the error was handled correctly
        expect(localStorageCacheService.get(wordSlug)).toBeNull();
        expect(apiService.searchWord).toHaveBeenCalledWith(wordSlug);
        expect(mockMeaningBarElement.innerHTML).toContain('Error loading definition');
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Restore original console.error
        consoleErrorSpy.mockRestore();
    });
});