import { MeaningDisplayManager } from '../../src/js/managers/MeaningDisplayManager.js';
import localStorageCacheService from '../../src/js/services/localStorageCacheService.js';
import { searchWord } from '../../src/services/api.js';

// Mock dependencies
jest.mock('../../src/js/services/localStorageCacheService.js', () => ({
    get: jest.fn(),
    set: jest.fn(),
}));
jest.mock('../../src/services/api.js', () => ({
    searchWord: jest.fn(),
}));

describe('MeaningDisplayManager', () => {
    let meaningBar;
    let manager;

    beforeEach(() => {
        document.body.innerHTML = `<div id="meaningBar"></div>`;
        meaningBar = document.getElementById('meaningBar');
        manager = new MeaningDisplayManager(meaningBar);
        jest.clearAllMocks();
    });

    test('constructor should log an error if meaning bar element is not found', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        new MeaningDisplayManager(null);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Meaning bar element not found!");
        consoleErrorSpy.mockRestore();
    });

    describe('showMeaning', () => {
        test('should do nothing if meaningBar or wordSlug is not provided', async () => {
            manager.meaningBar = null;
            await manager.showMeaning('test');
            expect(meaningBar.classList.contains('visible')).toBe(false);

            manager.meaningBar = meaningBar; // restore
            await manager.showMeaning(null);
            expect(meaningBar.classList.contains('visible')).toBe(false);
        });

        test('should show loading message and make bar visible', () => {
            searchWord.mockReturnValue(new Promise(() => {})); // Return a pending promise
            manager.showMeaning('test'); // Don't await, check synchronous state
            expect(meaningBar.classList.contains('visible')).toBe(true);
            expect(meaningBar.innerHTML).toContain('Loading definition for test...');
        });

        test('should display data from cache if available', async () => {
            const cachedData = { slug: 'cached', japanese: [], senses: [] };
            localStorageCacheService.get.mockReturnValue(cachedData);
            const displayResultSpy = jest.spyOn(manager, 'displayResult');

            await manager.showMeaning('cached');

            expect(localStorageCacheService.get).toHaveBeenCalledWith('cached');
            expect(searchWord).not.toHaveBeenCalled();
            expect(displayResultSpy).toHaveBeenCalledWith(cachedData);
            displayResultSpy.mockRestore();
        });

        test('should fetch data from API if not in cache', async () => {
            const apiData = { slug: 'api-word', japanese: [], senses: [] };
            localStorageCacheService.get.mockReturnValue(null);
            searchWord.mockResolvedValue(apiData);
            const displayResultSpy = jest.spyOn(manager, 'displayResult');

            await manager.showMeaning('api-word');

            expect(localStorageCacheService.get).toHaveBeenCalledWith('api-word');
            expect(searchWord).toHaveBeenCalledWith('api-word');
            expect(localStorageCacheService.set).toHaveBeenCalledWith('api-word', apiData);
            expect(displayResultSpy).toHaveBeenCalledWith(apiData);
            displayResultSpy.mockRestore();
        });

        test('should display "not found" message if API returns no result', async () => {
            localStorageCacheService.get.mockReturnValue(null);
            searchWord.mockResolvedValue(null);

            await manager.showMeaning('not-found');

            expect(meaningBar.innerHTML).toContain('No definition found for not-found.');
        });

        test('should handle API errors gracefully', async () => {
            localStorageCacheService.get.mockReturnValue(null);
            const error = new Error('API Failure');
            searchWord.mockRejectedValue(error);
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await manager.showMeaning('error-word');

            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch meaning:', error);
            expect(meaningBar.innerHTML).toContain('Error loading definition for error-word.');
            consoleErrorSpy.mockRestore();
        });
    });

    describe('displayResult', () => {
        test('should render word, readings, and meanings correctly', () => {
            const result = {
                slug: '日本語',
                japanese: [
                    { reading: 'にほんご' },
                    { reading: 'にっぽんご' }
                ],
                senses: [
                    { english_definitions: ['Japanese language'] },
                    { english_definitions: ['another meaning', 'sense 2'] }
                ]
            };
            manager.displayResult(result);

            expect(meaningBar.querySelector('.meaning-word').textContent).toBe('日本語');
            expect(meaningBar.querySelector('.meaning-reading').innerHTML).toBe('にほんご<br>にっぽんご');
            expect(meaningBar.querySelector('.meaning-definition').innerHTML).toBe('• Japanese language<br>• another meaning, sense 2');
            expect(meaningBar.querySelector('.jisho-link').href).toContain('https://jisho.org/search/%E6%97%A5%E6%9C%AC%E8%AA%9E');
        });
    });

    describe('hideMeaning', () => {
        test('should remove visible class from meaning bar', () => {
            meaningBar.classList.add('visible');
            manager.hideMeaning();
            expect(meaningBar.classList.contains('visible')).toBe(false);
        });

        test('should do nothing if meaning bar is null', () => {
            manager.meaningBar = null;
            expect(() => manager.hideMeaning()).not.toThrow();
        });
    });
});