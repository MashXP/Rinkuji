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

        // Mock requestAnimationFrame to execute immediately
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());

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
        await rinkuGraph.handleKanjiClick({ currentTarget: kanjiSpan });

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
        viewport.dispatchEvent(mouseMoveEvent);

        // Simulate drag end
        const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true });
        viewport.dispatchEvent(mouseUpEvent);

        // Expect parent and child to have moved by (50, 50)
        expect(parentNode.style.left).toBe('150px');
        expect(parentNode.style.top).toBe('150px');
        expect(childNode.style.left).toBe('170px');
        expect(childNode.style.top).toBe('170px');
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
});