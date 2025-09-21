import { MeaningDisplayManager } from '@app/managers/MeaningDisplayManager.js';
import localStorageCacheService from '@app/services/localStorageCacheService.js';
import * as apiService from '@app/services/api.js'; // Changed import path

jest.mock('@app/services/api.js');

describe('MeaningDisplayManager - Cache Hit', () => {
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

    test('should serve from cache if data is present', async () => {
        const wordSlug = 'cached-word';
        const cachedData = {
            slug: wordSlug,
            japanese: [{ reading: 'キャッシュワード' }],
            senses: [{ english_definitions: ['a cached test word'] }]
        };
        localStorageCacheService.set(wordSlug, cachedData);

        const manager = new MeaningDisplayManager(mockMeaningBarElement);
        await manager.showMeaning(wordSlug);
        jest.runAllTimers(); // Advance timers for debounce

        expect(apiService.searchWord).not.toHaveBeenCalled(); // Should not call API
        expect(mockMeaningBarElement.innerHTML).toContain('a cached test word');
    });

    test('should not call API if wordSlug is empty', async () => {
        const manager = new MeaningDisplayManager(mockMeaningBarElement);
        await manager.showMeaning('');
        jest.runAllTimers(); // Advance timers for debounce

        expect(apiService.searchWord).not.toHaveBeenCalled();
        expect(mockMeaningBarElement.innerHTML).not.toContain('Loading');
    });
});