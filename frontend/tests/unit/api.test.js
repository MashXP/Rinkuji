import * as apiService from '../../src/services/api.js';

describe('API Service', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getLocalSuggestions', () => {
        test('should return empty array if query is empty', async () => {
            const result = await apiService.getLocalSuggestions('');
            expect(result).toEqual([]);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should fetch and return local suggestions', async () => {
            const mockResponse = ['suggestion1', 'suggestion2'];
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await apiService.getLocalSuggestions('test');
            expect(global.fetch).toHaveBeenCalledWith('/api/suggestions?q=test');
            expect(result).toEqual(mockResponse);
        });

        test('should handle HTTP errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const result = await apiService.getLocalSuggestions('test');
            expect(result).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch local suggestions:", expect.any(Error));
            consoleErrorSpy.mockRestore();
        });

        test('should handle network errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const result = await apiService.getLocalSuggestions('test');
            expect(result).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch local suggestions:", expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('searchJishoWords', () => {
        test('should return empty array if query is empty', async () => {
            const result = await apiService.searchJishoWords('');
            expect(result).toEqual([]);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should fetch and return Jisho words slugs', async () => {
            const mockResponse = { data: [{ slug: '日本語' }, { slug: '単語' }] };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await apiService.searchJishoWords('test');
            expect(global.fetch).toHaveBeenCalledWith('/search_words?query=test');
            expect(result).toEqual(['日本語', '単語']);
        });

        test('should filter out non-Japanese results', async () => {
            const mockResponse = { data: [{ slug: '日本語' }, { slug: 'test' }, { slug: '123' }] };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await apiService.searchJishoWords('test');
            expect(global.fetch).toHaveBeenCalledWith('/search_words?query=test');
            expect(result).toEqual(['日本語']);
        });

        test('should filter out results without kanji', async () => {
            const mockResponse = { data: [{ slug: '日本語' }, { slug: 'ひらがな' }] };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await apiService.searchJishoWords('test');
            expect(global.fetch).toHaveBeenCalledWith('/search_words?query=test');
            expect(result).toEqual(['日本語']);
        });

        test('should handle HTTP errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const result = await apiService.searchJishoWords('test');
            expect(result).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch Jisho words:", expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('searchJishoKanji', () => {
        test('should return empty array if query is empty', async () => {
            const result = await apiService.searchJishoKanji('');
            expect(result).toEqual([]);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should fetch and return Jisho kanji characters', async () => {
            const mockResponse = { data: [{ character: '日' }, { character: '本' }] };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await apiService.searchJishoKanji('日');
            expect(global.fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5');
            expect(result).toEqual(['日', '本']);
        });

        test('should filter out non-Japanese characters', async () => {
            const mockResponse = { data: [{ character: '日' }, { character: 'a' }, { character: '1' }] };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await apiService.searchJishoKanji('test');
            expect(global.fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=test');
            expect(result).toEqual(['日']);
        });

        test('should handle HTTP errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const result = await apiService.searchJishoKanji('日');
            expect(result).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch Jisho kanji:", expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('getSuggestions', () => {
        test('should return empty array if query is empty', async () => {
            const result = await apiService.getSuggestions('');
            expect(result).toEqual([]);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should combine local and Jisho word suggestions', async () => {
            global.fetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['local1', 'local2']) }) // For getLocalSuggestions
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [{'slug': '日本語'}, {'slug': '単語'}] }) }); // For searchJishoWords

            const result = await apiService.getSuggestions('test');
            expect(result).toEqual(['local1', 'local2', '日本語', '単語']);
            expect(global.fetch).toHaveBeenCalledWith('/api/suggestions?q=test');
            expect(global.fetch).toHaveBeenCalledWith('/search_words?query=test');
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        test('should include Jisho kanji suggestions for single character query', async () => {
            global.fetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // For getLocalSuggestions
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) }) // For searchJishoWords
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [{'character': '日'}] }) }); // For searchJishoKanji

            const result = await apiService.getSuggestions('日');
            expect(result).toEqual(['日']);
            expect(global.fetch).toHaveBeenCalledWith('/api/suggestions?q=%E6%97%A5');
            expect(global.fetch).toHaveBeenCalledWith('/search_words?query=%E6%97%A5');
            expect(global.fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5');
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        test('should return unique suggestions', async () => {
            global.fetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['common', 'local']) }) // For getLocalSuggestions
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [{'slug': 'common'}, {'slug': 'jisho'}] }) }); // For searchJishoWords

            const result = await apiService.getSuggestions('test');
            expect(result).toEqual(['common', 'local']);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('getGraphData', () => {
        test('should return null and log error if word is empty', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const result = await apiService.getGraphData('');
            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith("getGraphData: 'word' parameter is required.");
            consoleErrorSpy.mockRestore();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should fetch and return graph data', async () => {
            const mockResponse = { nodes: [], edges: [] };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await apiService.getGraphData('testword');
            expect(global.fetch).toHaveBeenCalledWith('/api/graph?word=testword');
            expect(result).toEqual(mockResponse);
        });

        test('should handle 404 status for word not found', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await apiService.getGraphData('nonexistent');
            expect(result).toBeNull();
            expect(consoleWarnSpy).toHaveBeenCalledWith("Word \"nonexistent\" not found in the database.");
            consoleWarnSpy.mockRestore();
        });

        test('should handle other HTTP errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const result = await apiService.getGraphData('testword');
            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch graph data:", expect.any(Error));
            consoleErrorSpy.mockRestore();
        });

        test('should handle network errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const result = await apiService.getGraphData('testword');
            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch graph data:", expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });
});
