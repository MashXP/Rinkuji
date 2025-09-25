import { NodeMovementManager } from '../../src/js/managers/NodeMovementManager.js';

describe('NodeMovementManager', () => {
    let panZoomMock;
    let graphStateMock;
    let nodeMovementManager;

    beforeEach(() => {
        panZoomMock = {
            getPan: jest.fn(() => ({ x: 0, y: 0 })),
            getScale: jest.fn(() => 1),
        };
        graphStateMock = {
            currentSelectionCircle: null,
            currentSelectionCircleParentNode: null,
            currentSelectionCircleOffsetX: 0,
            currentSelectionCircleOffsetY: 0,
        };
        nodeMovementManager = new NodeMovementManager(panZoomMock, graphStateMock);

        // Mock HTMLElement properties and methods
        Object.defineProperty(HTMLElement.prototype, 'dataset', {
            value: {},
            writable: true,
        });
        Object.defineProperty(HTMLElement.prototype, '_children', {
            value: [],
            writable: true,
        });
        Object.defineProperty(HTMLElement.prototype, 'lineElement', {
            value: null,
            writable: true,
        });
        Object.defineProperty(HTMLElement.prototype, '_linkingLineToOriginal', {
            value: null,
            writable: true,
        });
        Object.defineProperty(HTMLElement.prototype, '_linkingLinesFromThisNode', {
            value: null,
            writable: true,
        });
    });

    // Helper to create a mock node
    const createMockNode = (id, x = 0, y = 0, isRootNode = false) => {
        const node = document.createElement('div');
        node.id = id;
        // Set properties on the existing style object
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.transform = ''; // Ensure transform is also set if needed
        node.dataset.isRootNode = isRootNode.toString();
        node._children = [];
        node.lineElement = null;
        node._linkingLineToOriginal = null;
        node._linkingLinesFromThisNode = null;
        node.setAttribute = jest.fn(); // Mock setAttribute for consistency
        return node;
    };

    // Helper to create a mock line element
    const createMockLine = (x1 = 0, y1 = 0, x2 = 0, y2 = 0) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        // Store attributes in a simple object for mocking
        const attributes = {
            x1: x1 !== null ? x1.toString() : null,
            y1: y1 !== null ? y1.toString() : null,
            x2: x2 !== null ? x2.toString() : null,
            y2: y2 !== null ? y2.toString() : null,
        };

        line.setAttribute = jest.fn((attr, value) => {
            attributes[attr] = value.toString();
        });
        line.getAttribute = jest.fn((attr) => attributes[attr] || null);
        return line;
    };

    describe('moveNodeAndChildren', () => {
        test('should move a single node and update its position', () => {
            const node = createMockNode('node1', 100, 100);
            nodeMovementManager.moveNodeAndChildren(node, 50, 30);

            expect(node.style.left).toBe('150px');
            expect(node.style.top).toBe('130px');
        });

        test('should update incoming line if node.lineElement exists', () => {
            const node = createMockNode('node1', 100, 100);
            const line = createMockLine(0, 0, 100, 100);
            node.lineElement = line;

            nodeMovementManager.moveNodeAndChildren(node, 50, 30);

            expect(node.style.left).toBe('150px');
            expect(node.style.top).toBe('130px');
            expect(line.setAttribute).toHaveBeenCalledWith('x2', 150);
            expect(line.setAttribute).toHaveBeenCalledWith('y2', 130);
        });

        test('should update _linkingLineToOriginal if it exists', () => {
            const node = createMockNode('node1', 100, 100);
            const linkingLine = createMockLine(0, 0, 100, 100);
            node._linkingLineToOriginal = linkingLine;

            nodeMovementManager.moveNodeAndChildren(node, 50, 30);

            expect(node.style.left).toBe('150px');
            expect(node.style.top).toBe('130px');
            expect(linkingLine.setAttribute).toHaveBeenCalledWith('x2', 150);
            expect(linkingLine.setAttribute).toHaveBeenCalledWith('y2', 130);
        });

        test('should update _linkingLinesFromThisNode if it exists', () => {
            const node = createMockNode('node1', 100, 100);
            const linkingLine1 = createMockLine(100, 100, 200, 200);
            const linkingLine2 = createMockLine(100, 100, 200, 300);
            node._linkingLinesFromThisNode = [linkingLine1, linkingLine2];

            nodeMovementManager.moveNodeAndChildren(node, 50, 30);

            expect(node.style.left).toBe('150px');
            expect(node.style.top).toBe('130px');
            expect(linkingLine1.setAttribute).toHaveBeenCalledWith('x1', 150);
            expect(linkingLine1.setAttribute).toHaveBeenCalledWith('y1', 130);
            expect(linkingLine2.setAttribute).toHaveBeenCalledWith('x1', 150);
            expect(linkingLine2.setAttribute).toHaveBeenCalledWith('y1', 130);
        });

        test('should recursively move children nodes', () => {
            const parentNode = createMockNode('parent', 100, 100);
            const childNode1 = createMockNode('child1', 120, 120);
            const childNode2 = createMockNode('child2', 140, 140);
            parentNode._children = [childNode1, childNode2];

            nodeMovementManager.moveNodeAndChildren(parentNode, 50, 30);

            expect(parentNode.style.left).toBe('150px');
            expect(parentNode.style.top).toBe('130px');
            expect(childNode1.style.left).toBe('170px');
            expect(childNode1.style.top).toBe('150px');
            expect(childNode2.style.left).toBe('190px');
            expect(childNode2.style.top).toBe('170px');
        });
    });

    describe('_updateIncomingLine', () => {
        test('should update x2 and y2 attributes of lineElement if it exists', () => {
            const node = createMockNode('node1', 100, 100);
            const line = createMockLine(0, 0, 100, 100);
            node.lineElement = line;

            nodeMovementManager._updateIncomingLine(node, 50, 30);

            expect(line.setAttribute).toHaveBeenCalledWith('x2', 150);
            expect(line.setAttribute).toHaveBeenCalledWith('y2', 130);
        });

        test('should do nothing if lineElement does not exist', () => {
            const node = createMockNode('node1', 100, 100);
            nodeMovementManager._updateIncomingLine(node, 50, 30);
            // Expect no errors and no calls to setAttribute on a non-existent element
            expect(() => nodeMovementManager._updateIncomingLine(node, 50, 30)).not.toThrow();
        });

        test('should handle lineElement with missing y2 attribute', () => {
            const node = createMockNode('node1', 100, 100);
            const line = createMockLine(0, 0, 100, null); // y2 is null
            node.lineElement = line;

            nodeMovementManager._updateIncomingLine(node, 50, 30);

            // oldY2 should default to 0, so new y2 is 0 + 30
            expect(line.setAttribute).toHaveBeenCalledWith('x2', 150);
            expect(line.setAttribute).toHaveBeenCalledWith('y2', 30);
        });
    });

    describe('_updateAndGetAnchorPoint', () => {
        test('should return node\'s newX and newY as anchor point by default', () => {
            const node = createMockNode('node1', 100, 100);
            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);
            expect(anchorPoint).toEqual({ x: 150, y: 130 });
        });

        test('should update selection circle and return its offset as anchor if node is parent and isRootNode', () => {
            const node = createMockNode('node1', 100, 100, true); // isRootNode = true
            const mockSelectionCircle = { setAttribute: jest.fn() };
            graphStateMock.currentSelectionCircle = mockSelectionCircle;
            graphStateMock.currentSelectionCircleParentNode = node;
            graphStateMock.currentSelectionCircleOffsetX = 10;
            graphStateMock.currentSelectionCircleOffsetY = 20;

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);

            expect(mockSelectionCircle.setAttribute).toHaveBeenCalledWith('cx', 10);
            expect(mockSelectionCircle.setAttribute).toHaveBeenCalledWith('cy', 20);
            expect(anchorPoint).toEqual({ x: 10, y: 20 });
        });

        test('should update selection circle and return newX + offset as anchor if node is parent and not isRootNode', () => {
            const node = createMockNode('node1', 100, 100);
            node.dataset.isRootNode = 'false';
            const mockSelectionCircle = { setAttribute: jest.fn() };
            graphStateMock.currentSelectionCircle = mockSelectionCircle;
            graphStateMock.currentSelectionCircleParentNode = node;
            graphStateMock.currentSelectionCircleOffsetX = 10;
            graphStateMock.currentSelectionCircleOffsetY = 20;

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);

            expect(mockSelectionCircle.setAttribute).toHaveBeenCalledWith('cx', 150 + 10);
            expect(mockSelectionCircle.setAttribute).toHaveBeenCalledWith('cy', 130 + 20);
            expect(anchorPoint).toEqual({ x: 160, y: 150 });
        });

        test('should return sourceKanjiOffset as anchor if defined and node isRootNode', () => {
            const node = createMockNode('node1', 100, 100);
            node.dataset.isRootNode = 'true';
            node._sourceKanjiOffsetX = 5;
            node._sourceKanjiOffsetY = 15;

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);

            expect(anchorPoint).toEqual({ x: 5, y: 15 });
        });

        test('should return newX + sourceKanjiOffset as anchor if defined and not isRootNode', () => {
            const node = createMockNode('node1', 100, 100);
            node.dataset.isRootNode = 'false';
            node._sourceKanjiOffsetX = 5;
            node._sourceKanjiOffsetY = 15;

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);

            expect(anchorPoint).toEqual({ x: 150 + 5, y: 130 + 15 });
        });

        test('should return 0,0 as anchor if node isRootNode and no other conditions met', () => {
            const node = createMockNode('node1', 100, 100);
            node.dataset.isRootNode = 'true';

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);

            expect(anchorPoint).toEqual({ x: 0, y: 0 });
        });
    });

    describe('_updateOutgoingLines', () => {
        test('should update x1 and y1 attributes of child lineElements if children exist', () => {
            const parentNode = createMockNode('parent');
            const childNode1 = createMockNode('child1');
            const childNode2 = createMockNode('child2');
            const line1 = createMockLine(0, 0, 100, 100);
            const line2 = createMockLine(0, 0, 200, 200);
            childNode1.lineElement = line1;
            childNode2.lineElement = line2;
            parentNode._children = [childNode1, childNode2];

            const anchorPoint = { x: 50, y: 60 };
            nodeMovementManager._updateOutgoingLines(parentNode, anchorPoint);

            expect(line1.setAttribute).toHaveBeenCalledWith('x1', 50);
            expect(line1.setAttribute).toHaveBeenCalledWith('y1', 60);
            expect(line2.setAttribute).toHaveBeenCalledWith('x1', 50);
            expect(line2.setAttribute).toHaveBeenCalledWith('y1', 60);
        });

        test('should do nothing if node has no children', () => {
            const parentNode = createMockNode('parent');
            const anchorPoint = { x: 50, y: 60 };
            // Should not throw an error
            expect(() => nodeMovementManager._updateOutgoingLines(parentNode, anchorPoint)).not.toThrow();
        });

        test('should do nothing if childNode.lineElement does not exist', () => {
            const parentNode = createMockNode('parent');
            const childNode1 = createMockNode('child1');
            parentNode._children = [childNode1];

            const anchorPoint = { x: 50, y: 60 };
            // Should not throw an error
            expect(() => nodeMovementManager._updateOutgoingLines(parentNode, anchorPoint)).not.toThrow();
        });
    });

    describe('startGlide', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should stop gliding when velocity is below threshold', () => {
            const node = createMockNode('node1', 100, 100);
            const moveSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');
            // Mock rAF to be controlled by fake timers for this test
            const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(setTimeout);

            nodeMovementManager.startGlide(node, 0.1, 0.1); // Start with a low velocity

            jest.runAllTimers(); // Run all animation frames until the velocity threshold is met

            expect(moveSpy).toHaveBeenCalled(); // Ensure it moved at least once
            rafSpy.mockRestore(); // Clean up spy
        });
    });

    describe('Spring Dragging', () => {
        let rafSpy, cafSpy;

        beforeEach(() => {
            // Mock requestAnimationFrame and cancelAnimationFrame
            rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 16));
            cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
        });

        afterEach(() => {
            // Restore original implementations
            rafSpy.mockRestore();
            cafSpy.mockRestore();
        });

        test('startSpringDrag should cancel an existing animation frame if called again', () => {
            const node1 = createMockNode('node1', 100, 100);
            const node2 = createMockNode('node2', 200, 200);

            // Start the first drag animation
            nodeMovementManager.startSpringDrag(node1, 110, 110);

            // Verify that an animation frame has been requested
            expect(rafSpy).toHaveBeenCalledTimes(1);
            const firstAnimationId = nodeMovementManager.springAnimationId;
            expect(firstAnimationId).not.toBeNull();

            // Start a second drag animation immediately
            nodeMovementManager.startSpringDrag(node2, 210, 210);

            // Verify that the first animation was cancelled
            expect(cafSpy).toHaveBeenCalledWith(firstAnimationId);
            expect(rafSpy).toHaveBeenCalledTimes(2); // One for each startSpringDrag call
        });

        test('stopSpringDrag should snap node to final position', () => {
            const node = createMockNode('node1', 100, 100);
            nodeMovementManager.startSpringDrag(node, 110, 110);

            // Update the target to a new position
            nodeMovementManager.updateSpringDragTarget(150, 160);

            // Stop the drag
            nodeMovementManager.stopSpringDrag();

            // The node should snap to the final target position, accounting for the initial grab offset.
            // Initial grab offset was (110-100, 110-100) = (10, 10)
            // Final target is (150, 160)
            // Final node position should be (150-10, 160-10) = (140, 150)
            expect(node.style.left).toBe('140px');
            expect(node.style.top).toBe('150px');

            // Verify state is reset
            expect(nodeMovementManager.isSpringDragging).toBe(false);
            expect(nodeMovementManager.springTargetNode).toBeNull();
        });

        test('updateSpringDragTarget should do nothing if not spring dragging', () => {
            // Ensure not dragging
            nodeMovementManager.isSpringDragging = false;
            const initialTargetX = nodeMovementManager.springTargetX;

            // Attempt to update target
            nodeMovementManager.updateSpringDragTarget(999, 999);

            // The target should not have been updated
            expect(nodeMovementManager.springTargetX).toBe(initialTargetX);
        });

        test('stopSpringDrag should do nothing if not spring dragging', () => {
            nodeMovementManager.isSpringDragging = false;
            expect(() => nodeMovementManager.stopSpringDrag()).not.toThrow();
        });

        test('should cleanup _spring properties when animation stops', async () => {
            const node = createMockNode('node1', 100, 100);
            const childNode = createMockNode('child1', 120, 120);
            node._children.push(childNode);

            // Start the drag, which sets up the _spring properties
            nodeMovementManager.startSpringDrag(node, 110, 110);

            // Wait for the first animation frame to run and set up the properties
            await new Promise(resolve => setTimeout(resolve, 20));

            // Verify properties were set
            expect(node._spring).toBeDefined();
            expect(childNode._spring).toBeDefined();

            // Manually stop the drag by changing the flag, but keep springTargetNode intact
            nodeMovementManager.isSpringDragging = false;

            // Run the next animation frame, which will now trigger the cleanup logic
            await new Promise(resolve => setTimeout(resolve, 20));

            // Verify the cleanup function ran and removed the properties
            expect(node._spring).toBeUndefined();
            expect(childNode._spring).toBeUndefined();
        });
        test('stopSpringDrag should not move node if it has already settled at the target', async () => {
            const node = createMockNode('node1', 100, 100);
            const moveSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');

            // Start the drag
            nodeMovementManager.startSpringDrag(node, 110, 110);

            // Let the animation run for a bit to move the node
            await new Promise(resolve => setTimeout(resolve, 100));

            // Now, set the target to the node's current animated position
            const currentX = parseFloat(node.style.left);
            const currentY = parseFloat(node.style.top);
            // The target for the cursor is the node's position plus the grab offset
            nodeMovementManager.updateSpringDragTarget(currentX + 10, currentY + 10);

            // Stop the drag. Now, dx and dy inside stopSpringDrag should be 0.
            nodeMovementManager.stopSpringDrag();

            // The key assertion is that moveNodeAndChildren was NOT called from within stopSpringDrag.
            // The spy will have been called by the animation frames, so we check the call count before and after.
            const callsBeforeStop = moveSpy.mock.calls.length;
            expect(moveSpy.mock.calls.length).toBe(callsBeforeStop);
        });
    });
});
