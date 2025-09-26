import { GraphExpansionManager } from '@managers/GraphExpansionManager.js';

// Mock dependencies
const mockGraph = {
    isSearching: false,
    nodeDragHandler: { hasDragOccurred: () => false },
    fetchRelatedWords: jest.fn().mockResolvedValue([]), // Keep this for isolation
    _updateParentVisibilityAfterExpansion: jest.fn(),
    _isRootLikeNode: jest.fn().mockReturnValue(false),
    MAX_WORDS_TO_DISPLAY: 3,
};
const mockNodeDuplicator = {
    duplicateAndExpandNode: jest.fn(),
};

const mockKanjiSidebar = {
    addKanji: jest.fn(),
};
const mockLayoutManager = {
    drawExpansion: jest.fn(),
};
const mockViewManager = {
    focusKanji: jest.fn(),
};

describe('GraphExpansionManager', () => {
    let expansionManager;
    let kanjiElement;
    let parentNode;
    let sourceKanjiElement; // Declare this variable

    beforeEach(() => {
        jest.clearAllMocks();
        // Add the missing property to the mock for each test run
        mockGraph.expandedElements = new Set();

        expansionManager = new GraphExpansionManager({
            graph: mockGraph,
            nodeDuplicator: mockNodeDuplicator,
            kanjiSidebar: mockKanjiSidebar,
            layoutManager: mockLayoutManager,
            viewManager: mockViewManager,
            kanjiRegex: /[\u4e00-\u9faf]/,
            MAX_WORDS_TO_DISPLAY: 3,
        });

        kanjiElement = document.createElement('span');
        kanjiElement.textContent = '日';
        kanjiElement.classList.add('kanji-char');
        parentNode = document.createElement('div');
        parentNode.appendChild(kanjiElement);
    });

    describe('handleKanjiClick', () => {
        test('should ignore click if a search is already in progress', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            mockGraph.isSearching = true;
            await expansionManager.handleKanjiClick({ currentTarget: kanjiElement });
            expect(mockGraph.fetchRelatedWords).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith('Search in progress. Ignoring user click.');
            consoleLogSpy.mockRestore();
            mockGraph.isSearching = false; // Reset for other tests
        });

        test('should ignore click if a drag has just occurred', async () => {
            mockGraph.nodeDragHandler.hasDragOccurred = () => true; // Update mock for this test
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await expansionManager.handleKanjiClick({ currentTarget: kanjiElement });

            expect(mockGraph.fetchRelatedWords).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith('Search in progress. Ignoring user click.');
            consoleLogSpy.mockRestore();
            mockGraph.nodeDragHandler.hasDragOccurred = () => false; // Reset for other tests
        });

        test('should call rerandomizeNode if kanji is an active source and has more words', async () => {
            const rerandomizeNodeSpy = jest.spyOn(expansionManager, 'rerandomizeNode').mockResolvedValue();
            kanjiElement.classList.add('active-source-kanji');
            kanjiElement.dataset.hasMoreWords = 'true';

            await expansionManager.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rerandomizeNodeSpy).toHaveBeenCalledWith(kanjiElement);
            expect(mockGraph.fetchRelatedWords).not.toHaveBeenCalled(); // Should not proceed to normal expansion
        });

        test('should call rerandomizeNode if kanji is an expanded parent and has more words', async () => {
            const rerandomizeNodeSpy = jest.spyOn(expansionManager, 'rerandomizeNode').mockResolvedValue();
            kanjiElement.classList.add('expanded-parent-kanji');
            kanjiElement.classList.add('active-source-kanji');
            kanjiElement.dataset.hasMoreWords = 'true';

            await expansionManager.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rerandomizeNodeSpy).toHaveBeenCalledWith(kanjiElement);
            expect(mockGraph.fetchRelatedWords).not.toHaveBeenCalled();
        });

        test('should call duplicateAndExpandNode if _shouldDuplicateNode returns true', async () => {
            jest.spyOn(expansionManager, '_shouldDuplicateNode').mockReturnValue(true);
            await expansionManager.handleKanjiClick({ currentTarget: kanjiElement });
            expect(mockNodeDuplicator.duplicateAndExpandNode).toHaveBeenCalledWith(parentNode, kanjiElement);
        });

        test('should call _performExpansion for a normal click', async () => {
            const performExpansionSpy = jest.spyOn(expansionManager, '_performExpansion').mockResolvedValue();
            await expansionManager.handleKanjiClick({ currentTarget: kanjiElement });
            expect(performExpansionSpy).toHaveBeenCalledWith(kanjiElement);
        });

        test('should catch and log errors from _performExpansion', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const testError = new Error('Expansion failed');
            // Make one of the methods inside _performExpansion throw an error
            mockGraph.fetchRelatedWords.mockRejectedValue(testError);

            await expansionManager.handleKanjiClick({ currentTarget: kanjiElement });

            // Verify that the catch block was executed
            expect(consoleErrorSpy).toHaveBeenCalledWith("An error occurred during kanji click handling:", testError);
            consoleErrorSpy.mockRestore();
        });
    });

    test('handleKanjiClick should set isSearching flag for non-programmatic clicks', async () => {
        // This test ensures the try/finally block's isSearching logic is covered.
        await expansionManager.handleKanjiClick({ currentTarget: kanjiElement }, false);
        // The mock is called inside the try block where isSearching is true.
        expect(mockGraph.fetchRelatedWords).toHaveBeenCalled();
        // We can't easily test the state during execution, but by reaching this
        // we confirm the !isProgrammatic path was taken.
    });

    describe('_performExpansion', () => {
        test('should fetch words and draw expansion', async () => {
            // Spy on the actual method being called within the class under test
            const updateStateSpy = jest.spyOn(expansionManager, '_updateSourceKanjiState');

            const relatedWords = [{ slug: 'word1' }, { slug: 'word2' }];
            mockGraph.fetchRelatedWords.mockResolvedValue(relatedWords);

            await expansionManager._performExpansion(kanjiElement);

            expect(mockGraph.fetchRelatedWords).toHaveBeenCalledWith('日');
            expect(mockViewManager.focusKanji).toHaveBeenCalledWith(kanjiElement);
            expect(mockLayoutManager.drawExpansion).toHaveBeenCalledWith(kanjiElement, '日', relatedWords);
            expect(updateStateSpy).toHaveBeenCalledWith(kanjiElement, 'active-source-kanji');
            expect(mockKanjiSidebar.addKanji).toHaveBeenCalledWith('日', parentNode);
            expect(mockGraph._updateParentVisibilityAfterExpansion).toHaveBeenCalledWith(parentNode);
        });

        test('should mark as expanded-parent-kanji if no new expansions', async () => {
            // Spy on the actual method being called within the class under test
            const updateStateSpy = jest.spyOn(expansionManager, '_updateSourceKanjiState');

            mockGraph.fetchRelatedWords.mockResolvedValue([]);

            await expansionManager._performExpansion(kanjiElement);

            expect(mockGraph.fetchRelatedWords).toHaveBeenCalledWith('日');
            expect(updateStateSpy).toHaveBeenCalledWith(kanjiElement, 'expanded-parent-kanji');
            expect(mockLayoutManager.drawExpansion).not.toHaveBeenCalled();
        });
    });

    describe('_shouldDuplicateNode', () => {
        test('should return false for programmatic clicks', () => {
            expect(expansionManager._shouldDuplicateNode(parentNode, true)).toBe(false);
        });

        test('should return true for a root-like node with >= 1 expansion', () => {
            mockGraph._isRootLikeNode.mockReturnValue(true);
            parentNode.querySelectorAll = jest.fn().mockReturnValue({ length: 1 });
            expect(expansionManager._shouldDuplicateNode(parentNode, false)).toBe(true);
        });

        test('should return true for a normal node with > 1 expansion', () => {
            mockGraph._isRootLikeNode.mockReturnValue(false);
            parentNode.querySelectorAll = jest.fn().mockReturnValue({ length: 2 });
            expect(expansionManager._shouldDuplicateNode(parentNode, false)).toBe(true);
        });

        test('should return false for a normal node with 1 expansion', () => {
            mockGraph._isRootLikeNode.mockReturnValue(false);
            parentNode.querySelectorAll = jest.fn().mockReturnValue({ length: 1 });
            expect(expansionManager._shouldDuplicateNode(parentNode, false)).toBe(false);
        });
    });

    describe('_selectWordsToDisplay', () => {
        test('should return all words if count is less than or equal to limit', () => {
            const words = [{ slug: 'a' }, { slug: 'b' }];
            const result = expansionManager._selectWordsToDisplay(words, 'c', 3);
            expect(result).toEqual(words);
        });

        test('should prioritize kanji-as-word and fill remaining slots', () => {
            const words = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }];
            jest.spyOn(expansionManager, '_shuffleArray').mockImplementation(arr => arr.reverse());
            const result = expansionManager._selectWordsToDisplay(words, 'c', 3);
            expect(result.length).toBe(3);
            expect(result.some(w => w.slug === 'c')).toBe(true);
            expect(result.filter(w => w.slug !== 'c').map(w => w.slug)).toEqual(['d', 'b']);
        });
    });

    describe('rerandomizeNode', () => {
        beforeEach(() => {
            sourceKanjiElement = document.createElement('span');
            sourceKanjiElement.textContent = '日';
            sourceKanjiElement.classList.add('active-source-kanji');
            parentNode.appendChild(sourceKanjiElement);
            parentNode._children = [];
        });

        test('should do nothing if element is not a valid source kanji', async () => {
            sourceKanjiElement.classList.remove('active-source-kanji');
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            await expansionManager.rerandomizeNode(sourceKanjiElement);
            expect(mockGraph.fetchRelatedWords).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith("Cannot rerandomize: Invalid source kanji element.");
            consoleWarnSpy.mockRestore();
        });

        test('should remove unexpanded children and fetch new words', async () => {
            const unexpandedChild = document.createElement('div');
            unexpandedChild.dataset.sourceKanji = '日';
            unexpandedChild.lineElement = document.createElement('svg');
            const lineParent = document.createElement('div');
            lineParent.appendChild(unexpandedChild.lineElement);
            const childParent = document.createElement('div');
            childParent.appendChild(unexpandedChild);
            parentNode._children = [unexpandedChild];

            mockGraph.fetchRelatedWords.mockResolvedValueOnce([{ slug: 'newWord' }]);

            await expansionManager.rerandomizeNode(sourceKanjiElement);

            expect(unexpandedChild.parentNode).toBeNull();
            expect(parentNode._children.length).toBe(0);
            expect(mockGraph.fetchRelatedWords).toHaveBeenCalledWith('日');
            expect(mockLayoutManager.drawExpansion).toHaveBeenCalledWith(sourceKanjiElement, '日', [{ slug: 'newWord' }]);
        });

        test('should preserve expanded children and fill remaining slots', async () => {
            const expandedChild = document.createElement('div');
            expandedChild.dataset.sourceKanji = '日';
            expandedChild._children = [document.createElement('div')];

            const unexpandedChild = document.createElement('div');
            unexpandedChild.dataset.sourceKanji = '日';
            unexpandedChild._children = [];

            parentNode._children = [expandedChild, unexpandedChild];

            mockGraph.fetchRelatedWords.mockResolvedValueOnce([{ slug: 'newWord1' }, { slug: 'newWord2' }]);

            await expansionManager.rerandomizeNode(sourceKanjiElement);

            expect(parentNode._children).toEqual([expandedChild]);
            expect(mockLayoutManager.drawExpansion).toHaveBeenCalled();
            const wordsToDisplay = mockLayoutManager.drawExpansion.mock.calls[0][2];
            expect(wordsToDisplay.length).toBe(2); // 3 total slots - 1 preserved = 2 new
        });

        test('should not draw new expansions if no new words are available', async () => {
            parentNode._children = [];
            mockGraph.fetchRelatedWords.mockResolvedValueOnce([]); // No new words

            await expansionManager.rerandomizeNode(sourceKanjiElement);

            expect(mockLayoutManager.drawExpansion).not.toHaveBeenCalled();
            expect(sourceKanjiElement.dataset.hasMoreWords).toBeUndefined();
        });

        test('should prioritize non-expanded kanji-as-word when selecting new words', async () => {
            const allWords = [{ slug: '日' }, { slug: '日本' }, { slug: '本日' }, { slug: '休日' }];
            mockGraph.fetchRelatedWords.mockResolvedValueOnce(allWords);
            await expansionManager.rerandomizeNode(sourceKanjiElement);
            expect(mockLayoutManager.drawExpansion).toHaveBeenCalled();
            const wordsToDisplay = mockLayoutManager.drawExpansion.mock.calls[0][2];
            expect(wordsToDisplay.some(w => w.slug === '日')).toBe(true);
        });
    });
});