import { NodeMovementManager } from '../../src/js/managers/NodeMovementManager.js';

describe('NodeMovementManager', () => {
    let panZoomMock;
    let graphStateMock;
    let nodeMovementManager;
    let mockNodesContainer;

    // Helper to create a mock node
    const createMockNode = (id, x = 0, y = 0, isRootNode = false) => {
        const node = document.createElement('div');
        node.id = id;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        Object.defineProperty(node, 'offsetWidth', { configurable: true, value: 10 });
        Object.defineProperty(node, 'offsetHeight', { configurable: true, value: 10 });
        node.dataset.isRootNode = String(isRootNode);
        node._children = [];
        node._parent = null;
        node.lineElement = null;
        node._linkingLineToOriginal = null;
        node._linkingLinesFromThisNode = [];
        // Mock setAttribute for line elements
        node.setAttribute = jest.fn();
        return node;
    };

    // Helper to create a mock line element
    const createMockLine = (x1 = 0, y1 = 0, x2 = 0, y2 = 0) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const attributes = {
            x1: String(x1),
            y1: String(y1),
            x2: String(x2),
            y2: String(y2),
        };
        line.setAttribute = jest.fn((attr, value) => {
            attributes[attr] = String(value);
        });
        line.getAttribute = jest.fn((attr) => attributes[attr]);
        return line;
    };

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
        mockNodesContainer = document.createElement('div');
        document.body.appendChild(mockNodesContainer);
        nodeMovementManager = new NodeMovementManager(mockNodesContainer, panZoomMock, graphStateMock);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

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
            expect(line.getAttribute('x2')).toBe('150');
            expect(line.getAttribute('y2')).toBe('130');
        });

        test('should update _linkingLineToOriginal if it exists', () => {
            const node = createMockNode('node1', 100, 100);
            const linkingLine = createMockLine(0, 0, 100, 100);
            node._linkingLineToOriginal = linkingLine;
            nodeMovementManager.moveNodeAndChildren(node, 50, 30);
            expect(linkingLine.getAttribute('x2')).toBe('150');
            expect(linkingLine.getAttribute('y2')).toBe('130');
        });

        test('should update _linkingLinesFromThisNode if it exists', () => {
            const node = createMockNode('node1', 100, 100);
            const linkingLine1 = createMockLine(100, 100, 200, 200);
            const linkingLine2 = createMockLine(100, 100, 200, 300);
            node._linkingLinesFromThisNode = [linkingLine1, linkingLine2];
            nodeMovementManager.moveNodeAndChildren(node, 50, 30);
            expect(linkingLine1.getAttribute('x1')).toBe('150');
            expect(linkingLine1.getAttribute('y1')).toBe('130');
            expect(linkingLine2.getAttribute('x1')).toBe('150');
            expect(linkingLine2.getAttribute('y1')).toBe('130');
        });

        test('should recursively move children nodes', () => {
            const parentNode = createMockNode('parent', 100, 100);
            const childNode1 = createMockNode('child1', 120, 120);
            const childNode2 = createMockNode('child2', 140, 140);
            parentNode._children = [childNode1, childNode2];
            childNode1._parent = parentNode;
            childNode2._parent = parentNode;
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
        test('should update x2 and y2 attributes of lineElement', () => {
            const node = createMockNode('node1');
            const line = createMockLine(0, 0, 100, 100);
            node.lineElement = line;
            nodeMovementManager._updateIncomingLine(node, 50, 30);
            expect(line.getAttribute('x2')).toBe('150');
            expect(line.getAttribute('y2')).toBe('130');
        });

        test('should handle lineElement with missing attributes', () => {
            const node = createMockNode('node1');
            const line = createMockLine(0, 0, null, null);
            node.lineElement = line;
            nodeMovementManager._updateIncomingLine(node, 50, 30);
            expect(line.getAttribute('x2')).toBe('50');
            expect(line.getAttribute('y2')).toBe('30');
        });
    });

    describe('_updateAndGetAnchorPoint', () => {
        test('should return new position as anchor by default', () => {
            const node = createMockNode('node1');
            const anchor = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);
            expect(anchor).toEqual({ x: 150, y: 130 });
        });

        test('should handle root node selection circle', () => {
            const node = createMockNode('node1', 100, 100, true);
            const circle = { setAttribute: jest.fn() };
            graphStateMock.currentSelectionCircle = circle;
            graphStateMock.currentSelectionCircleParentNode = node;
            graphStateMock.currentSelectionCircleOffsetX = 10;
            graphStateMock.currentSelectionCircleOffsetY = 20;
            const anchor = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);
            expect(circle.setAttribute).toHaveBeenCalledWith('cx', 10);
            expect(circle.setAttribute).toHaveBeenCalledWith('cy', 20);
            expect(anchor).toEqual({ x: 10, y: 20 });
        });
    });

    describe('_updateOutgoingLines', () => {
        test('should update outgoing lines for children', () => {
            const parent = createMockNode('parent');
            const child = createMockNode('child');
            const line = createMockLine();
            child.lineElement = line;
            parent._children = [child];
            nodeMovementManager._updateOutgoingLines(parent, { x: 50, y: 60 });
            expect(line.getAttribute('x1')).toBe('50');
            expect(line.getAttribute('y1')).toBe('60');
        });
    });

    describe('startGlide', () => {
        let rafSpy;
        let cafSpy;

        beforeEach(() => {
            jest.useFakeTimers();
            let currentFrameTime = 16; // Start at 16 for the first frame
            rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
                const id = setTimeout(() => {
                    cb(currentFrameTime);
                    currentFrameTime += 16;
                }, 16);
                return id;
            });
            cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
        });

        afterEach(() => {
            jest.useRealTimers();
            if (rafSpy) rafSpy.mockRestore();
            if (cafSpy) cafSpy.mockRestore();
        });

        test('should initiate glide and stop when velocity is below threshold', () => {
            const node = createMockNode('node1', 100, 100);
            mockNodesContainer.appendChild(node);
            const moveSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');

            // Start with velocity that will decay
            nodeMovementManager.startGlide(node, 0.1, 0.1);

            expect(node.classList.contains('is-gliding')).toBe(true);

            // Run all animation frames
            jest.runAllTimers();

            expect(moveSpy).toHaveBeenCalled();
            // After all timers, velocity should be below threshold and glide should stop
            expect(node.classList.contains('is-gliding')).toBe(false);
        });

        test('should cap initial velocity to MAX_GLIDE_VELOCITY', () => {
            const node = createMockNode('node1', 100, 100);
            mockNodesContainer.appendChild(node);
            nodeMovementManager.physics.MAX_GLIDE_VELOCITY = 0.5;

            const moveSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');

            nodeMovementManager.startGlide(node, 10, 10);

            jest.advanceTimersByTime(16);

            const firstCallArgs = moveSpy.mock.calls[0];
            const dx = firstCallArgs[1];
            const dy = firstCallArgs[2];
            const movedDistance = Math.sqrt(dx * dx + dy * dy);

            const maxDistancePerFrame = nodeMovementManager.physics.MAX_GLIDE_VELOCITY * 16;
            expect(movedDistance).toBeCloseTo(maxDistancePerFrame, 0);

            jest.runAllTimers();
        });
    });

    describe('Spring Dragging', () => {
        let rafSpy;
        let cafSpy;

        beforeEach(() => {
            jest.useFakeTimers();
            let currentFrameTime = 16; // Start at 16 for the first frame
            rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
                const id = setTimeout(() => {
                    cb(currentFrameTime);
                    currentFrameTime += 16;
                }, 16);
                return id;
            });
            cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
        });

        afterEach(() => {
            jest.useRealTimers();
            if (rafSpy) rafSpy.mockRestore();
            if (cafSpy) cafSpy.mockRestore();
        });

        test('startSpringDrag should initiate a spring animation', () => {
            const node = createMockNode('node1', 100, 100);
            node._children = [];
            mockNodesContainer.appendChild(node);

            nodeMovementManager.startSpringDrag(node, 110, 110, []);
            expect(nodeMovementManager.isSpringDragging).toBe(true);
            expect(nodeMovementManager.springTargetNode).toBe(node);
            expect(window.requestAnimationFrame).toHaveBeenCalled();
        });

        test('updateSpringDragTarget should update the target coordinates', () => {
            const node = createMockNode('node1', 100, 100);
            node._children = [];
            mockNodesContainer.appendChild(node);

            nodeMovementManager.startSpringDrag(node, 110, 110, []);
            nodeMovementManager.updateSpringDragTarget(200, 250);

            expect(nodeMovementManager.springTargetX).toBe(200);
            expect(nodeMovementManager.springTargetY).toBe(250);
        });

        test('stopSpringDrag should stop the animation and reset state', () => {
            const node = createMockNode('node1', 100, 100);
            node._children = [];
            mockNodesContainer.appendChild(node);

            nodeMovementManager.startSpringDrag(node, 110, 110, []);
            nodeMovementManager.stopSpringDrag();

            expect(nodeMovementManager.isSpringDragging).toBe(false);
            expect(nodeMovementManager.springTargetNode).toBeNull();
        });

        test('node should move towards target during spring drag', () => {
            const node = createMockNode('node1', 100, 100);
            node._children = [];
            mockNodesContainer.appendChild(node);

            nodeMovementManager.startSpringDrag(node, 110, 110, []);
            // The target for the node is (targetX - grabOffsetX)
            // grabOffset is (10, 10). targetX is 110. So node target is 100. It's already there.
            // Let's update target.
            nodeMovementManager.updateSpringDragTarget(210, 210);
            // Node target is now (210-10, 210-10) = (200, 200).

            // Run a few frames
            jest.advanceTimersByTime(16 * 5);

            const left = parseFloat(node.style.left);
            const top = parseFloat(node.style.top);

            // It should have moved from 100 towards 200, but not reached it yet.
            expect(left).toBeGreaterThan(100);
            expect(left).toBeLessThan(200);
            expect(top).toBeGreaterThan(100);
            expect(top).toBeLessThan(200);

            // Run all timers to let it settle
            jest.advanceTimersByTime(5000); // Use advanceTimersByTime instead of runAllTimers

            const finalLeft = parseFloat(node.style.left);
            const finalTop = parseFloat(node.style.top);

            // It should be very close to the target
            expect(finalLeft).toBeCloseTo(200, 0);
            expect(finalTop).toBeCloseTo(200, 0);
        });

        test('should cleanup _spring properties when animation stops', () => {
            const node = createMockNode('node1', 100, 100);
            const childNode = createMockNode('child1', 120, 120);
            node._children.push(childNode);
            mockNodesContainer.appendChild(node);
            mockNodesContainer.appendChild(childNode);

            nodeMovementManager.startSpringDrag(node, 110, 110, []);
            jest.advanceTimersByTime(16); // let it setup

            expect(node._spring).toBeDefined();
            expect(childNode._spring).toBeDefined();

            nodeMovementManager.stopSpringDrag();
            jest.advanceTimersByTime(16); // let it cleanup

            expect(node._spring).toBeUndefined();
            expect(childNode._spring).toBeUndefined();
        });
    });
});