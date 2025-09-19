import { NodeCreator } from '@utils/NodeCreator.js';

// Mock dependencies
const mockNodesContainer = document.createElement('div');
const mockKanjiRegex = /[\u4e00-\u9faf]/;
const mockKanjiSidebar = {
    hasParentKanji: jest.fn(),
};
const mockContextMenuHandler = {
    handleContextMenu: jest.fn(),
};
const mockNodeDragHandler = {
    addDragHandlersToNode: jest.fn(),
    hasDragOccurred: jest.fn(),
};
const mockPanZoom = {
    canvas: document.createElement('canvas'),
    getScale: jest.fn(() => 1),
};
const mockAddKanjiEventListeners = jest.fn();
const mockOnNodeClickCallback = jest.fn();

describe('NodeCreator', () => {
    let nodeCreator;

    beforeEach(() => {
        jest.clearAllMocks();
        nodeCreator = new NodeCreator(
            mockNodesContainer,
            mockKanjiRegex,
            mockKanjiSidebar,
            mockContextMenuHandler,
            mockNodeDragHandler,
            mockPanZoom,
            mockAddKanjiEventListeners,
            mockOnNodeClickCallback
        );

        // Mock getBoundingClientRect for canvas and elements
        mockPanZoom.canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 1000,
            height: 800,
        }));
        // Default mock for element.getBoundingClientRect
        Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
            value: jest.fn(() => ({
                left: 10,
                top: 10,
                width: 100,
                height: 50,
            })),
            writable: true,
        });

        jest.spyOn(mockNodesContainer, 'appendChild');
    });

    test('createWordNode should create a node with correct structure and data', () => {
        mockKanjiSidebar.hasParentKanji.mockReturnValue(false);
        const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const node = nodeCreator.createWordNode('日本語', '日', lineElement);

        expect(node.classList.contains('expanded-node')).toBe(true);
        expect(node.dataset.wordSlug).toBe('日本語');
        expect(node.dataset.sourceKanji).toBe('日');
        expect(node._parent).toBeNull();
        expect(node._children).toEqual([]);
        expect(node.lineElement).toBe(lineElement);

        // Check character spans
        expect(node.children.length).toBe(3);
        expect(node.children[0].textContent).toBe('日');
        expect(node.children[0].classList.contains('active-source-kanji')).toBe(true);
        expect(node.children[0].classList.contains('kanji-char')).toBe(false);
        expect(mockAddKanjiEventListeners).toHaveBeenCalledWith(node.children[0]);

        expect(node.children[1].textContent).toBe('本');
        expect(node.children[1].classList.contains('kanji-char')).toBe(true);
        expect(mockAddKanjiEventListeners).toHaveBeenCalledWith(node.children[1]);

        expect(node.children[2].textContent).toBe('語');
        expect(node.children[2].classList.contains('kanji-char')).toBe(true);
        expect(mockAddKanjiEventListeners).toHaveBeenCalledWith(node.children[2]);

        // Check event listeners
        expect(mockNodeDragHandler.addDragHandlersToNode).toHaveBeenCalledWith(node);
    });

    test('createWordNode should apply expanded-parent-kanji class if kanji is in sidebar', () => {
        mockKanjiSidebar.hasParentKanji.mockImplementation((char) => char === '本');
        const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const node = nodeCreator.createWordNode('日本語', '日', lineElement);

        expect(node.children[1].textContent).toBe('本');
        expect(node.children[1].classList.contains('expanded-parent-kanji')).toBe(true);
        expect(node.children[1].classList.contains('kanji-char')).toBe(false);
    });

    test('positionAndAppendNode should set position and append to container', () => {
        const node = document.createElement('div');
        const parentNode = document.createElement('div');
        parentNode._children = []; // Initialize _children
        const position = { ux: 100, uy: 200 };

        nodeCreator.positionAndAppendNode(node, parentNode, position);

        expect(node._parent).toBe(parentNode);
        expect(parentNode._children).toContain(node);
        expect(node.style.left).toBe('100px');
        expect(node.style.top).toBe('200px');
        expect(node.style.transform).toBe('translate(-50%, -50%)');
        expect(mockNodesContainer.appendChild).toHaveBeenCalledWith(node);
    });

    test('fadeInElements should set opacity and display for node and line', () => {
        const node = document.createElement('div');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

        node.style.opacity = 0;
        line.style.opacity = 0;

        nodeCreator.fadeInElements(node, line);

        // requestAnimationFrame makes this async, so we check after a tick
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                expect(node.style.opacity).toBe('1');
                expect(line.style.opacity).toBe('1');
                resolve();
            });
        });
    });

    test('fadeInElements should hide elements if node has node-hidden-by-filter class', () => {
        const node = document.createElement('div');
        node.classList.add('node-hidden-by-filter');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

        nodeCreator.fadeInElements(node, line);

        expect(node.style.opacity).toBe('0');
        expect(node.style.display).toBe('none');
        expect(line.style.opacity).toBe('0');
        expect(line.style.display).toBe('none');
    });

    test('refineLineEndpoint should update line x2 and y2 attributes', () => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x2', '0');
        line.setAttribute('y2', '0');

        const targetNode = document.createElement('div');
        const targetKanjiSpan = document.createElement('span');
        targetKanjiSpan.classList.add('active-source-kanji');
        targetNode.appendChild(targetKanjiSpan);

        // Mock getBoundingClientRect for the span
        targetKanjiSpan.getBoundingClientRect = jest.fn(() => ({
            left: 50,
            top: 50,
            width: 20,
            height: 20,
        }));

        nodeCreator.refineLineEndpoint(line, targetNode);

        return new Promise(resolve => {
            requestAnimationFrame(() => {
                // Expected center: (50 + 10, 50 + 10) = (60, 60)
                // Since canvasRect.left/top are 0 and scale is 1, ux=60, uy=60
                expect(line.getAttribute('x2')).toBe('60');
                expect(line.getAttribute('y2')).toBe('60');
                resolve();
            });
        });
    });

    test('_getUnscaledElementCenter should return correct unscaled coordinates', () => {
        const element = document.createElement('div');
        element.getBoundingClientRect = jest.fn(() => ({
            left: 10,
            top: 10,
            width: 100,
            height: 50,
        }));

        const { ux, uy } = nodeCreator._getUnscaledElementCenter(element);

        // Element center in viewport coords: (10 + 50, 10 + 25) = (60, 35)
        // Since canvasRect.left/top are 0 and scale is 1, ux=60, uy=35
        expect(ux).toBe(60);
        expect(uy).toBe(35);

        mockPanZoom.getScale.mockReturnValue(2);
        const { ux: ux2, uy: uy2 } = nodeCreator._getUnscaledElementCenter(element);
        expect(ux2).toBe(30); // 60 / 2
        expect(uy2).toBe(17.5); // 35 / 2
    });
});