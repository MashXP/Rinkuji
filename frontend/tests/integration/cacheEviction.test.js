import localStorageCacheService from '@app/services/localStorageCacheService.js';
import * as apiService from '@app/services/api.js';
import { MeaningDisplayManager } from '@app/managers/MeaningDisplayManager.js';

jest.mock('@app/services/api.js');

// Helper function to create mock API data in the expected format
const mockApiDataForWord = (wordSlug, data) => ({
    slug: wordSlug,
    japanese: [{ reading: data.reading || 'READING' }],
    senses: [{ english_definitions: [data.data] }]
});

// Mock the DOM elements
const mockMeaningBarElement = {
    classList: { add: jest.fn(), remove: jest.fn() },
    innerHTML: '',
};

describe('MeaningDisplayManager - Cache Eviction', () => {
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

        localStorageCacheService.clear();
        apiService.searchWord.mockClear(); // Corrected mock clear
        mockMeaningBarElement.classList.add.mockClear();
        mockMeaningBarElement.classList.remove.mockClear();
        mockMeaningBarElement.innerHTML = '';
        jest.useFakeTimers(); // Use fake timers
    });

    afterEach(() => {
        jest.useRealTimers(); // Restore real timers
    });

    test('should evict oldest item when cache exceeds max size', async () => {
        // Set max cache size to be large enough for 2 items, but not 3.
        // Each item is roughly 150-200 bytes. 400 bytes should be a safe limit for 2.
        localStorageCacheService.setMaxSize(0.0004);

        const manager = new MeaningDisplayManager(mockMeaningBarElement);

        // Add 3 items, causing the first one to be evicted
        const word1 = 'word1';
        const data1 = mockApiDataForWord(word1, { data: 'a' }); // Corrected data1
        apiService.searchWord.mockResolvedValueOnce(data1); // Pass data1 directly
        await manager.showMeaning(word1);
        jest.runAllTimers();

        const word2 = 'word2';
        const data2 = mockApiDataForWord(word2, { data: 'b' }); // Corrected data2
        apiService.searchWord.mockResolvedValueOnce(data2); // Pass data2 directly
        await manager.showMeaning(word2);
        jest.runAllTimers();

        const word3 = 'word3';
        const data3 = mockApiDataForWord(word3, { data: 'c' }); // Corrected data3
        apiService.searchWord.mockResolvedValueOnce(data3); // Pass data3 directly
        await manager.showMeaning(word3);
        jest.runAllTimers();

        // word1 should have been evicted
        expect(localStorageCacheService.get(word1)).toBeNull();
        expect(localStorageCacheService.get(word2)).toEqual(data2);
        expect(localStorageCacheService.get(word3)).toEqual(data3);

        // Verify API calls
        expect(apiService.searchWord).toHaveBeenCalledTimes(3);
        expect(apiService.searchWord).toHaveBeenCalledWith(word1);
        expect(apiService.searchWord).toHaveBeenCalledWith(word2);
        expect(apiService.searchWord).toHaveBeenCalledWith(word3);
    });

    test('should update item position on access (LRU)', async () => {
        // Set size to hold 3 items, but not 4, to test eviction on the 4th add.
        // Each item is roughly 170 bytes. 510 bytes for 3. 600 bytes is a safe limit.
        localStorageCacheService.setMaxSize(0.0006);
        const manager = new MeaningDisplayManager(mockMeaningBarElement);

        const word1 = 'word1';
        const data1 = mockApiDataForWord(word1, { data: 'a' }); // Corrected data1
        apiService.searchWord.mockResolvedValueOnce(data1);
        await manager.showMeaning(word1);
        jest.runAllTimers();

        const word2 = 'word2';
        const data2 = mockApiDataForWord(word2, { data: 'b' }); // Corrected data2
        apiService.searchWord.mockResolvedValueOnce(data2);
        await manager.showMeaning(word2);
        jest.runAllTimers();

        const word3 = 'word3';
        const data3 = mockApiDataForWord(word3, { data: 'c' }); // Corrected data3
        apiService.searchWord.mockResolvedValueOnce(data3);
        await manager.showMeaning(word3);
        jest.runAllTimers();

        // Access word1 - should move it to the end (most recently used)
        // With the increased cache size, this is a cache hit. `showMeaning` calls `get`,
        // which updates the item's position in the LRU index. No API call is made.
        await manager.showMeaning(word1);
        jest.runAllTimers();

        const word4 = 'word4';
        const data4 = mockApiDataForWord(word4, { data: 'd' }); // Corrected data4
        apiService.searchWord.mockResolvedValueOnce(data4); // Pass data4 directly
        await manager.showMeaning(word4);
        jest.runAllTimers();

        // word2 should now be evicted as it's the oldest (least recently used)
        expect(localStorageCacheService.get(word2)).toBeNull();
        expect(localStorageCacheService.get(word1)).toEqual(data1);
        expect(localStorageCacheService.get(word3)).toEqual(data3);
        expect(localStorageCacheService.get(word4)).toEqual(data4);
    });
});