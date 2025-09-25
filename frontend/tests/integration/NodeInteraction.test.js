import { RinkuGraph } from '../../src/js/components/RinkuGraph.js';
import { PanZoom } from '../../src/js/utils/PanZoom.js';

// Mock fetch, which is what RinkuGraph actually uses for expansion
global.fetch = jest.fn();

describe('Integration: Node Interaction (Collapse/Expand, Movement)', () => {
    let viewport;
    let canvas;
    let wordContainer;
    let svgLayer;
    let nodesContainer;
    let parentKanjiSidebar;
    let parentKanjiSearchInput;
    let parentKanjiListContainer;
    let panZoomInstance;
    let rinkuGraph;

    // Helper to create a mock node with necessary properties
    const createMockNode = (wordSlug, sourceKanji, children = []) => {
        const node = document.createElement('div');
        node.classList.add('expanded-node');
        node.dataset.wordSlug = wordSlug;
        node.dataset.sourceKanji = sourceKanji;
        node.style.left = '0px';
        node.style.top = '0px';
        node._children = children;
        node.lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        return node;
    };

    beforeEach(async () => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        document.body.innerHTML = `
            <div id="viewport"></div>
            <canvas id="canvas"></canvas>
            <div id="wordContainer" data-word="" data-word-slug=""></div>
            <svg id="svgLayer"></svg>
            <div id="nodesContainer"></div>
            <div id="parentKanjiSidebar"></div>
            <input id="parentKanjiSearchInput" type="text">
            <div id="parentKanjiListContainer"></div>
            <div id="nodeContextMenu"></div>
            <div id="meaningBar"></div>
            <button id="zoomInBtn"></button>
            <button id="zoomOutBtn"></button>
            <button id="resetViewBtn"></button>
            <div id="zoomMeter"></div>
        `;

        viewport = document.getElementById('viewport');
        canvas = document.getElementById('canvas');
        wordContainer = document.getElementById('wordContainer');
        svgLayer = document.getElementById('svgLayer');
        nodesContainer = document.getElementById('nodesContainer');
        parentKanjiSidebar = document.getElementById('parentKanjiSidebar');
        parentKanjiSearchInput = document.getElementById('parentKanjiSearchInput');
        parentKanjiListContainer = document.getElementById('parentKanjiListContainer');

        canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 1000,
            height: 800,
            x: 0,
            y: 0,
            right: 1000,
            bottom: 800,
        }));

        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetViewBtn = document.getElementById('resetViewBtn');
        const zoomMeter = document.getElementById('zoomMeter');
        panZoomInstance = new PanZoom(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter);

        rinkuGraph = new RinkuGraph(
            viewport, canvas, wordContainer, svgLayer, nodesContainer,
            parentKanjiSidebar, parentKanjiSearchInput, parentKanjiListContainer, panZoomInstance
        );

        // Setup initial graph state for interactions
        const initialWordData = {
            word: '日本語',
            kanji: [
                { char: '日', meaning: 'day' }
            ]
        };
        wordContainer.dataset.word = initialWordData.word;
        wordContainer.dataset.wordSlug = initialWordData.word;
        const kanjiSpan = document.createElement('span');
        kanjiSpan.textContent = '日';
        kanjiSpan.classList.add('kanji-char');
        wordContainer.appendChild(kanjiSpan);
        rinkuGraph._addKanjiEventListeners(kanjiSpan);

        // Simulate expansion
        const relatedWordsResponse = {
            data: [
                { slug: '休日', meaning: 'holiday' },
                { slug: '毎日', meaning: 'every day' }
            ]
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(relatedWordsResponse),
        });
        await rinkuGraph.expansionManager.handleKanjiClick({ currentTarget: kanjiSpan });

        // Ensure nodes are created before interaction tests
        const node1 = nodesContainer.querySelector('[data-word-slug="休日"]');
        const node2 = nodesContainer.querySelector('[data-word-slug="毎日"]');
        expect(node1).not.toBeNull();
        expect(node2).not.toBeNull();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('should collapse and expand a node correctly', () => {
        const targetNode = nodesContainer.querySelector('[data-word-slug="休日"]');
        const childNode = createMockNode('子', '子');
        targetNode._children.push(childNode);
        nodesContainer.appendChild(childNode);

        // Simulate collapsing the node
        rinkuGraph.nodeCollapseExpandManager.collapseNode(targetNode);
        jest.runAllTimers(); // Execute the setTimeout in setNodeVisibility

        expect(targetNode.dataset.collapsed).toBe('true');
        expect(targetNode.classList.contains('collapsed-parent')).toBe(true);
        expect(childNode.style.display).toBe('none'); // Child should be hidden

        // Simulate expanding the node
        rinkuGraph.nodeCollapseExpandManager.expandNode(targetNode);
        jest.runAllTimers(); // Run timers for consistency, though not strictly needed here

        expect(targetNode.dataset.collapsed).toBe('false');
        expect(targetNode.classList.contains('collapsed-parent')).toBe(false);
        expect(childNode.style.display).toBe(''); // Child should be visible again
    });

    test('should move a node and its children correctly', () => {
        const parentNode = nodesContainer.querySelector('[data-word-slug="休日"]');
        const childNode = createMockNode('子', '子');
        parentNode._children.push(childNode);
        nodesContainer.appendChild(childNode);

        // Initial positions
        parentNode.style.left = '100px';
        parentNode.style.top = '100px';
        childNode.style.left = '120px';
        childNode.style.top = '120px';

        // Simulate drag start
        const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true });
        parentNode.dispatchEvent(mouseDownEvent);

        // Simulate drag move
        const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 150, bubbles: true });
        document.dispatchEvent(mouseMoveEvent);

        // Run the spring animation until it settles at the target.
        // The test expects the final position, so we need to run all animation frames.
        for (let i = 0; i < 100; i++) { // Loop a max of 100 times to prevent infinite loops
            const oldLeft = parentNode.style.left;
            jest.advanceTimersByTime(16); // Advance by one frame
            if (parentNode.style.left === oldLeft) {
                break; // Stop if the node is no longer moving
            }
        }

        // Simulate drag end
        const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true });
        document.dispatchEvent(mouseUpEvent);

        // Use toBeCloseTo for floating point precision from animation
        expect(parseFloat(parentNode.style.left)).toBeCloseTo(150, 0);
        expect(parseFloat(parentNode.style.top)).toBeCloseTo(150, 0);
        expect(parseFloat(childNode.style.left)).toBeCloseTo(170, 0);
        expect(parseFloat(childNode.style.top)).toBeCloseTo(170, 0);
    });

    test('should hide and show a node correctly', () => {
        const targetNode = nodesContainer.querySelector('[data-word-slug="休日"]');
        const childNode = createMockNode('子', '子');
        targetNode._children.push(childNode);
        nodesContainer.appendChild(childNode);

        // Simulate hiding the node
        rinkuGraph.nodeCollapseExpandManager.hideNode(targetNode);
        jest.runAllTimers(); // Execute the setTimeout in setNodeVisibility

        expect(targetNode.dataset.hidden).toBe('true');
        expect(targetNode.style.display).toBe('none');
        expect(childNode.style.display).toBe('none'); // Child should also be hidden

        // Simulate showing the node
        rinkuGraph.nodeCollapseExpandManager.showNode(targetNode);
        jest.runAllTimers(); // Run timers for consistency

        expect(targetNode.dataset.hidden).toBeUndefined();
        expect(targetNode.style.display).toBe('');
        expect(childNode.style.display).toBe(''); // Child should be visible again
    });

    test('should make a hidden mixed-content parent visible upon child expansion', async () => {
        // 1. Setup: Create a new node structure for this specific test
        nodesContainer.innerHTML = ''; // Clear existing nodes
        const parentNode = rinkuGraph.nodeCreator.createWordNode('親node', '親', null);
        const mixedContentChild = rinkuGraph.nodeCreator.createWordNode('日本go', '日', null);

        // Manually link them
        parentNode._children = [mixedContentChild];
        mixedContentChild._parent = parentNode;
        mixedContentChild._children = []; // Start with no children so it gets hidden

        nodesContainer.appendChild(parentNode);
        nodesContainer.appendChild(mixedContentChild);

        // 2. Apply a 'kanji' filter from the grandparent, which will hide the mixed-content child
        rinkuGraph.nodeFilterManager.filterNodeContent(parentNode, 'kanji');
        jest.runAllTimers(); // Run timers for setNodeVisibility

        // Verify initial state: mixed-content child is hidden
        expect(mixedContentChild.classList.contains('node-hidden-by-filter')).toBe(true);
        expect(mixedContentChild.style.display).toBe('none');

        // 3. Expand a kanji on the hidden mixed-content node.
        // This simulates a scenario where a child is added to the hidden node.
        // We add the child here to simulate the expansion.
        const kanjiGrandchild = rinkuGraph.nodeCreator.createWordNode('語', '語', null);
        kanjiGrandchild._parent = mixedContentChild;
        mixedContentChild._children.push(kanjiGrandchild);

        // We can directly call the function that gets called after expansion.
        // This is the key to covering the function in RinkuGraph.js.
        const _updateParentVisibilitySpy = jest.spyOn(rinkuGraph, '_updateParentVisibilityAfterExpansion');
        rinkuGraph._updateParentVisibilityAfterExpansion(mixedContentChild);

        // 4. Assert that the function was called and the node is now visible
        expect(_updateParentVisibilitySpy).toHaveBeenCalledWith(mixedContentChild);
        expect(mixedContentChild.classList.contains('node-hidden-by-filter')).toBe(false);
        expect(mixedContentChild.classList.contains('mixed-content-node')).toBe(true);
        expect(mixedContentChild.style.display).toBe(''); // It should now be visible
    });
});