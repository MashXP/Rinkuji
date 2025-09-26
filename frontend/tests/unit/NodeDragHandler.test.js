import { NodeDragHandler } from '../../src/js/utils/NodeDragHandler';

// JSDOM doesn't have TouchEvent, so we create a simple mock
class MockTouch {
    constructor(properties) {
        Object.assign(this, properties);
    }
}
global.TouchEvent = class MockTouchEvent extends Event {
    constructor(type, options = {}) {
        super(type, options);
        this.touches = (options.touches || []).map(t => new MockTouch(t));
    }
};

describe('NodeDragHandler', () => {
  let handler;
  let mockNode;
  let mockNodesContainer;
  let mockGetCanvasCoordinates;
  let mockStartSpringDragCallback;
  let mockUpdateSpringDragTargetCallback;
  let mockStopSpringDragCallback;
  let mockStartGlideCallback;
  let mockNodeMovementManager;

  beforeEach(() => {
    mockNodesContainer = document.createElement('div');
    mockNode = document.createElement('div');
    mockNode.style.left = '100px';
    mockNode.style.top = '100px';
    mockNodesContainer.appendChild(mockNode);
    document.body.appendChild(mockNodesContainer);

    // Mock callbacks
    mockGetCanvasCoordinates = jest.fn(e => {
        if (e.touches && e.touches.length > 0) {
            return { ux: e.touches[0].clientX, uy: e.touches[0].clientY };
        }
        return { ux: e.clientX, uy: e.clientY };
    });
    mockStartSpringDragCallback = jest.fn();
    mockUpdateSpringDragTargetCallback = jest.fn();
    mockStopSpringDragCallback = jest.fn();
    mockStartGlideCallback = jest.fn();
    mockNodeMovementManager = {
        physics: {
            FLICK_RELEASE_TIME_THRESHOLD: 500,
            FLICK_VELOCITY_DAMPING: 0.9,
            MAX_GLIDE_VELOCITY: 1.2,
            MIN_GLIDE_VELOCITY: 0.01,
        },
        currentVelocityX: 0,
        currentVelocityY: 0,
    };

    handler = new NodeDragHandler(
        mockNodesContainer,
        mockGetCanvasCoordinates,
        mockNodeMovementManager,
        mockStartSpringDragCallback,
        mockUpdateSpringDragTargetCallback,
        mockStopSpringDragCallback,
        mockStartGlideCallback
    );
    handler.addDragHandlersToNode(mockNode);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Mouse Events', () => {
    test('should start dragging on mousedown with button 0', () => {
        const event = new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 20, bubbles: true });
        mockNode.dispatchEvent(event);
        expect(handler.isDragging).toBe(true);
        expect(handler.activeNode).toBe(mockNode);
    });

    test('should not start dragging on mousedown with other buttons', () => {
        const event = new MouseEvent('mousedown', { button: 1, bubbles: true });
        mockNode.dispatchEvent(event);
        expect(handler.isDragging).toBe(false);
    });

    test('should move node on mousemove when dragging', () => {
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 20, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 25, clientY: 35, bubbles: true })); // Move > threshold
        expect(mockStartSpringDragCallback).toHaveBeenCalledWith(mockNode, 10, 20, [mockNode]);
        expect(mockUpdateSpringDragTargetCallback).toHaveBeenCalledWith(25, 35);
    });

    test('should stop dragging on mouseup', () => {
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        expect(handler.isDragging).toBe(false);
        expect(handler.activeNode).toBeNull();
    });

    test('handleMouseUpOrLeave should not throw if called without an active node', () => {
        handler.isDragging = false;
        handler.activeNode = null;
        // Directly call the handler to simulate a stray mouseup
        expect(() => handler.handleMouseUpOrLeave()).not.toThrow();
    });

    test('should not move if mousemove is below threshold', () => {
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 11, clientY: 11, bubbles: true }));
        expect(mockStartSpringDragCallback).not.toHaveBeenCalled();
        expect(handler.hasDragOccurred()).toBe(false);
    });

    test('handleMouseMove should return true if drag was handled', () => {
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        const handled = handler.handleMouseMove(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));
        expect(handled).toBe(true);
    });

    test('handleMouseMove should return false if not dragging', () => {
        const handled = handler.handleMouseMove(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));
        expect(handled).toBe(false);
    });

    test('handleMouseMove should not update velocity if there is no incremental movement during a drag', () => {
        // 1. Start drag and move past threshold
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        handler.handleMouseMove(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));
        expect(handler.hasDragOccurred()).toBe(true);
        expect(handler.lastDx).toBe(10); // Initial delta

        // 2. Fire another move event at the same location
        handler.handleMouseMove(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));
        
        // lastDx should NOT be updated to 0, because the `if (incrementalDx !== 0 || ...)` block was skipped.
        // This covers the `else` branch of that condition.
        expect(handler.lastDx).toBe(10);

        handler.handleMouseUpOrLeave(); // Cleanup
    });
  });

  describe('Touch Events', () => {
    test('should start dragging on touchstart', () => {
        const event = new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 20 }], bubbles: true });
        mockNode.dispatchEvent(event);
        expect(handler.isDragging).toBe(true);
        expect(handler.activeNode).toBe(mockNode);
    });

    test('should move node on touchmove', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 20 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 25, clientY: 35 }], bubbles: true }));
        expect(mockStartSpringDragCallback).toHaveBeenCalledWith(mockNode, 10, 20, [mockNode]);
        expect(mockUpdateSpringDragTargetCallback).toHaveBeenCalledWith(25, 35);
    });

    test('should stop dragging on touchend', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 20 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
        expect(handler.isDragging).toBe(false);
        expect(handler.activeNode).toBeNull();
    });

    test('should stop dragging on touchcancel', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 20 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }));
        expect(handler.isDragging).toBe(false);
        expect(handler.activeNode).toBeNull();
    });

    test('should not move if touchmove is below threshold', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 11, clientY: 11 }], bubbles: true }));
        expect(mockStartSpringDragCallback).not.toHaveBeenCalled();
        expect(handler.hasDragOccurred()).toBe(false);
    });

    test('should stop dragging on touchcancel', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 20 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }));
        expect(handler.isDragging).toBe(false);
        expect(handler.activeNode).toBeNull();
    });

    test('should not move if touchmove is below threshold', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 11, clientY: 11 }], bubbles: true }));
        expect(mockStartSpringDragCallback).not.toHaveBeenCalled();
        expect(handler.hasDragOccurred()).toBe(false);
    });

    test('handleTouchMove should return false if not dragging', () => {
        const handled = handler.handleTouchMove(new TouchEvent('touchmove', { touches: [{ clientX: 20, clientY: 20 }], bubbles: true }));
        expect(handled).toBe(false);
    });

    test('handleTouchMove should not update velocity if deltaTime is 0', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 20, clientY: 20 }], bubbles: true }));
        // Simulate another move event at the exact same time by not advancing timers
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 30, clientY: 30 }], bubbles: true }));
        expect(handler.lastDx).toBe(10); // Should retain the delta from the first valid move
    });

    test('handleTouchMove should not call move callback if no incremental movement', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        expect(mockStartSpringDragCallback).not.toHaveBeenCalled();
    });

    test('should not drag if more than one touch point', () => {
        const event = new TouchEvent('touchstart', { touches: [{}, {}], bubbles: true });
        mockNode.dispatchEvent(event);
        expect(handler.isDragging).toBe(false);
    });
  });

  describe('hasDragOccurred', () => {
    test('should return true after a drag has happened', () => {
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));
        expect(handler.hasDragOccurred()).toBe(true);
    });

    test('should return false if no drag has happened', () => {
        expect(handler.hasDragOccurred()).toBe(false);
    });

    test('should persist drag state until next mousedown', () => {
        // First drag
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        expect(handler.hasDragOccurred()).toBe(true);
        expect(handler.hasDragOccurred()).toBe(true); // State persists

        // Start a new interaction (mousedown without mousemove)
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        expect(handler.hasDragOccurred()).toBe(false); // Flag is reset, and no new drag occurred
    });
  });

  describe('Glide Functionality', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        // Mock performance.now() to be controlled by fake timers
        let time = 0;
        jest.spyOn(performance, 'now').mockImplementation(() => {
            time += 16; // Simulate 16ms passing per call
            return time;
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('should call startGlideCallback on quick mouseup after drag', () => {
        // Start drag
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        // First move
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));
        // Second move to establish velocity
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50, bubbles: true }));
        // End drag
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(handler.hasDragOccurred()).toBe(true);
        expect(mockStopSpringDragCallback).toHaveBeenCalled();
        expect(mockStartGlideCallback).toHaveBeenCalledWith(mockNode, expect.any(Number), expect.any(Number));
    });

    test('should call startGlideCallback on quick touchend after drag', () => {
        // Start drag
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        // First move
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 20, clientY: 20 }], bubbles: true }));
        // Second move to establish velocity
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 50, clientY: 50 }], bubbles: true }));
        // End drag
        document.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));

        expect(handler.hasDragOccurred()).toBe(true);
        expect(mockStopSpringDragCallback).toHaveBeenCalled();
        expect(mockStartGlideCallback).toHaveBeenCalledWith(mockNode, expect.any(Number), expect.any(Number));
    });

    test('should not glide if mouseup is slow after last move', () => {
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 35, clientY: 40, bubbles: true }));

        // Advance time by more than the glide threshold (500ms)
        jest.advanceTimersByTime(600);
        // We need to update performance.now() mock to reflect the time jump
        let time = 600;
        jest.spyOn(performance, 'now').mockImplementation(() => time);

        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(mockStartGlideCallback).not.toHaveBeenCalled();
    });

    test('should not glide if touchend is slow after last touchmove', () => {
        // 1. Start drag and move
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 35, clientY: 40 }], bubbles: true }));

        // 2. Advance time by more than the glide threshold (500ms)
        jest.advanceTimersByTime(600);
        // We also need to update the mock for performance.now() to reflect the time jump
        let time = performance.now.mock.results[performance.now.mock.calls.length - 1].value + 600;
        jest.spyOn(performance, 'now').mockReturnValue(time);

        // 3. End drag
        document.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));

        expect(mockStartGlideCallback).not.toHaveBeenCalled();
    });

    test('should not glide if no drag occurred', () => {
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        // No mousemove event
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(handler.hasDragOccurred()).toBe(false);
        expect(mockStartGlideCallback).not.toHaveBeenCalled();
    });

    test('should cap glide velocity if it exceeds maxVelocity', () => {
        // Simulate a very fast flick to trigger velocity capping
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));
        // A large jump in a short time (16ms)
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 400, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        expect(mockStartGlideCallback).toHaveBeenCalled();
        const [node, velocityX, velocityY] = mockStartGlideCallback.mock.calls[0];
        const finalVelocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

        // The raw velocity is calculated, and if it's over the cap, a scaling factor is applied.
        // We need to replicate that logic here to test the outcome.
        const rawVelocityX = (handler.lastDx / 16) * 0.1; // 280 / 16 * 0.1 = 1.75
        const rawVelocityY = (handler.lastDy / 16) * 0.1; // 380 / 16 * 0.1 = 2.375
        const rawVelocityMagnitude = Math.sqrt(rawVelocityX**2 + rawVelocityY**2);
        const maxVelocity = 1.2;
        const scale = maxVelocity / rawVelocityMagnitude;

        expect(finalVelocity).toBeCloseTo(maxVelocity);
    });

    test('should not attempt to glide if startGlideCallback is not provided', async () => {
        // Create a new node and handler instance isolated from the beforeEach setup
        // to avoid listener conflicts on the document.
        const isolatedNode = document.createElement('div');
        isolatedNode.style.left = '100px';
        isolatedNode.style.top = '100px';

        const handlerWithNoGlide = new NodeDragHandler(
            mockNodesContainer,
            mockGetCanvasCoordinates,
            mockNodeMovementManager,
            mockStartSpringDragCallback,
            mockUpdateSpringDragTargetCallback,
            mockStopSpringDragCallback,
            null // No glide callback
        );
        handlerWithNoGlide.addDragHandlersToNode(isolatedNode);

        // Simulate a drag and release
        isolatedNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 30, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        // The original mock should not be called because this handler instance doesn't have the callback.
        expect(mockStartGlideCallback).not.toHaveBeenCalled();
    });

    test('should not divide by zero if mouseup occurs at the same time as last mousemove', () => {
        // 1. Start drag and move
        mockNode.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20, bubbles: true }));

        // 2. Mock performance.now() to return the same time for the next call (simulating mouseup at same time)
        const lastMoveTime = performance.now.mock.results[performance.now.mock.calls.length - 1].value;
        jest.spyOn(performance, 'now').mockReturnValueOnce(lastMoveTime);

        // 3. End drag
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        // The key is that startGlideCallback is called without throwing a division-by-zero error.
        expect(mockStartGlideCallback).toHaveBeenCalled();
        const [, velocityX, velocityY] = mockStartGlideCallback.mock.calls[0];

        // Raw velocity is calculated with deltaTime=1, then capped.
        // lastDx = 10, lastDy = 10.
        // rawVelocityX = (10 / 1) * 0.1 = 1
        // rawVelocityY = (10 / 1) * 0.1 = 1
        // rawMagnitude = sqrt(1^2 + 1^2) = sqrt(2) = ~1.414
        // Since 1.414 > 1.2 (maxVelocity), it will be capped.
        const maxVelocity = 1.2;
        const scale = maxVelocity / Math.sqrt(2);
        const expectedVelocity = 1 * scale; // Both X and Y are scaled.

        expect(velocityX).toBeCloseTo(expectedVelocity);
        expect(velocityY).toBeCloseTo(expectedVelocity);
    });

    test('should not divide by zero if touchend occurs at the same time as last touchmove', () => {
        // 1. Start drag and move
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 20, clientY: 20 }], bubbles: true }));

        // 2. Mock performance.now() to return the same time for the next call (simulating touchend at same time)
        const lastMoveTime = performance.now.mock.results[performance.now.mock.calls.length - 1].value;
        jest.spyOn(performance, 'now').mockReturnValueOnce(lastMoveTime);

        // 3. End drag
        document.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));

        // The key is that startGlideCallback is called without throwing a division-by-zero error.
        expect(mockStartGlideCallback).toHaveBeenCalled();
        const [, velocityX, velocityY] = mockStartGlideCallback.mock.calls[0];

        // Raw velocity is calculated with deltaTime=1, then capped.
        // lastDx = 10, lastDy = 10.
        // rawVelocityX = (10 / 1) * 0.1 = 1
        // rawVelocityY = (10 / 1) * 0.1 = 1
        // rawMagnitude = sqrt(1^2 + 1^2) = sqrt(2) = ~1.414
        // Since 1.414 > 1.2 (maxVelocity), it will be capped.
        const maxVelocity = 1.2;
        const scale = maxVelocity / Math.sqrt(2);
        const expectedVelocity = 1 * scale; // Both X and Y are scaled.

        expect(velocityX).toBeCloseTo(expectedVelocity);
        expect(velocityY).toBeCloseTo(expectedVelocity);
    });

    test('handleMouseUpOrLeave should not throw if activeNode is null', () => {
        // Simulate a drag having occurred
        handler._dragOccurred = true;
        // Manually set activeNode to null before mouseup, simulating an edge case
        handler.activeNode = null;

        // Directly call the handler. It should execute its `if (nodeToGlide)` check,
        // find it to be false, and exit gracefully without throwing an error.
        expect(() => {
            handler.handleMouseUpOrLeave();
        }).not.toThrow();
    });
  });
});