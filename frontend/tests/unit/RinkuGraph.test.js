import { RinkuGraph } from '../../src/js/components/RinkuGraph.js';
import { CanvasComponent } from '../../src/js/components/CanvasComponent.js';

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
            // Mock drawExpansion
            jest.spyOn(rinkuGraph, 'drawExpansion').mockImplementation(() => {});
            // Mock _focusKanji
            jest.spyOn(rinkuGraph, '_focusKanji').mockImplementation(() => {});
            // Mock kanjiSidebar.addKanji
            jest.spyOn(rinkuGraph.kanjiSidebar, 'addKanji').mockImplementation(() => {});
            // Mock nodeDuplicator.duplicateAndExpandNode
            jest.spyOn(rinkuGraph.nodeDuplicator, 'duplicateAndExpandNode').mockImplementation(() => {});
            // Mock nodeDragHandler.hasDragOccurred
            jest.spyOn(rinkuGraph.nodeDragHandler, 'hasDragOccurred').mockReturnValue(false);
        });

        test('should block concurrent user clicks', async () => {
            rinkuGraph.isSearching = true;
            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });
            expect(rinkuGraph.fetchRelatedWords).not.toHaveBeenCalled();
        });

        test('should add kanji-loading class and set isSearching to true', async () => {
            // Use a promise that never resolves to check the state mid-execution
            const pendingPromise = new Promise(() => {});
            rinkuGraph.fetchRelatedWords.mockReturnValue(pendingPromise);

            rinkuGraph.isSearching = false;
            // Do not await, as the promise will never resolve
            rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(kanjiElement.classList.contains('kanji-loading')).toBe(true);
            expect(rinkuGraph.isSearching).toBe(true);
        });

        test('should call fetchRelatedWords and drawExpansion if words are returned', async () => {
            const relatedWords = [{ slug: 'word1' }, { slug: 'word2' }];
            rinkuGraph.fetchRelatedWords.mockResolvedValueOnce(relatedWords);

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(rinkuGraph.fetchRelatedWords).toHaveBeenCalledWith('日');
            expect(rinkuGraph.drawExpansion).toHaveBeenCalledWith(kanjiElement, '日', expect.any(Array));
            expect(kanjiElement.classList.contains('kanji-char')).toBe(false);
            expect(kanjiElement.classList.contains('active-source-kanji')).toBe(true);
            expect(rinkuGraph.kanjiSidebar.addKanji).toHaveBeenCalledWith('日', parentNode);
        });

        test('should mark as expanded-parent-kanji if no new expansions', async () => {
            rinkuGraph.fetchRelatedWords.mockResolvedValueOnce([]);

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });

            expect(kanjiElement.classList.contains('kanji-char')).toBe(false);
            expect(kanjiElement.classList.contains('expanded-parent-kanji')).toBe(true);
            expect(rinkuGraph.drawExpansion).not.toHaveBeenCalled();
        });

        test('should call duplicateAndExpandNode if duplication conditions met', async () => {
            // To test duplication on the root node, we must use the actual wordContainer.
            // Re-assign parentNode for this test to be the graph's root container.
            parentNode = rinkuGraph.wordContainer;
            parentNode.appendChild(kanjiElement); // Ensure the clicked element is a child

            const activeKanji = document.createElement('span');
            activeKanji.classList.add('active-source-kanji');
            parentNode.appendChild(activeKanji);

            await rinkuGraph.handleKanjiClick({ currentTarget: kanjiElement });
            expect(rinkuGraph.nodeDuplicator.duplicateAndExpandNode).toHaveBeenCalledWith(parentNode, kanjiElement);
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
            expect(consoleErrorSpy).toHaveBeenCalled();
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
    });

    test('handleNodeClick should show meaning if target is not a kanji span', () => {
        const node = document.createElement('div');
        node.dataset.wordSlug = 'testnode';
        const event = { target: node };

        rinkuGraph.handleNodeClick(node, event);
        expect(rinkuGraph.meaningDisplayManager.showMeaning).toHaveBeenCalledWith('testnode');
    });

    test('handleNodeClick should not show meaning if target is a kanji span', () => {
        const node = document.createElement('div');
        node.dataset.wordSlug = 'testnode';
        const kanjiSpan = document.createElement('span');
        kanjiSpan.textContent = '日';
        const event = { target: kanjiSpan };

        rinkuGraph.handleNodeClick(node, event);
        expect(rinkuGraph.meaningDisplayManager.showMeaning).not.toHaveBeenCalled();
    });

    test('_clearSelectionCircle should remove selection circle from DOM', () => {
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

    test('_focusKanji should create and append selection circle', () => {
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

    test('centerViewOnElement should set panZoom transform', () => {
        const element = document.createElement('div');
        element.style.left = '100px';
        element.style.top = '200px';

        rinkuGraph.centerViewOnElement(element);

        expect(rinkuGraph.panZoom.pointX).toBe(-100);
        expect(rinkuGraph.panZoom.pointY).toBe(-200);
        expect(rinkuGraph.panZoom.scale).toBe(1.0);
        expect(rinkuGraph.panZoom.setTransform).toHaveBeenCalled();
    });

    test('handleKanjiDoubleClick should focus and center view', () => {
        const kanjiElement = document.createElement('span');
        kanjiElement.classList.add('active-source-kanji');
        const parentNode = document.createElement('div');
        parentNode.appendChild(kanjiElement);

        const focusKanjiSpy = jest.spyOn(rinkuGraph, '_focusKanji').mockImplementation(() => {});
        const centerViewSpy = jest.spyOn(rinkuGraph, 'centerViewOnElement').mockImplementation(() => {});

        const event = { currentTarget: kanjiElement, stopPropagation: jest.fn() };
        rinkuGraph.handleKanjiDoubleClick(event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(focusKanjiSpy).toHaveBeenCalledWith(kanjiElement);
        expect(centerViewSpy).toHaveBeenCalledWith(parentNode);

        focusKanjiSpy.mockRestore();
        centerViewSpy.mockRestore();
    });

    test('addEventListeners should attach event listeners', () => {
        const viewportAddEventListenerSpy = jest.spyOn(viewport, 'addEventListener');
        const wordContainerAddEventListenerSpy = jest.spyOn(wordContainer, 'addEventListener');

        RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

        expect(wordContainerAddEventListenerSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));
        expect(wordContainerAddEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
        expect(viewportAddEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(viewportAddEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });
});