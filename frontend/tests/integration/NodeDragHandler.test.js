
import { NodeDragHandler } from '../../src/js/utils/NodeDragHandler.js';

describe('NodeDragHandler Touch Functionality', () => {
    let nodeDragHandler;
    let mockGetCanvasCoordinates;
    let testNode;
    let mockStartSpringDragCallback;
    let mockUpdateSpringDragTargetCallback;
    let mockStopSpringDragCallback;
    let mockNodeMovementManager;
    let mockStartGlideCallback;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="testNode" style="position: absolute; left: 0px; top: 0px; width: 100px; height: 100px;"></div>
        `;
        testNode = document.getElementById('testNode');

        mockGetCanvasCoordinates = jest.fn((e) => ({
            ux: e.clientX || e.touches[0].clientX,
            uy: e.clientY || e.touches[0].clientY,
        }));

        mockStartSpringDragCallback = jest.fn();
        mockUpdateSpringDragTargetCallback = jest.fn();
        mockStopSpringDragCallback = jest.fn();
        mockNodeMovementManager = { physics: { FLICK_RELEASE_TIME_THRESHOLD: 500 } };
        mockStartGlideCallback = jest.fn();

        nodeDragHandler = new NodeDragHandler(
            document.createElement('div'), // nodesContainer
            mockGetCanvasCoordinates,
            mockNodeMovementManager,
            mockStartSpringDragCallback,
            mockUpdateSpringDragTargetCallback,
            mockStopSpringDragCallback,
            mockStartGlideCallback
        );
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

        expect(mockStartSpringDragCallback).toHaveBeenCalledWith(testNode, 100, 100, expect.any(Array));
        expect(mockUpdateSpringDragTargetCallback).toHaveBeenCalledWith(150, 120);
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

        expect(mockStartSpringDragCallback).toHaveBeenCalledWith(testNode, 100, 100, expect.any(Array));
        expect(mockUpdateSpringDragTargetCallback).toHaveBeenCalledWith(150, 120);
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

        expect(mockStartSpringDragCallback).not.toHaveBeenCalled();
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
