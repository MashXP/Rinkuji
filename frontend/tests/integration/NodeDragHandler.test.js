
import { NodeDragHandler } from '../../src/js/utils/NodeDragHandler.js';

describe('NodeDragHandler Touch Functionality', () => {
    let nodeDragHandler;
    let mockGetCanvasCoordinates;
    let mockMoveNodeAndChildrenCallback;
    let testNode;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="testNode" style="position: absolute; left: 0px; top: 0px; width: 100px; height: 100px;"></div>
        `;
        testNode = document.getElementById('testNode');

        mockGetCanvasCoordinates = jest.fn((e) => ({
            ux: e.clientX || e.touches[0].clientX,
            uy: e.clientY || e.touches[0].clientY,
        }));
        mockMoveNodeAndChildrenCallback = jest.fn((node, dx, dy) => {
            const currentLeft = parseInt(node.style.left, 10);
            const currentTop = parseInt(node.style.top, 10);
            node.style.left = `${currentLeft + dx}px`;
            node.style.top = `${currentTop + dy}px`;
        });

        nodeDragHandler = new NodeDragHandler(mockGetCanvasCoordinates, mockMoveNodeAndChildrenCallback);
        nodeDragHandler.addDragHandlersToNode(testNode);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should drag a node with mouse events', () => {
        // Simulate mousedown
        const mousedownEvent = new MouseEvent('mousedown', {
            clientX: 100,
            clientY: 100,
            button: 0,
            bubbles: true,
            cancelable: true,
        });
        testNode.dispatchEvent(mousedownEvent);

        // Simulate mousemove
        const mousemoveEvent = new MouseEvent('mousemove', {
            clientX: 150,
            clientY: 120,
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(mousemoveEvent);

        // Simulate mouseup
        const mouseupEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(mouseupEvent);

        expect(mockMoveNodeAndChildrenCallback).toHaveBeenCalled();
        expect(testNode.style.left).toBe('50px');
        expect(testNode.style.top).toBe('20px');
        expect(nodeDragHandler.hasDragOccurred()).toBe(true);
    });

    test('should drag a node with touch events', () => {
        // Simulate touchstart
        const touchstartEvent = new TouchEvent('touchstart', {
            touches: [{ clientX: 100, clientY: 100 }],
            bubbles: true,
            cancelable: true,
        });
        testNode.dispatchEvent(touchstartEvent);

        // Simulate touchmove
        const touchmoveEvent = new TouchEvent('touchmove', {
            touches: [{ clientX: 150, clientY: 120 }],
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(touchmoveEvent);

        // Simulate touchend
        const touchendEvent = new TouchEvent('touchend', {
            touches: [],
            changedTouches: [{ clientX: 150, clientY: 120 }],
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(touchendEvent);

        expect(mockMoveNodeAndChildrenCallback).toHaveBeenCalled();
        expect(testNode.style.left).toBe('50px');
        expect(testNode.style.top).toBe('20px');
        expect(nodeDragHandler.hasDragOccurred()).toBe(true);
    });

    test('should not drag if movement is below threshold', () => {
        // Simulate mousedown
        const mousedownEvent = new MouseEvent('mousedown', {
            clientX: 100,
            clientY: 100,
            button: 0,
            bubbles: true,
            cancelable: true,
        });
        testNode.dispatchEvent(mousedownEvent);

        // Simulate mousemove slightly, below threshold
        const mousemoveEvent = new MouseEvent('mousemove', {
            clientX: 102,
            clientY: 102,
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(mousemoveEvent);

        // Simulate mouseup
        const mouseupEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(mouseupEvent);

        expect(mockMoveNodeAndChildrenCallback).not.toHaveBeenCalled();
        expect(testNode.style.left).toBe('0px');
        expect(testNode.style.top).toBe('0px');
        expect(nodeDragHandler.hasDragOccurred()).toBe(false);
    });

    test('should reset dragging state after touchend', () => {
        // Simulate touchstart
        const touchstartEvent = new TouchEvent('touchstart', {
            touches: [{ clientX: 100, clientY: 100 }],
            bubbles: true,
            cancelable: true,
        });
        testNode.dispatchEvent(touchstartEvent);

        // Simulate touchmove
        const touchmoveEvent = new TouchEvent('touchmove', {
            touches: [{ clientX: 150, clientY: 120 }],
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(touchmoveEvent);

        // Simulate touchend
        const touchendEvent = new TouchEvent('touchend', {
            touches: [],
            changedTouches: [{ clientX: 150, clientY: 120 }],
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(touchendEvent);

        expect(nodeDragHandler.isDragging).toBe(false);
        expect(nodeDragHandler.activeNode).toBeNull();
    });
});
