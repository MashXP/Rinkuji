import { RinkuGraph } from '../../src/js/components/RinkuGraph.js';
import { CanvasComponent } from '../../src/js/components/CanvasComponent.js';
import { LineCreator } from '../../src/js/utils/LineCreator.js';
import { GraphExpansionManager } from '../../src/js/managers/GraphExpansionManager.js';
import { GraphLayoutManager } from '../../src/js/managers/GraphLayoutManager.js';
import { GraphViewManager } from '../../src/js/managers/GraphViewManager.js';

jest.unmock('../../src/js/components/RinkuGraph.js');
jest.mock('../../src/js/managers/NodeFilterManager.js');
jest.mock('../../src/js/managers/ContextMenuHandler.js');
jest.mock('../../src/js/utils/NodeDragHandler.js', () => ({ NodeDragHandler: jest.fn(() => ({ hasDragOccurred: jest.fn(), handleMouseMove: jest.fn() })) }));
jest.mock('../../src/js/components/GraphInitializer.js', () => ({
    GraphInitializer: jest.fn().mockImplementation(() => ({
        initialize: jest.fn(),
    })),
}));
jest.mock('../../src/js/utils/NodeCreator.js');
jest.mock('../../src/js/utils/LineCreator.js');
jest.mock('../../src/js/managers/NodeMovementManager.js');
jest.mock('../../src/js/utils/NodeDuplicator.js');
jest.mock('../../src/js/managers/MeaningDisplayManager.js');
jest.mock('../../src/js/managers/GraphExpansionManager.js');
jest.mock('../../src/js/managers/GraphLayoutManager.js');
jest.mock('../../src/js/managers/GraphViewManager.js', () => ({
    GraphViewManager: jest.fn().mockImplementation(() => ({
        focusKanji: jest.fn(),
        centerViewOnElement: jest.fn(),
        clearSelectionCircle: jest.fn(),
    })),
}));

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

        // Configure the mock implementation for LineCreator here, where `document` is available.
        LineCreator.mockImplementation(() => ({
            createExpansionLine: jest.fn(),
            createSelectionCircleSVG: jest.fn(() => document.createElementNS('http://www.w3.org/2000/svg', 'circle')),
        }));

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

        // Prevent the real KanjiSidebar from adding event listeners in this unit test context
        jest.spyOn(require('../../src/js/components/KanjiSidebar.js').KanjiSidebar.prototype, '_setupEventListeners').mockImplementation(() => {});

        rinkuGraph = new RinkuGraph(
            viewport, canvas, wordContainer, svgLayer, nodesContainer,
            parentKanjiSidebar, parentKanjiSearchInput, parentKanjiListContainer, panZoom
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('constructor should initialize all dependencies and properties', () => {
        expect(rinkuGraph).toBeInstanceOf(RinkuGraph); // Verify inheritance
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

        // New manager assertions
        expect(rinkuGraph.viewManager).toBeDefined();
        expect(rinkuGraph.layoutManager).toBeDefined();
        expect(rinkuGraph.expansionManager).toBeDefined();

        // Verify constructor calls for new managers
        expect(GraphViewManager).toHaveBeenCalledWith(expect.objectContaining({
            graphState: rinkuGraph.graphState,
            svgLayer: rinkuGraph.svgLayer,
            canvas: rinkuGraph.canvas,
            panZoom: rinkuGraph.panZoom,
            lineCreator: expect.any(Object), // LineCreator is instantiated inside
            getUnscaledElementCenter: expect.any(Function)
        }));

        expect(GraphLayoutManager).toHaveBeenCalledWith(expect.objectContaining({
            nodeCreator: null, // Set later in RinkuGraph constructor
            // The mock returns a plain object, so we check for that.
            // The specific functions are part of the LineCreator mock implementation.
            lineCreator: expect.any(Object),
            nodeFilterManager: rinkuGraph.nodeFilterManager,
            getUnscaledElementCenter: expect.any(Function)
        }));

        expect(GraphExpansionManager).toHaveBeenCalledWith(expect.objectContaining({
            graph: rinkuGraph,
            nodeDuplicator: rinkuGraph.nodeDuplicator,
            kanjiSidebar: rinkuGraph.kanjiSidebar,
            layoutManager: rinkuGraph.layoutManager,
            viewManager: rinkuGraph.viewManager,
            kanjiRegex: rinkuGraph.kanjiRegex,
            MAX_WORDS_TO_DISPLAY: rinkuGraph.MAX_WORDS_TO_DISPLAY
        }));

        // Check if initializer and event listeners are called
        expect(rinkuGraph.graphInitializer.initialize).toHaveBeenCalled();
        // addEventListeners is called in constructor, we test its effects in a separate describe block

        // Verify that the circular dependency injection for KanjiSidebar happened.
        expect(rinkuGraph.nodeCollapseExpandManager.kanjiSidebar).toBe(rinkuGraph.kanjiSidebar);
    });

    test('NodeDuplicator callback should trigger expansionManager.handleKanjiClick', () => {
        const { NodeDuplicator } = require('../../src/js/utils/NodeDuplicator.js');
        const duplicatorArgs = NodeDuplicator.mock.calls[0];
        const handleKanjiClickCallback = duplicatorArgs[8]; // The callback is the 9th argument

        const event = { currentTarget: 'kanji' };
        handleKanjiClickCallback(event, true);
        expect(rinkuGraph.expansionManager.handleKanjiClick).toHaveBeenCalledWith(event, true);
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

    describe('_isRootLikeNode', () => {
        test('should return true for the root wordContainer', () => {
            expect(rinkuGraph._isRootLikeNode(rinkuGraph.wordContainer)).toBe(true);
        });

        test('should return true for a node with isRootNode dataset', () => {
            const node = document.createElement('div');
            node.dataset.isRootNode = 'true';
            expect(rinkuGraph._isRootLikeNode(node)).toBe(true);
        });

        test('should return true for a child node whose word does not contain its source kanji', () => {
            const node = document.createElement('div');
            node.dataset.wordSlug = 'abc';
            node.dataset.sourceKanji = '日';
            expect(rinkuGraph._isRootLikeNode(node)).toBe(true);
        });

        test('should return false for a normal child node', () => {
            const node = document.createElement('div');
            node.dataset.wordSlug = '日本語';
            node.dataset.sourceKanji = '日';
            expect(rinkuGraph._isRootLikeNode(node)).toBe(false);
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

        test('should do nothing if parent has no grandparent', () => {
            const parentNode = document.createElement('div');
            parentNode._parent = null;
            const setNodeVisibilitySpy = jest.spyOn(rinkuGraph.nodeFilterManager, 'setNodeVisibility');

            rinkuGraph._updateParentVisibilityAfterExpansion(parentNode);

            expect(setNodeVisibilitySpy).not.toHaveBeenCalled();
        });

        test('should do nothing if grandparent filter is not "kanji"', () => {
            const grandparentNode = document.createElement('div');
            grandparentNode.dataset.filterType = 'all'; // Not 'kanji'
            const parentNode = document.createElement('div');
            parentNode._parent = grandparentNode;
            const setNodeVisibilitySpy = jest.spyOn(rinkuGraph.nodeFilterManager, 'setNodeVisibility');

            rinkuGraph._updateParentVisibilityAfterExpansion(parentNode);

            expect(setNodeVisibilitySpy).not.toHaveBeenCalled();
        });
    });

    describe('fetchRelatedWords', () => {
        test('should fetch words and filter existing ones', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: [{ slug: 'word1' }, { slug: 'testword' }, { slug: 'word2' }] })
            });

            const results = await rinkuGraph.fetchRelatedWords('日');
            expect(global.fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5'); // URL encoding for '日'
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

        rinkuGraph.nodeDragHandler = { hasDragOccurred: jest.fn().mockReturnValue(false), handleMouseMove: jest.fn() };
            // The method is called in the constructor, but we re-call it here to test it in isolation.
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            expect(wordContainerAddEventListenerSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));
            expect(wordContainerAddEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(wordContainerAddEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
            expect(viewportAddEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(viewportAddEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
        });

        test('click on wordContainer should call handleNodeClick if no drag occurred', () => {
            const handleNodeClickSpy = jest.spyOn(rinkuGraph, 'handleNodeClick');
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(false); // Ensure this is false
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph); // Re-attach listeners

            const event = new MouseEvent('click', { bubbles: true });
            rinkuGraph.wordContainer.dispatchEvent(event);

            expect(handleNodeClickSpy).toHaveBeenCalledWith(rinkuGraph.wordContainer, event);
        });

        test('click on wordContainer should NOT call handleNodeClick if drag occurred', () => {
            const handleNodeClickSpy = jest.spyOn(rinkuGraph, 'handleNodeClick');
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(true); // Ensure this is true
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            const event = new MouseEvent('click', { bubbles: true });
            rinkuGraph.wordContainer.dispatchEvent(event);

            expect(handleNodeClickSpy).not.toHaveBeenCalled();
        });

        test('touchend on wordContainer should call handleNodeClick if no drag occurred', () => {
            const handleNodeClickSpy = jest.spyOn(rinkuGraph, 'handleNodeClick');
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(false); // Ensure this is false
            RinkuGraph.prototype.addEventListeners.call(rinkuGraph);

            const event = new TouchEvent('touchend', { bubbles: true });
            rinkuGraph.wordContainer.dispatchEvent(event);

            expect(handleNodeClickSpy).toHaveBeenCalledWith(rinkuGraph.wordContainer, event);
        });

        test('touchend on wordContainer should NOT call handleNodeClick if drag occurred', () => {
            const handleNodeClickSpy = jest.spyOn(rinkuGraph, 'handleNodeClick');
            rinkuGraph.nodeDragHandler.hasDragOccurred.mockReturnValue(true); // Ensure this is true
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

    test('handleKanjiDoubleClick should delegate to viewManager', () => {
        const kanjiElement = document.createElement('span');
        kanjiElement.classList.add('active-source-kanji');
        const parentNode = document.createElement('div');
        parentNode.appendChild(kanjiElement);
        const event = { currentTarget: kanjiElement, stopPropagation: jest.fn() };

        rinkuGraph.handleKanjiDoubleClick(event);

        expect(rinkuGraph.viewManager.focusKanji).toHaveBeenCalledWith(kanjiElement);
        expect(rinkuGraph.viewManager.centerViewOnElement).toHaveBeenCalledWith(parentNode);
    });

    test('handleKanjiDoubleClick should do nothing if kanji is not an active source', () => {
        const kanjiElement = document.createElement('span'); // No special class
        const parentNode = document.createElement('div');
        parentNode.appendChild(kanjiElement);
        const event = { currentTarget: kanjiElement, stopPropagation: jest.fn() };

        rinkuGraph.handleKanjiDoubleClick(event);

        expect(rinkuGraph.viewManager.focusKanji).not.toHaveBeenCalled();
    });

    test('handleKanjiDoubleClick should stop propagation and delegate for expanded-parent-kanji', () => {
        const kanjiElement = document.createElement('span');
        kanjiElement.classList.add('expanded-parent-kanji'); // Use the other valid class
        const parentNode = document.createElement('div');
        parentNode.appendChild(kanjiElement);
        const event = { currentTarget: kanjiElement, stopPropagation: jest.fn() };

        rinkuGraph.handleKanjiDoubleClick(event);

        expect(event.stopPropagation).toHaveBeenCalled(); // This covers line 90
        expect(rinkuGraph.viewManager.focusKanji).toHaveBeenCalledWith(kanjiElement);
        expect(rinkuGraph.viewManager.centerViewOnElement).toHaveBeenCalledWith(parentNode);
    });

    describe('handleNodeClick', () => {
        test('should show meaning when the node background is clicked', () => {
            const node = document.createElement('div');
            node.dataset.wordSlug = 'testnode';
            const event = { target: node };

            rinkuGraph.handleNodeClick(node, event);

            expect(rinkuGraph.meaningDisplayManager.showMeaning).toHaveBeenCalledWith('testnode');
        });

        test('should show consolidated meaning when node has consolidated data', () => {
            const node = document.createElement('div');
            const consolidatedData = { slug: '日', is_consolidated: true };
            node.dataset.consolidatedData = JSON.stringify(consolidatedData);
            const event = { target: node };

            rinkuGraph.handleNodeClick(node, event);

            expect(rinkuGraph.meaningDisplayManager.showMeaning).toHaveBeenCalledWith('日', consolidatedData);
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

    describe('Inherited CanvasComponent Methods', () => {
        beforeEach(() => {
            // Mock getBoundingClientRect for these specific tests
            rinkuGraph.canvas.getBoundingClientRect = jest.fn(() => ({
                left: 50,
                top: 50,
            }));
        });

        test('_getCanvasCoordinates should return correct unscaled coordinates', () => {
            const mockEvent = { clientX: 150, clientY: 125 };
            panZoom.getScale.mockReturnValue(1);
            let coords = rinkuGraph._getCanvasCoordinates(mockEvent);
            expect(coords.ux).toBe(100); // 150 - 50
            expect(coords.uy).toBe(75);  // 125 - 50

            // Test with scale
            panZoom.getScale.mockReturnValue(2);
            coords = rinkuGraph._getCanvasCoordinates(mockEvent);
            expect(coords.ux).toBe(50); // (150 - 50) / 2
            expect(coords.uy).toBe(37.5); // (125 - 50) / 2
        });

        test('_getUnscaledElementCenter should return correct unscaled center', () => {
            const mockElement = document.createElement('div');
            mockElement.getBoundingClientRect = jest.fn(() => ({
                left: 100, top: 100, width: 40, height: 20
            }));
            panZoom.getScale.mockReturnValue(1);

            const center = rinkuGraph._getUnscaledElementCenter(mockElement);
            expect(center.ux).toBe(70); // (100 + 40/2) - 50
            expect(center.uy).toBe(60); // (100 + 20/2) - 50
        });
    });
});