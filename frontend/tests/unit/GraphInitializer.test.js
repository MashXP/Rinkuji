import { GraphInitializer } from '../../src/js/components/GraphInitializer';

describe('GraphInitializer', () => {
    let graphInitializer;
    let mockWordContainer;
    let mockKanjiRegex;
    let mockAddKanjiEventListeners;

    beforeEach(() => {
        mockWordContainer = {
            dataset: { word: 'test' },
            _children: [],
            appendChild: jest.fn(),
        };
        mockKanjiRegex = /./; // Matches any character for simplicity in initial tests
        mockAddKanjiEventListeners = jest.fn();

        graphInitializer = new GraphInitializer(
            mockWordContainer,
            mockKanjiRegex,
            mockAddKanjiEventListeners
        );
    });

    test('constructor should initialize properties', () => {
        expect(graphInitializer.wordContainer).toBe(mockWordContainer);
        expect(graphInitializer.kanjiRegex).toBe(mockKanjiRegex);
        expect(graphInitializer.addKanjiEventListeners).toBe(mockAddKanjiEventListeners);
    });

    describe('initialize', () => {
        test('should populate word container with clickable Kanji spans', () => {
            mockWordContainer.dataset.word = '日本'; // Word with Kanji
            mockKanjiRegex = /[一-龯]/; // Actual Kanji regex
            graphInitializer.kanjiRegex = mockKanjiRegex; // Update regex in instance

            graphInitializer.initialize();

            expect(mockWordContainer._children).toEqual([]); // Should be initialized
            expect(mockWordContainer.appendChild).toHaveBeenCalledTimes(2); // For 日 and 本

            // Check for Kanji character
            const kanjiSpan1 = mockWordContainer.appendChild.mock.calls[0][0];
            expect(kanjiSpan1.textContent).toBe('日');
            expect(kanjiSpan1.classList.contains('kanji-char')).toBe(true);
            expect(mockAddKanjiEventListeners).toHaveBeenCalledWith(kanjiSpan1);

            const kanjiSpan2 = mockWordContainer.appendChild.mock.calls[1][0];
            expect(kanjiSpan2.textContent).toBe('本');
            expect(kanjiSpan2.classList.contains('kanji-char')).toBe(true);
            expect(mockAddKanjiEventListeners).toHaveBeenCalledWith(kanjiSpan2);
        });

        test('should handle words without Kanji characters', () => {
            mockWordContainer.dataset.word = 'abc'; // Word without Kanji
            mockKanjiRegex = /[一-龯]/; // Actual Kanji regex
            graphInitializer.kanjiRegex = mockKanjiRegex; // Update regex in instance

            graphInitializer.initialize();

            expect(mockWordContainer.appendChild).toHaveBeenCalledTimes(3); // For a, b, c

            const charSpan1 = mockWordContainer.appendChild.mock.calls[0][0];
            expect(charSpan1.textContent).toBe('a');
            expect(charSpan1.classList.contains('kanji-char')).toBe(false);
            expect(mockAddKanjiEventListeners).not.toHaveBeenCalledWith(charSpan1);
        });

        test('should initialize _children array', () => {
            graphInitializer.initialize();
            expect(mockWordContainer._children).toEqual([]);
        });
    });
});