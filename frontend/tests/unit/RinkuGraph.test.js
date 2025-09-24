import { RinkuGraph } from '../../src/js/components/RinkuGraph.js';
import { CanvasComponent } from '../../src/js/components/CanvasComponent.js';
import { ContextMenuHandler } from '../../src/js/managers/ContextMenuHandler.js';

// Explicitly unmock RinkuGraph to ensure we are testing the real implementation,
// as it's mocked by other test files (e.g., main.test.js).
jest.unmock('../../src/js/components/RinkuGraph.js');

// Mock all dependencies
jest.mock('../../src/js/components/CanvasComponent.js');
jest.mock('../../src/js/components/KanjiSidebar.js');
jest.mock('../../src/js/managers/NodeFilterManager.js');
jest.mock('../../src/js/managers/ContextMenuHandler.js');
jest.mock('../../src/js/utils/NodeDragHandler.js');
jest.mock('../../src/js/components/GraphInitializer.js');
jest.mock('../../src/js/utils/NodeCreator.js');
jest.mock('../../src/js/utils/LineCreator.js');
jest.mock('../../src/js/managers/NodeMovementManager.js');
jest.mock('../../src/js/utils/NodeDuplicator.js');
jest.mock('../../src/js/managers/NodeCollapseExpandManager.js');
jest.mock('../../src/js/managers/MeaningDisplayManager.js');

// Mock fetch API
global.fetch = jest.fn();

describe('RinkuGraph', () => {
    let viewport;
    let canvas;
    let wordContainer;
    let svgLayer;
    let nodesContainer;
    let parentKanjiSidebar;
    let parentKanjiSearchInput;
    let parentKanjiListContainer;
    let panZoom;
    let rinkuGraph;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        CanvasComponent.mockClear();

        // Mock DOM elements
        viewport = document.createElement('div');
        canvas = document.createElement('canvas');
        wordContainer = document.createElement('div');
        wordContainer.dataset.word = 'testword';
        wordContainer.dataset.wordSlug = 'testword';
        svgLayer = document.createElement('svg');
        nodesContainer = document.createElement('div');
        parentKanjiSidebar = document.createElement('div');
        parentKanjiSearchInput = document.createElement('input');
        parentKanjiListContainer = document.createElement('div');

        // Mock document.getElementById for ContextMenuHandler and MeaningDisplayManager
        jest.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'nodeContextMenu') return document.createElement('div');
            if (id === 'meaningBar') return document.createElement('div');
            return null;
        });

        // Mock PanZoom (assuming it has getScale and setTransform methods)
        panZoom = {
            getScale: jest.fn(() => 1),
            setTransform: jest.fn(),
            pointX: 0,
            pointY: 0,
            scale: 1,
            handlePanMouseMove: jest.fn(),
        };

        // Mock CanvasComponent constructor to avoid calling super() logic
        const addEventListenersMock = jest.fn();
        CanvasComponent.mockImplementation(function() {
            this.viewport = viewport;
            this.canvas = canvas;
            this.panZoom = panZoom;
            this._getCanvasCoordinates = jest.fn(() => ({ ux: 0, uy: 0 }));
            this._getUnscaledElementCenter = jest.fn(() => ({ ux: 0, uy: 0 }));
            this.addEventListeners = addEventListenersMock;
        });

        rinkuGraph = new RinkuGraph(
            viewport, canvas, wordContainer, svgLayer, nodesContainer,
            parentKanjiSidebar, parentKanjiSearchInput, parentKanjiListContainer, panZoom
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('constructor should initialize all dependencies and properties', () => {
        expect(CanvasComponent).toHaveBeenCalledWith(viewport, canvas, panZoom);
        expect(rinkuGraph.wordContainer).toBe(wordContainer);
        expect(rinkuGraph.svgLayer).toBe(svgLayer);
        expect(rinkuGraph.nodesContainer).toBe(nodesContainer);
        expect(rinkuGraph.wordContainer.dataset.isRootNode).toBe('true');
        expect(rinkuGraph.word).toBe('testword');
        expect(rinkuGraph.expandedElements).toBeInstanceOf(Set);
        expect(rinkuGraph.isSearching).toBe(false);
        expect(rinkuGraph.kanjiRegex).toBeInstanceOf(RegExp);

        // Check if managers/handlers are initialized
        expect(rinkuGraph.nodeMovementManager).toBeDefined();
        expect(rinkuGraph.nodeDragHandler).toBeDefined();
        expect(rinkuGraph.nodeFilterManager).toBeDefined();
        expect(rinkuGraph.nodeCollapseExpandManager).toBeDefined();
        expect(rinkuGraph.kanjiSidebar).toBeDefined();
        expect(rinkuGraph.contextMenuHandler).toBeDefined();
        expect(rinkuGraph.meaningDisplayManager).toBeDefined();
        expect(rinkuGraph.lineCreator).toBeDefined();
        expect(rinkuGraph.nodeCreator).toBeDefined();
        expect(rinkuGraph.nodeDuplicator).toBeDefined();
        expect(rinkuGraph.graphInitializer).toBeDefined();

        // Check if addEventListeners is called
        expect(rinkuGraph.addEventListeners).toHaveBeenCalled();
    });

    test('context menu expand callback should call nodeCollapseExpandManager.expandNode', () => {
        // Get the arguments passed to the ContextMenuHandler constructor during RinkuGraph initialization
        const contextMenuHandlerArgs = ContextMenuHandler.mock.calls[0];
        const expandCallback = contextMenuHandlerArgs[3]; // The expand callback is the 4th argument

        const mockNode = document.createElement('div');
        const expandNodeSpy = jest.spyOn(rinkuGraph.nodeCollapseExpandManager, 'expandNode');

        // Call the callback directly to test the wiring
        expandCallback(mockNode);

        expect(expandNodeSpy).toHaveBeenCalledWith(mockNode);
    });

    describe('_addKanjiEventListeners', () => {
        test('should add click, dblclick, and touchend listeners', () => {
            const kanjiSpan = document.createElement('span');
            const addEventListenerSpy = jest.spyOn(kanjiSpan, 'addEventListener');
            rinkuGraph._addKanjiEventListeners(kanjiSpan);
            expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('dblclick', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
        });
    });

    describe('handleKanjiClick', () => {
        let kanjiElement;
        let parentNode;

        beforeEach(() => {
            kanjiElement = document.createElement('span');
            kanjiElement.textContent = '日';
            kanjiElement.classList.add('kanji-char');
            parentNode = document.createElement('div');
            parentNode.appendChild(kanjiElement);

            // Mock fetchRelatedWords
            jest.spyOn(rinkuGraph, 'fetchRelatedWords').mockResolvedValue([]);
            // Mock methods inside _performExpansion to isolate handleKanjiClick's logic
            jest.spyOn(rinkuGraph, 'drawExpansion').mockImplementation(() => {});
            jest.spyOn(rinkuGraph, '_focusKanji').mockImplementation(() => {});
            jest.spyOn(rinkuGraph.kanjiSidebar, 'addKanji').mockImplementation(() => {});
            // Mock nodeDuplicator.duplicateAndExpandNode
            jest.spyOn(rinkuGraph.nodeDuplicator, 'duplicateAndExpandNode').mockImplementation(() => {});
            // Mock nodeDragHandler.hasDragOccurred
            jest.spyOn(rinkuGraph.nodeDragHandler, 'hasDragOccurred').mockReturnValue(false);
        });

        test('should ignore click if a search is already in progress', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            rinkuGraph.isSearching = true;
            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });
            expect(rinkuGraph.fetchRelatedWords).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith('Search in progress. Ignoring user click.');
            consoleLogSpy.mockRestore();
        });

        test('should ignore click if a drag has just occurred', async () => {
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(true);
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rinkuGraph.fetchRelatedWords).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith('Search in progress. Ignoring user click.');
            consoleLogSpy.mockRestore();
        });

        test('should call rerandomizeNode if kanji is an active source and has more words', async () => {
            const rerandomizeNodeSpy = jest.spyOn(rinkuGraph, 'rerandomizeNode').mockResolvedValue();
            kanjiElement.classList.add('active-source-kanji');
            kanjiElement.dataset.hasMoreWords = 'true';

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rerandomizeNodeSpy).toHaveBeenCalledWith(kanjiElement);
            expect(rinkuGraph.fetchRelatedWords).not.toHaveBeenCalled(); // Should not proceed to normal expansion
        });

        test('should call rerandomizeNode if kanji is an expanded parent and has more words', async () => {
            const rerandomizeNodeSpy = jest.spyOn(rinkuGraph, 'rerandomizeNode').mockResolvedValue();
            kanjiElement.classList.add('expanded-parent-kanji');
            kanjiElement.dataset.hasMoreWords = 'true';

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rerandomizeNodeSpy).toHaveBeenCalledWith(kanjiElement);
            expect(rinkuGraph.fetchRelatedWords).not.toHaveBeenCalled();
        });

        test('should call fetchRelatedWords and drawExpansion if words are returned', async () => {
            const relatedWords = [{ slug: 'word1' }, { slug: 'word2' }];
            rinkuGraph.fetchRelatedWords.mockResolvedValue(relatedWords);

            // Make parentNode the root container to test the `false` branch of the root-like duplication check
            parentNode = rinkuGraph.wordContainer;
            parentNode.appendChild(kanjiElement);

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rinkuGraph.fetchRelatedWords).toHaveBeenCalledWith('日');
            expect(rinkuGraph.drawExpansion).toHaveBeenCalledWith(kanjiElement, '日', expect.any(Array));
            expect(kanjiElement.classList.contains('active-source-kanji')).toBe(true);
            expect(rinkuGraph.kanjiSidebar.addKanji).toHaveBeenCalledWith('日', parentNode);
        });

        test('should mark as expanded-parent-kanji if no new expansions', async () => {
            rinkuGraph.fetchRelatedWords.mockResolvedValue([]);

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rinkuGraph.fetchRelatedWords).toHaveBeenCalledWith('日');
            expect(kanjiElement.classList.contains('expanded-parent-kanji')).toBe(true);
            expect(rinkuGraph.drawExpansion).not.toHaveBeenCalled();
        });

        describe('duplication logic', () => {
            test('should call duplicateAndExpandNode on a root-like node with 1 existing expansion', async () => {
                parentNode = rinkuGraph.wordContainer; // is a root-like node
                parentNode.appendChild(kanjiElement);
                const activeKanji = document.createElement('span');
                activeKanji.classList.add('active-source-kanji');
                parentNode.appendChild(activeKanji);

                await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });
                expect(rinkuGraph.nodeDuplicator.duplicateAndExpandNode).toHaveBeenCalledWith(parentNode, kanjiElement);
            });

            test('should not duplicate node on programmatic click', async () => {
                // Setup conditions where duplication would normally occur
                parentNode = rinkuGraph.wordContainer;
                parentNode.appendChild(kanjiElement);
                const activeKanji = document.createElement('span');
                activeKanji.classList.add('active-source-kanji');
                parentNode.appendChild(activeKanji);

                // Call with isProgrammatic = true
                await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement }, true);

                expect(rinkuGraph.nodeDuplicator.duplicateAndExpandNode).not.toHaveBeenCalled();
                expect(rinkuGraph.fetchRelatedWords).toHaveBeenCalled(); // Should proceed to normal expansion
            });

            test('should duplicate a non-root, root-like node with 1 existing expansion', async () => {
                // A "root-like" node is one whose word does not contain its source kanji.
                parentNode.dataset.isRootNode = 'false';
                parentNode.dataset.wordSlug = '犬'; // Does not contain '日'
                parentNode.dataset.sourceKanji = '日'; // So, it's root-like
                const activeKanji = document.createElement('span');
                activeKanji.classList.add('active-source-kanji');
                parentNode.appendChild(activeKanji);

                await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });
                expect(rinkuGraph.nodeDuplicator.duplicateAndExpandNode).toHaveBeenCalledWith(parentNode, kanjiElement);
            });

            test('should call duplicateAndExpandNode on a non-root-like node with 2 existing expansions', async () => {
                // Setup a non-root-like node
                parentNode.dataset.isRootNode = 'false';
                parentNode.dataset.wordSlug = '日本語';
                parentNode.dataset.sourceKanji = '日'; // word contains sourceKanji, so not root-like
                parentNode.appendChild(kanjiElement);

                const activeKanji1 = document.createElement('span');
                activeKanji1.classList.add('active-source-kanji');
                const activeKanji2 = document.createElement('span');
                activeKanji2.classList.add('expanded-parent-kanji');
                parentNode.appendChild(activeKanji1);
                parentNode.appendChild(activeKanji2);

                await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });
                expect(rinkuGraph.nodeDuplicator.duplicateAndExpandNode).toHaveBeenCalledWith(parentNode, kanjiElement);
            });

            test('should NOT call duplicateAndExpandNode on a non-root-like node with 1 existing expansion', async () => {
                // Setup a non-root-like node
                parentNode.dataset.isRootNode = 'false';
                parentNode.dataset.wordSlug = '日本語';
                parentNode.dataset.sourceKanji = '日';
                parentNode.appendChild(kanjiElement);

                const activeKanji1 = document.createElement('span');
                activeKanji1.classList.add('active-source-kanji');
                parentNode.appendChild(activeKanji1);

                await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });
                expect(rinkuGraph.nodeDuplicator.duplicateAndExpandNode).not.toHaveBeenCalled();
                expect(rinkuGraph.fetchRelatedWords).toHaveBeenCalled(); // Should proceed to normal expansion
            });
        });

        test('should always reset isSearching and remove kanji-loading class in finally block', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            rinkuGraph.fetchRelatedWords.mockRejectedValueOnce(new Error('API Error'));

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rinkuGraph.isSearching).toBe(false);
            expect(kanjiElement.classList.contains('kanji-loading')).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith("An error occurred during kanji click handling:", expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('_updateParentVisibilityAfterExpansion', () => {
        test('should make a mixed-content parent visible if it gains children under a kanji filter', () => {
            const grandparentNode = document.createElement('div');
            grandparentNode.dataset.filterType = 'kanji';

            const parentNode = document.createElement('div');
            parentNode.dataset.wordSlug = '日本go'; // Mixed content
            parentNode._parent = grandparentNode;
            parentNode._children = [document.createElement('div')]; // Simulate it has a child now
            parentNode.classList.add('node-hidden-by-filter'); // It was previously hidden

            const setNodeVisibilitySpy = jest.spyOn(rinkuGraph.nodeFilterManager, 'setNodeVisibility');

            rinkuGraph._updateParentVisibilityAfterExpansion(parentNode);

            expect(parentNode.classList.contains('node-hidden-by-filter')).toBe(false);
            expect(parentNode.classList.contains('mixed-content-node')).toBe(true);
            expect(setNodeVisibilitySpy).toHaveBeenCalledWith(parentNode, true);
        });
    });

    describe('_selectWordsToDisplay', () => {
        test('should return all words if count is less than or equal to max', () => {
            const words = [{ slug: 'a' }, { slug: 'b' }];
            const limit = 3;
            const result = rinkuGraph._selectWordsToDisplay(words, 'c', limit);
            expect(result).toEqual(words);
        });

        test('should select random words if kanji-as-word is not present', () => {
            const words = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }];
            const limit = 2;
            // Mock shuffle to be deterministic
            jest.spyOn(rinkuGraph, '_shuffleArray').mockImplementation(arr => arr.reverse());
            const result = rinkuGraph._selectWordsToDisplay(words, 'e', limit); // 'e' is not in words
            expect(result.length).toBe(2);
            expect(result).toEqual([{ slug: 'd' }, { slug: 'c' }]);
        });

        test('should prioritize kanji-as-word and fill remaining slots', () => {
            const words = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }];
            const limit = 3;
            jest.spyOn(rinkuGraph, '_shuffleArray').mockImplementation(arr => arr.reverse());
            const result = rinkuGraph._selectWordsToDisplay(words, 'c', limit);
            expect(result.length).toBe(3);
            expect(result.some(w => w.slug === 'c')).toBe(true);
            // The other words should be from the shuffled list
            expect(result.filter(w => w.slug !== 'c').map(w => w.slug)).toEqual(['d', 'b']);
        });
    });

    describe('rerandomizeNode', () => {
        let sourceKanjiElement;
        let parentNode;

        beforeEach(() => {
            parentNode = document.createElement('div');
            sourceKanjiElement = document.createElement('span');
            sourceKanjiElement.textContent = '日';
            sourceKanjiElement.classList.add('active-source-kanji');
            parentNode.appendChild(sourceKanjiElement);
            parentNode._children = [];

            jest.spyOn(rinkuGraph, 'fetchRelatedWords').mockResolvedValue([]);
            jest.spyOn(rinkuGraph, 'drawExpansion').mockImplementation(() => {});
        });

        test('should do nothing if element is not a valid source kanji', async () => {
            sourceKanjiElement.classList.remove('active-source-kanji');
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            await rinkuGraph.rerandomizeNode(sourceKanjiElement);
            expect(rinkuGraph.fetchRelatedWords).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith("Cannot rerandomize: Invalid source kanji element.");
            consoleWarnSpy.mockRestore();
        });

        test('should remove unexpanded children and fetch new words', async () => {
            const unexpandedChild = document.createElement('div');
            unexpandedChild.dataset.sourceKanji = '日';
            // Create parents and append children to them, as `parentNode` is a read-only property.
            unexpandedChild.lineElement = document.createElement('svg');
            const lineParent = document.createElement('div');
            lineParent.appendChild(unexpandedChild.lineElement);

            const childParent = document.createElement('div');
            childParent.appendChild(unexpandedChild);
            parentNode._children = [unexpandedChild];

            rinkuGraph.fetchRelatedWords.mockResolvedValueOnce([{ slug: 'newWord' }]);

            await rinkuGraph.rerandomizeNode(sourceKanjiElement);

            expect(unexpandedChild.parentNode).toBeNull(); // Check if removed from DOM
            expect(parentNode._children.length).toBe(0); // Check if removed from graph structure
            expect(rinkuGraph.fetchRelatedWords).toHaveBeenCalledWith('日');
            expect(rinkuGraph.drawExpansion).toHaveBeenCalledWith(sourceKanjiElement, '日', [{ slug: 'newWord' }]);
        });

        test('should preserve expanded children and fill remaining slots', async () => {
            const expandedChild = document.createElement('div');
            expandedChild.dataset.sourceKanji = '日';
            expandedChild._children = [document.createElement('div')]; // Has children, so is expanded

            const unexpandedChild = document.createElement('div');
            unexpandedChild.dataset.sourceKanji = '日';
            unexpandedChild._children = [];

            parentNode._children = [expandedChild, unexpandedChild];

            rinkuGraph.fetchRelatedWords.mockResolvedValueOnce([{ slug: 'newWord1' }, { slug: 'newWord2' }]);

            await rinkuGraph.rerandomizeNode(sourceKanjiElement);

            expect(parentNode._children).toEqual([expandedChild]); // Unexpanded removed, expanded preserved
            expect(rinkuGraph.drawExpansion).toHaveBeenCalled();
            const wordsToDisplay = rinkuGraph.drawExpansion.mock.calls[0][2];
            expect(wordsToDisplay.length).toBe(2); // 3 total slots - 1 preserved = 2 new
        });

        test('should not draw new expansions if no new words are available', async () => {
            parentNode._children = [];
            rinkuGraph.fetchRelatedWords.mockResolvedValueOnce([]); // No new words

            await rinkuGraph.rerandomizeNode(sourceKanjiElement);

            expect(rinkuGraph.drawExpansion).not.toHaveBeenCalled();
            expect(sourceKanjiElement.dataset.hasMoreWords).toBeUndefined();
        });

        test('should prioritize non-expanded kanji-as-word when selecting new words', async () => {
            parentNode._children = [];
            const allWords = [{ slug: '日' }, { slug: '日本' }, { slug: '本日' }, { slug: '休日' }];
            rinkuGraph.fetchRelatedWords.mockResolvedValueOnce(allWords);

            await rinkuGraph.rerandomizeNode(sourceKanjiElement);

            expect(rinkuGraph.drawExpansion).toHaveBeenCalled();
            const wordsToDisplay = rinkuGraph.drawExpansion.mock.calls[0][2];
            expect(wordsToDisplay.some(w => w.slug === '日')).toBe(true);
        });
    });

    describe('fetchRelatedWords', () => {
        test('should fetch words and filter existing ones', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: [{ slug: 'word1' }, { slug: 'testword' }, { slug: 'word2' }] })
            });

            const results = await rinkuGraph.fetchRelatedWords('日');
            expect(global.fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5');
            expect(results).toEqual([{ slug: 'word1' }, { slug: 'word2' }]);
        });

        test('should handle API errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const results = await rinkuGraph.fetchRelatedWords('日');
            expect(results).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to expand kanji:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('drawExpansion', () => {
        let sourceElement;
        let sourceKanji;
        let words;
        let parentNode;

        beforeEach(() => {
            parentNode = document.createElement('div');
            sourceElement = document.createElement('span');
            sourceElement.textContent = '日';
            parentNode.appendChild(sourceElement);
            sourceKanji = '日';
            words = [{ slug: 'word1' }, { slug: 'word2' }];

            // Mock _getUnscaledElementCenter
            jest.spyOn(rinkuGraph, '_getUnscaledElementCenter').mockReturnValue({ ux: 100, uy: 100 });
            // Mock lineCreator.createExpansionLine
            jest.spyOn(rinkuGraph.lineCreator, 'createExpansionLine').mockReturnValue(document.createElement('svg'));
            // Mock nodeCreator.createWordNode
            jest.spyOn(rinkuGraph.nodeCreator, 'createWordNode').mockReturnValue(document.createElement('div'));
            // Mock nodeCreator.positionAndAppendNode
            jest.spyOn(rinkuGraph.nodeCreator, 'positionAndAppendNode').mockImplementation(() => {});
            // Mock nodeCreator.fadeInElements
            jest.spyOn(rinkuGraph.nodeCreator, 'fadeInElements').mockImplementation(() => {});
            // Mock nodeCreator.refineLineEndpoint
            jest.spyOn(rinkuGraph.nodeCreator, 'refineLineEndpoint').mockImplementation(() => {});
        });

        test('should not draw if parentNode is collapsed', () => {
            parentNode.dataset.collapsed = 'true';
            rinkuGraph.drawExpansion(sourceElement, sourceKanji, words);
            expect(rinkuGraph.lineCreator.createExpansionLine).not.toHaveBeenCalled();
        });

        test('should create and position nodes and lines', () => {
            rinkuGraph.drawExpansion(sourceElement, sourceKanji, words);

            expect(rinkuGraph.lineCreator.createExpansionLine).toHaveBeenCalledTimes(words.length);
            expect(rinkuGraph.nodeCreator.createWordNode).toHaveBeenCalledTimes(words.length);
            expect(rinkuGraph.nodeCreator.positionAndAppendNode).toHaveBeenCalledTimes(words.length);
            expect(rinkuGraph.nodeCreator.fadeInElements).toHaveBeenCalledTimes(words.length);
            expect(rinkuGraph.nodeCreator.refineLineEndpoint).toHaveBeenCalledTimes(words.length);
        });

        test('should apply inherited filter if parentNode has filterType', () => {
            parentNode.dataset.filterType = 'kanji';
            parentNode.dataset.filterClickedKanji = '日';
            rinkuGraph.drawExpansion(sourceElement, sourceKanji, words);
            expect(rinkuGraph.nodeFilterManager.applyInheritedFilter).toHaveBeenCalledTimes(words.length);
        });

        test('should calculate baseAngle from grandparent if it exists', () => {
            const grandparentNode = document.createElement('div');
            parentNode._parent = grandparentNode;

            rinkuGraph._getUnscaledElementCenter
                .mockReturnValueOnce({ ux: 100, uy: 100 }) // sourceElement
                .mockReturnValueOnce({ ux: 50, uy: 50 })   // grandparentNode
                .mockReturnValueOnce({ ux: 100, uy: 100 }); // parentNode

            rinkuGraph.drawExpansion(sourceElement, sourceKanji, words);
            // The angle calculation is complex, but we can check that it was called after getting grandparent position
            expect(rinkuGraph._getUnscaledElementCenter).toHaveBeenCalledWith(grandparentNode);
        });

        test('should generate correct number of angles for 1, 2, and 3 words', () => {
            const oneWord = [{ slug: 'word1' }];
            const twoWords = [{ slug: 'word1' }, { slug: 'word2' }];
            const threeWords = [{ slug: 'word1' }, { slug: 'word2' }, { slug: 'word3' }];

            rinkuGraph.drawExpansion(sourceElement, sourceKanji, oneWord);
            expect(rinkuGraph.nodeCreator.createWordNode).toHaveBeenCalledTimes(1);

            rinkuGraph.nodeCreator.createWordNode.mockClear();
            rinkuGraph.drawExpansion(sourceElement, sourceKanji, twoWords);
            expect(rinkuGraph.nodeCreator.createWordNode).toHaveBeenCalledTimes(2);

            rinkuGraph.nodeCreator.createWordNode.mockClear();
            rinkuGraph.drawExpansion(sourceElement, sourceKanji, threeWords);
            expect(rinkuGraph.nodeCreator.createWordNode).toHaveBeenCalledTimes(3);
        });

        test('should set sourceKanji offsets on the parent node', () => {
            rinkuGraph.drawExpansion(sourceElement, sourceKanji, words);
            expect(parentNode._sourceKanjiOffsetX).toBeDefined();
            expect(parentNode._sourceKanjiOffsetY).toBeDefined();
        });
    });

    test('contextmenu on wordContainer should call contextMenuHandler', () => {
        // Re-call to ensure our spy is attached
        RinkuGraph.prototype.addEventListeners.call(rinkuGraph);
        const event = new MouseEvent('contextmenu', { bubbles: true });
        rinkuGraph.wordContainer.dispatchEvent(event);
        expect(rinkuGraph.contextMenuHandler.handleContextMenu).toHaveBeenCalledWith(event);
    });

    describe('addEventListeners', () => {
        test('should attach event listeners', () => {
            const viewportAddEventListenerSpy = jest.spyOn(viewport, 'addEventListener');
            const wordContainerAddEventListenerSpy = jest.spyOn(wordContainer, 'addEventListener');

            // The method is called in the constructor, so we re-call it on the instance to test it in isolation
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            expect(wordContainerAddEventListenerSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));
            expect(wordContainerAddEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(wordContainerAddEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
            expect(viewportAddEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(viewportAddEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
        });

        test('click on wordContainer should call handleNodeClick if no drag occurred', () => {
            const handleNodeClickSpy = jest.spyOn(rinkuGraph, 'handleNodeClick');
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(false);
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph); // Re-attach listeners

            const event = new MouseEvent('click', { bubbles: true });
            rinkuGraph.wordContainer.dispatchEvent(event);

            expect(handleNodeClickSpy).toHaveBeenCalledWith(rinkuGraph.wordContainer, event);
        });

        test('click on wordContainer should NOT call handleNodeClick if drag occurred', () => {
            const handleNodeClickSpy = jest.spyOn(rinkuGraph, 'handleNodeClick');
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(true);
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            const event = new MouseEvent('click', { bubbles: true });
            rinkuGraph.wordContainer.dispatchEvent(event);

            expect(handleNodeClickSpy).not.toHaveBeenCalled();
        });

        test('touchend on wordContainer should call handleNodeClick if no drag occurred', () => {
            const handleNodeClickSpy = jest.spyOn(rinkuGraph, 'handleNodeClick');
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(false);
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            const event = new TouchEvent('touchend', { bubbles: true });
            rinkuGraph.wordContainer.dispatchEvent(event);

            expect(handleNodeClickSpy).toHaveBeenCalledWith(rinkuGraph.wordContainer, event);
        });

        test('touchend on wordContainer should NOT call handleNodeClick if drag occurred', () => {
            const handleNodeClickSpy = jest.spyOn(rinkuGraph, 'handleNodeClick');
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(true);
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            const event = new TouchEvent('touchend', { bubbles: true });
            rinkuGraph.wordContainer.dispatchEvent(event);

            expect(handleNodeClickSpy).not.toHaveBeenCalled();
        });

        test('mousemove on viewport should call panZoom.handlePanMouseMove if not dragging a node', () => {
            // Mock nodeDragHandler to return false, simulating no active drag
            rinkuGraph.nodeDragHandler.handleMouseMove.mockReturnValue(false);
            // Re-attach listeners to use the mock
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            const event = new MouseEvent('mousemove', { bubbles: true });
            rinkuGraph.viewport.dispatchEvent(event);

            expect(rinkuGraph.nodeDragHandler.handleMouseMove).toHaveBeenCalledWith(event);
            expect(rinkuGraph.panZoom.handlePanMouseMove).toHaveBeenCalledWith(event);
        });

        test('mousemove on viewport should NOT call panZoom.handlePanMouseMove if dragging a node', () => {
            // Mock nodeDragHandler to return true, simulating an active drag
            rinkuGraph.nodeDragHandler.handleMouseMove.mockReturnValue(true);
            // Re-attach listeners to use the mock
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            const event = new MouseEvent('mousemove', { bubbles: true });
            rinkuGraph.viewport.dispatchEvent(event);

            expect(rinkuGraph.nodeDragHandler.handleMouseMove).toHaveBeenCalledWith(event);
            expect(rinkuGraph.panZoom.handlePanMouseMove).not.toHaveBeenCalled();
        });

        test('mousedown on viewport should hide meaning', () => {
            // Re-call to ensure our spy is attached
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            const event = new MouseEvent('mousedown', { bubbles: true });
            Object.defineProperty(event, 'target', { value: rinkuGraph.viewport });

            rinkuGraph.viewport.dispatchEvent(event);

            expect(rinkuGraph.meaningDisplayManager.hideMeaning).toHaveBeenCalled();
        });

        test('mousedown on a child of viewport should not hide meaning', () => {
            // Re-call to ensure our spy is attached
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);
            const childElement = document.createElement('div');
            rinkuGraph.viewport.appendChild(childElement);

            const event = new MouseEvent('mousedown', { bubbles: true });
            Object.defineProperty(event, 'target', { value: childElement });

            rinkuGraph.viewport.dispatchEvent(event);

            expect(rinkuGraph.meaningDisplayManager.hideMeaning).not.toHaveBeenCalled();
        });
    });

    describe('handleNodeClick', () => {
        test('should show meaning when the node background is clicked', () => {
            const node = document.createElement('div');
            node.dataset.wordSlug = 'testnode';
            const event = { target: node };

            rinkuGraph.handleNodeClick(node, event);

            expect(rinkuGraph.meaningDisplayManager.showMeaning).toHaveBeenCalledWith('testnode');
        });

        test('should return early and not show meaning when a kanji span is clicked', () => {
            // This test ensures that when a click event bubbles up from a kanji span
            // to the parent node's click listener, the handler correctly identifies
            // it as a kanji click and does nothing, preventing a duplicate action.
            const node = document.createElement('div');
            node.dataset.wordSlug = 'testnode';
            const kanjiSpan = document.createElement('span');
            kanjiSpan.textContent = '日';
            node.appendChild(kanjiSpan);
            const event = { target: kanjiSpan };
            
            // Sanity check that the regex will pass in the test environment
            expect(rinkuGraph.kanjiRegex.test(kanjiSpan.textContent)).toBe(true);

            // Call the method
            rinkuGraph.handleNodeClick(node, event);

            // Assert that the method returned early and did not call showMeaning
            expect(rinkuGraph.meaningDisplayManager.showMeaning).not.toHaveBeenCalled();
        });

        test('should show meaning when a non-kanji span is clicked', () => {
            const node = document.createElement('div');
            node.dataset.wordSlug = 'testnode';
            const nonKanjiSpan = document.createElement('span');
            nonKanjiSpan.textContent = 'abc'; // non-kanji text
            node.appendChild(nonKanjiSpan);
            const event = { target: nonKanjiSpan }; // Target is the span

            rinkuGraph.handleNodeClick(node, event);
            expect(rinkuGraph.meaningDisplayManager.showMeaning).toHaveBeenCalledWith('testnode');
        });

        test('should show meaning of the root word if the clicked node has no slug', () => {
            const node = document.createElement('div');
            // This node has no `data-word-slug`
            const event = { target: node };
            rinkuGraph.word = 'rootword'; // Set the graph's root word

            rinkuGraph.handleNodeClick(node, event);

            expect(rinkuGraph.meaningDisplayManager.showMeaning).toHaveBeenCalledWith('rootword');
        });
    });

    describe('_clearSelectionCircle', () => {
        test('should remove selection circle from DOM', () => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const parent = document.createElement('div');
            parent.appendChild(circle);
            rinkuGraph.graphState.currentSelectionCircle = circle;
            rinkuGraph.graphState.currentSelectionCircleParentNode = parent;

            rinkuGraph._clearSelectionCircle();
            expect(parent.children.length).toBe(0);
            expect(rinkuGraph.graphState.currentSelectionCircle).toBeNull();
            expect(rinkuGraph.graphState.currentSelectionCircleParentNode).toBeNull();
        });

        test('should handle null circle gracefully', () => {
            rinkuGraph.graphState.currentSelectionCircle = null;
            expect(() => rinkuGraph._clearSelectionCircle()).not.toThrow();
            expect(rinkuGraph.graphState.currentSelectionCircle).toBeNull();
            expect(rinkuGraph.graphState.currentSelectionCircleParentNode).toBeNull();
        });

        test('should handle circle with no parentNode gracefully', () => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            rinkuGraph.graphState.currentSelectionCircle = circle;
            rinkuGraph.graphState.currentSelectionCircleParentNode = null; // No parent

            expect(() => rinkuGraph._clearSelectionCircle()).not.toThrow();
            expect(rinkuGraph.graphState.currentSelectionCircle).toBeNull();
        });
    });

    describe('_focusKanji', () => {
        test('should create and append selection circle', () => {
            const kanjiElement = document.createElement('span');
            const parentNode = document.createElement('div');
            parentNode.appendChild(kanjiElement);

            jest.spyOn(rinkuGraph.lineCreator, 'createSelectionCircleSVG').mockReturnValue(document.createElementNS('http://www.w3.org/2000/svg', 'circle'));
            jest.spyOn(rinkuGraph.svgLayer, 'appendChild').mockImplementation(() => {});

            rinkuGraph._focusKanji(kanjiElement);

            expect(rinkuGraph.lineCreator.createSelectionCircleSVG).toHaveBeenCalled();
            expect(rinkuGraph.svgLayer.appendChild).toHaveBeenCalled();
            expect(rinkuGraph.graphState.currentSelectionCircle).not.toBeNull();
        });

        test('should handle root node correctly', () => {
            const kanjiElement = document.createElement('span');
            const parentNode = document.createElement('div');
            parentNode.dataset.isRootNode = 'true';
            parentNode.appendChild(kanjiElement);

            jest.spyOn(rinkuGraph, '_getUnscaledElementCenter').mockReturnValue({ ux: 50, uy: 60 });
            jest.spyOn(rinkuGraph.lineCreator, 'createSelectionCircleSVG').mockReturnValue(document.createElementNS('http://www.w3.org/2000/svg', 'circle'));
            jest.spyOn(rinkuGraph.svgLayer, 'appendChild').mockImplementation(() => {});

            rinkuGraph._focusKanji(kanjiElement);

            expect(rinkuGraph.graphState.currentSelectionCircleOffsetX).toBe(50);
            expect(rinkuGraph.graphState.currentSelectionCircleOffsetY).toBe(60);
        });
    });

    describe('centerViewOnElement', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should set panZoom transform for a non-root element', () => {
            const element = document.createElement('div');
            element.style.left = '100px';
            element.style.top = '200px';
            // Ensure dataset.isRootNode is not 'true'
            element.dataset.isRootNode = 'false';

            rinkuGraph.centerViewOnElement(element);

            expect(rinkuGraph.panZoom.pointX).toBe(-100);
            expect(rinkuGraph.panZoom.pointY).toBe(-200);
            expect(rinkuGraph.panZoom.scale).toBe(1.0);
            expect(rinkuGraph.panZoom.setTransform).toHaveBeenCalled();
        });

        test('should center on root node at (0,0)', () => {
            const element = document.createElement('div');
            element.dataset.isRootNode = 'true';

            rinkuGraph.centerViewOnElement(element);

            expect(rinkuGraph.panZoom.pointX).toBe(-0);
            expect(rinkuGraph.panZoom.pointY).toBe(-0);
            expect(rinkuGraph.panZoom.setTransform).toHaveBeenCalled();
        });

        test('should handle non-root elements with no explicit position', () => {
            const element = document.createElement('div');
            // No element.style.left or top
            element.dataset.isRootNode = 'false';

            rinkuGraph.centerViewOnElement(element);

            // parseFloat('') would be NaN, but our refactored code uses || 0.
            expect(rinkuGraph.panZoom.pointX).toBe(-0);
            expect(rinkuGraph.panZoom.pointY).toBe(-0);
            expect(rinkuGraph.panZoom.scale).toBe(1.0);
            expect(rinkuGraph.panZoom.setTransform).toHaveBeenCalled();
        });

        test('should reset canvas transition after timeout', () => {
            const element = document.createElement('div');
            element.style.left = '100px';
            element.style.top = '200px';
            rinkuGraph.canvas.style.transition = '';

            rinkuGraph.centerViewOnElement(element);

            expect(rinkuGraph.canvas.style.transition).toBe('transform 0.5s ease-in-out');
            jest.runAllTimers();
            expect(rinkuGraph.canvas.style.transition).toBe('transform 0.1s ease-out');
        });
    });

    describe('handleKanjiDoubleClick', () => {
        let focusKanjiSpy, centerViewSpy;

        beforeEach(() => {
            focusKanjiSpy = jest.spyOn(rinkuGraph, '_focusKanji').mockImplementation(() => {});
            centerViewSpy = jest.spyOn(rinkuGraph, 'centerViewOnElement').mockImplementation(() => {});
        });

        afterEach(() => {
            focusKanjiSpy.mockRestore();
            centerViewSpy.mockRestore();
        });

        test('should focus and center view for active-source-kanji', () => {
            const kanjiElement = document.createElement('span');
            kanjiElement.classList.add('active-source-kanji');
            const parentNode = document.createElement('div');
            parentNode.appendChild(kanjiElement);

            const event = { currentTarget: kanjiElement, stopPropagation: jest.fn() };
            rinkuGraph.handleKanjiDoubleClick(event);

            expect(event.stopPropagation).toHaveBeenCalled();
            expect(focusKanjiSpy).toHaveBeenCalledWith(kanjiElement);
            expect(centerViewSpy).toHaveBeenCalledWith(parentNode);
        });

        test('should work for expanded-parent-kanji', () => {
            const kanjiElement = document.createElement('span');
            kanjiElement.classList.add('expanded-parent-kanji'); // The other case
            const parentNode = document.createElement('div');
            parentNode.appendChild(kanjiElement);

            const event = { currentTarget: kanjiElement, stopPropagation: jest.fn() };
            rinkuGraph.handleKanjiDoubleClick(event);

            expect(focusKanjiSpy).toHaveBeenCalledWith(kanjiElement);
            expect(centerViewSpy).toHaveBeenCalledWith(parentNode);
        });

        test('should do nothing if kanji is not a source', () => {
            const kanjiElement = document.createElement('span');
            kanjiElement.classList.add('kanji-char'); // Not a source kanji
            const parentNode = document.createElement('div');
            parentNode.appendChild(kanjiElement);

            const event = { currentTarget: kanjiElement, stopPropagation: jest.fn() };
            rinkuGraph.handleKanjiDoubleClick(event);
            expect(focusKanjiSpy).not.toHaveBeenCalled();
        });
    });
});