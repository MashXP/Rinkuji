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
  let mockGetCanvasCoordinates;
  let mockMoveNodeAndChildrenCallback;

  beforeEach(() => {
    mockNode = document.createElement('div');
    mockNode.style.left = '100px';
    mockNode.style.top = '100px';
    document.body.appendChild(mockNode);

    // Mock getCanvasCoordinates and moveNodeAndChildrenCallback
    mockGetCanvasCoordinates = jest.fn(e => ({ ux: e.clientX || e.touches[0].clientX, uy: e.clientY || e.touches[0].clientY }));
    mockMoveNodeAndChildrenCallback = jest.fn();

    handler = new NodeDragHandler(mockGetCanvasCoordinates, mockMoveNodeAndChildrenCallback);
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
        expect(mockMoveNodeAndChildrenCallback).toHaveBeenCalledWith(mockNode, 15, 15);
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
        expect(mockMoveNodeAndChildrenCallback).not.toHaveBeenCalled();
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
        expect(mockMoveNodeAndChildrenCallback).toHaveBeenCalledWith(mockNode, 15, 15);
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
        expect(mockMoveNodeAndChildrenCallback).not.toHaveBeenCalled();
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
        expect(mockMoveNodeAndChildrenCallback).not.toHaveBeenCalled();
        expect(handler.hasDragOccurred()).toBe(false);
    });

    test('handleTouchMove should return false if not dragging', () => {
        const handled = handler.handleTouchMove(new TouchEvent('touchmove', { touches: [{ clientX: 20, clientY: 20 }], bubbles: true }));
        expect(handled).toBe(false);
    });

    test('handleTouchMove should not call move callback if no incremental movement', () => {
        mockNode.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 10, clientY: 10 }], bubbles: true }));
        expect(mockMoveNodeAndChildrenCallback).not.toHaveBeenCalled();
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
});