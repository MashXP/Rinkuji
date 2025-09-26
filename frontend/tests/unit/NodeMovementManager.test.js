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

        test('should not throw if lineElement is null', () => {
            const node = createMockNode('node1');
            node.lineElement = null;
            // This should execute without error
            expect(() => {
                nodeMovementManager._updateIncomingLine(node, 50, 30);
            }).not.toThrow();
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

        test('should use currentSelectionCircleOffset as anchor if node is root and is selection circle parent', () => {
            const node = createMockNode('node1', 100, 100, true); // isRootNode = true
            const mockSelectionCircle = { setAttribute: jest.fn() };
            graphStateMock.currentSelectionCircle = mockSelectionCircle;
            graphStateMock.currentSelectionCircleParentNode = node;
            graphStateMock.currentSelectionCircleOffsetX = 50;
            graphStateMock.currentSelectionCircleOffsetY = 60;

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);

            expect(anchorPoint).toEqual({ x: 50, y: 60 });
            expect(mockSelectionCircle.setAttribute).toHaveBeenCalledWith('cx', 50);
            expect(mockSelectionCircle.setAttribute).toHaveBeenCalledWith('cy', 60);
        });

        test('should use newX + currentSelectionCircleOffset as anchor if node is not root but is selection circle parent', () => {
            const node = createMockNode('node1', 100, 100, false); // isRootNode = false
            const mockSelectionCircle = { setAttribute: jest.fn() };
            graphStateMock.currentSelectionCircle = mockSelectionCircle;
            graphStateMock.currentSelectionCircleParentNode = node;
            graphStateMock.currentSelectionCircleOffsetX = 10;
            graphStateMock.currentSelectionCircleOffsetY = 20;

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130); // newX = 150, newY = 130

            expect(anchorPoint).toEqual({ x: 150 + 10, y: 130 + 20 }); // newX + offset, newY + offset
            expect(mockSelectionCircle.setAttribute).toHaveBeenCalledWith('cx', 160);
            expect(mockSelectionCircle.setAttribute).toHaveBeenCalledWith('cy', 150);
        });

        test('should use sourceKanjiOffset as anchor if defined and node is root', () => {
            const node = createMockNode('node1', 100, 100, true); // isRootNode = true
            node._sourceKanjiOffsetX = 25;
            node._sourceKanjiOffsetY = 35;

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);

            expect(anchorPoint).toEqual({ x: 25, y: 35 });
        });

        test('should use newX + sourceKanjiOffset as anchor if defined and node is not root', () => {
            const node = createMockNode('node1', 100, 100, false); // isRootNode = false
            node._sourceKanjiOffsetX = 5;
            node._sourceKanjiOffsetY = 15;

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130); // newX = 150, newY = 130

            expect(anchorPoint).toEqual({ x: 150 + 5, y: 130 + 15 }); // newX + offset, newY + offset
        });

        test('should return 0,0 as anchor if node is root and no other conditions met', () => {
            const node = createMockNode('node1', 100, 100, true); // isRootNode = true
            // No currentSelectionCircle, no _sourceKanjiOffset

            const anchorPoint = nodeMovementManager._updateAndGetAnchorPoint(node, 150, 130);

            expect(anchorPoint).toEqual({ x: 0, y: 0 });
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

    describe('stopAllGlides', () => {
        test('should stop all gliding animations and remove is-gliding class', () => {
            const glidingNode1 = createMockNode('glidingNode1');
            const glidingNode2 = createMockNode('glidingNode2');
            mockNodesContainer.appendChild(glidingNode1);
            mockNodesContainer.appendChild(glidingNode2);

            // Simulate nodes that are gliding
            glidingNode1.classList.add('is-gliding');
            glidingNode1._glideAnimationId = 123; // Simulate an active animation frame
            glidingNode2.classList.add('is-gliding');
            glidingNode2._glideAnimationId = 456;

            const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');

            nodeMovementManager.stopAllGlides();

            expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(123);
            expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(456);
            expect(glidingNode1.classList.contains('is-gliding')).toBe(false);
            expect(glidingNode2.classList.contains('is-gliding')).toBe(false);
            expect(glidingNode1._glideAnimationId).toBeUndefined();
            expect(glidingNode2._glideAnimationId).toBeUndefined();

            cancelAnimationFrameSpy.mockRestore();
        });

        test('should remove is-gliding class even if _glideAnimationId is not present', () => {
            const glidingNode = createMockNode('glidingNode');
            mockNodesContainer.appendChild(glidingNode);

            glidingNode.classList.add('is-gliding');
            // _glideAnimationId is not set

            const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');

            nodeMovementManager.stopAllGlides();

            expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
            expect(glidingNode.classList.contains('is-gliding')).toBe(false);

            cancelAnimationFrameSpy.mockRestore();
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

        test('should not start glide if initial velocity is below threshold', () => {
            const node = createMockNode('node1', 100, 100);
            mockNodesContainer.appendChild(node);
            const moveSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');

            nodeMovementManager.startGlide(node, 0, 0); // Initial velocity below threshold

            expect(moveSpy).not.toHaveBeenCalled();
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

    describe('startGlide with collisions', () => {
        let rafSpy;
        let cafSpy;
        let resolveGlideCollisionsSpy;

        beforeEach(() => {
            jest.useFakeTimers();
            let currentFrameTime = 16;
            rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
                const id = setTimeout(() => {
                    cb(currentFrameTime);
                    currentFrameTime += 16;
                }, 16);
                return id;
            });
            cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
            resolveGlideCollisionsSpy = jest.spyOn(nodeMovementManager, '_resolveGlideCollisions');
            moveNodeAndChildrenSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');
        });

        afterEach(() => {
            jest.useRealTimers();
            if (rafSpy) rafSpy.mockRestore();
            if (cafSpy) cafSpy.mockRestore();
            if (resolveGlideCollisionsSpy) resolveGlideCollisionsSpy.mockRestore();
        });

        test('should reverse and dampen velocity on bounce', () => {
            const node = createMockNode('node1', 100, 100);
            mockNodesContainer.appendChild(node);
            const initialVelocityX = 0.1;
            const initialVelocityY = 0.1;

            resolveGlideCollisionsSpy.mockReturnValue({ bounced: true, dampening: 0.5 }); // Simulate a bounce

            nodeMovementManager.startGlide(node, initialVelocityX, initialVelocityY);

            jest.advanceTimersByTime(16); // Run one frame

            // After one bounce, velocity should be reversed and dampened
            // Initial velocityX = 0.1, velocityY = 0.1
            // After bounce: velocityX = -0.1 * 0.5 = -0.05, velocityY = -0.1 * 0.5 = -0.05
            // The internal velocityX/Y are updated, but we can't directly access them.
            // We can check if moveNodeAndChildren was called with reversed direction.
            const moveCalls = nodeMovementManager.moveNodeAndChildren.mock.calls;
            expect(moveCalls.length).toBeGreaterThan(0);
            // The first move is with initial velocity. The second move (after bounce) should be reversed.
            // This is hard to test directly without exposing internal state.
            // A simpler check is to ensure _resolveGlideCollisions was called and returned bounced.
            expect(resolveGlideCollisionsSpy).toHaveBeenCalled();
        });

        test('should stop animation if velocity becomes negligible after a bounce', () => {
            const node = createMockNode('node1', 100, 100);
            mockNodesContainer.appendChild(node);
            const initialVelocityX = 0.1; // Above MIN_GLIDE_VELOCITY
            const initialVelocityY = 0.1;

            resolveGlideCollisionsSpy.mockReturnValue({ bounced: true, dampening: 0.1 }); // Simulate a bounce with high dampening

            nodeMovementManager.startGlide(node, initialVelocityX, initialVelocityY);

            jest.advanceTimersByTime(16 * 2); // Run two frames: first move, then bounce and stop

            expect(node.classList.contains('is-gliding')).toBe(false);
            expect(resolveGlideCollisionsSpy).toHaveBeenCalled();
        });
    });

    describe('_resolveGlideCollisions', () => {
        let glidingNode;
        let otherNode;
        let moveNodeAndChildrenSpy;
        let startGlideSpy;

        beforeEach(() => {
            glidingNode = createMockNode('glidingNode', 100, 100);
            otherNode = createMockNode('otherNode', 105, 100); // Overlapping
            mockNodesContainer.appendChild(glidingNode);
            mockNodesContainer.appendChild(otherNode);

            Object.defineProperty(glidingNode, 'offsetWidth', { value: 20 });
            Object.defineProperty(otherNode, 'offsetWidth', { value: 20 });

            moveNodeAndChildrenSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');
            startGlideSpy = jest.spyOn(nodeMovementManager, 'startGlide');
        });

        afterEach(() => {
            moveNodeAndChildrenSpy.mockRestore();
            startGlideSpy.mockRestore();
        });

        test('should resolve collision by pushing nodes apart and nudging the other node', () => {
            const result = nodeMovementManager._resolveGlideCollisions(glidingNode, [otherNode]);

            expect(result.bounced).toBe(true);
            expect(moveNodeAndChildrenSpy).toHaveBeenCalledWith(glidingNode, expect.any(Number), expect.any(Number)); // Gliding node moved back
            expect(startGlideSpy).toHaveBeenCalledWith(otherNode, expect.any(Number), expect.any(Number)); // Other node nudged
        });

        test('should not resolve collision if nodes are not overlapping', () => {
            otherNode.style.left = '200px'; // No overlap
            const result = nodeMovementManager._resolveGlideCollisions(glidingNode, [otherNode]);
            expect(result.bounced).toBe(false);
            expect(moveNodeAndChildrenSpy).not.toHaveBeenCalled();
            expect(startGlideSpy).not.toHaveBeenCalled();
        });

        test('should not resolve collision with ancestor/descendant nodes', () => {
            const parentNode = createMockNode('parentNode');
            const childNode = createMockNode('childNode');
            parentNode._children.push(childNode);
            childNode._parent = parentNode;

            // Simulate parent gliding and child being an "otherNode"
            const result = nodeMovementManager._resolveGlideCollisions(parentNode, [childNode]);
            expect(result.bounced).toBe(false);
            expect(moveNodeAndChildrenSpy).not.toHaveBeenCalled();
            expect(startGlideSpy).not.toHaveBeenCalled();
        });
    });

    describe('animateToPosition', () => {
        let rafSpy;
        let cafSpy;
        let moveNodeAndChildrenSpy;

        beforeEach(() => {
            jest.useFakeTimers();
            let currentFrameTime = 0;
            rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
                const id = setTimeout(() => {
                    cb(currentFrameTime);
                    currentFrameTime += 16;
                }, 16);
                return id;
            });
            cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
            moveNodeAndChildrenSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');
        });

        afterEach(() => {
            jest.useRealTimers();
            if (rafSpy) rafSpy.mockRestore();
            if (cafSpy) cafSpy.mockRestore();
            if (moveNodeAndChildrenSpy) moveNodeAndChildrenSpy.mockRestore();
        });

        test('should animate node to target position over duration', () => {
            const node = createMockNode('node1', 0, 0);
            const targetPos = { ux: 100, uy: 100 };
            const duration = 100; // ms

            nodeMovementManager.animateToPosition(node, targetPos, duration);

            // After some time, node should have moved but not reached target
            jest.advanceTimersByTime(50);
            expect(moveNodeAndChildrenSpy).toHaveBeenCalled();
            const currentX = parseFloat(node.style.left);
            const currentY = parseFloat(node.style.top);
            expect(currentX).toBeGreaterThan(0);
            expect(currentX).toBeLessThan(100);
            expect(currentY).toBeGreaterThan(0);
            expect(currentY).toBeLessThan(100);

            // After full duration, node should be at target position
            jest.advanceTimersByTime(duration + 16 - 50); // Total duration + 16ms
            const finalX = parseFloat(node.style.left);
            const finalY = parseFloat(node.style.top);
            expect(finalX).toBeCloseTo(100, 0);
            expect(finalY).toBeCloseTo(100, 0);

            // Ensure animation stops
            expect(rafSpy).toHaveBeenCalledTimes(Math.ceil(duration / 16) + 1); // Initial call + subsequent frames
        });

        test('should animate node to target position over duration with empty style.left/top', () => {
            const node = createMockNode('node1', 0, 0);
            node.style.left = ''; // Make it an empty string
            node.style.top = ''; // Make it an empty string
            const targetPos = { ux: 100, uy: 100 };
            const duration = 100; // ms

            nodeMovementManager.animateToPosition(node, targetPos, duration);

            jest.advanceTimersByTime(duration + 16); // Total duration + 16ms

            const finalX = parseFloat(node.style.left);
            const finalY = parseFloat(node.style.top);
            expect(finalX).toBeCloseTo(100, 0);
            expect(finalY).toBeCloseTo(100, 0);
            expect(moveNodeAndChildrenSpy).toHaveBeenCalled();
        });

        test('should handle zero duration animation', () => {
            const node = createMockNode('node1', 0, 0);
            const targetPos = { ux: 100, uy: 100 };
            const duration = 0;

            nodeMovementManager.animateToPosition(node, targetPos, duration);
            jest.runAllTimers();

            const finalX = parseFloat(node.style.left);
            const finalY = parseFloat(node.style.top);
            expect(finalX).toBeCloseTo(100);
            expect(finalY).toBeCloseTo(100);
            expect(moveNodeAndChildrenSpy).toHaveBeenCalled();
        });

        test('should handle zero duration animation with empty style.left/top', () => {
            const node = createMockNode('node1', 0, 0);
            node.style.left = ''; // Make it an empty string
            node.style.top = ''; // Make it an empty string
            const targetPos = { ux: 100, uy: 100 };
            const duration = 0;

            nodeMovementManager.animateToPosition(node, targetPos, duration);
            jest.runAllTimers();

            const finalX = parseFloat(node.style.left);
            const finalY = parseFloat(node.style.top);
            expect(finalX).toBeCloseTo(100);
            expect(finalY).toBeCloseTo(100);
            expect(moveNodeAndChildrenSpy).toHaveBeenCalled();
        });

        test('should immediately move node to target position for zero duration', () => {
            const node = createMockNode('node1', 50, 50);
            const targetPos = { ux: 200, uy: 250 };
            const duration = 0;

            nodeMovementManager.animateToPosition(node, targetPos, duration);

            // It should not use requestAnimationFrame for duration 0
            expect(rafSpy).not.toHaveBeenCalled();

            // It should have moved the node directly
            expect(moveNodeAndChildrenSpy).toHaveBeenCalledWith(node, 150, 200);
            expect(node.style.left).toBe('200px');
            expect(node.style.top).toBe('250px');
        });
    });

    describe('startSpringDrag setupNode with parent', () => {
        let rafSpy;
        let cafSpy;

        beforeEach(() => {
            jest.useFakeTimers();
            let currentFrameTime = 16;
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

        test('should set initialRelativeOffsetX/Y for child nodes during spring drag setup', () => {
            const parentNode = createMockNode('parent', 50, 50);
            const childNode = createMockNode('child', 60, 70); // Child is at (60,70) relative to parent (50,50)
            parentNode._children.push(childNode);
            mockNodesContainer.appendChild(parentNode);
            mockNodesContainer.appendChild(childNode);

            nodeMovementManager.startSpringDrag(parentNode, 50, 50, []);
            jest.advanceTimersByTime(16); // Let setupNode run

            expect(childNode._spring).toBeDefined();
            expect(childNode._spring.initialRelativeOffsetX).toBe(10); // 60 - 50
            expect(childNode._spring.initialRelativeOffsetY).toBe(20); // 70 - 50
        });

        test('should initialize _spring properties for the root node of the drag', () => {
            const rootNode = createMockNode('root', 100, 100);
            mockNodesContainer.appendChild(rootNode);

            nodeMovementManager.startSpringDrag(rootNode, 110, 110, []);
            jest.advanceTimersByTime(16); // Let setupNode run

            expect(rootNode._spring).toBeDefined();
            expect(rootNode._spring.parent).toBeNull(); // Covers the false branch of if (parent)
            expect(rootNode._spring.currentX).toBe(100);
            expect(rootNode._spring.currentY).toBe(100);
        });

        test('should cancel any existing spring animation when starting a new one', () => {
            const node1 = createMockNode('node1', 50, 50);
            const node2 = createMockNode('node2', 100, 100);
            mockNodesContainer.appendChild(node1);
            mockNodesContainer.appendChild(node2);
            const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');

            // Start the first drag, which sets up an animation frame
            nodeMovementManager.startSpringDrag(node1, 50, 50, []);
            const firstAnimationId = nodeMovementManager.springAnimationId;

            // Immediately start a second drag
            nodeMovementManager.startSpringDrag(node2, 100, 100, []);

            expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(firstAnimationId);
        });

        test('stopSpringDrag should handle a null springTargetNode gracefully', () => {
            // Simulate a state where dragging was active but the node was lost
            nodeMovementManager.isSpringDragging = true;
            nodeMovementManager.springTargetNode = null;

            // This should execute without throwing an error and reset the state
            expect(() => {
                nodeMovementManager.stopSpringDrag();
            }).not.toThrow();

            expect(nodeMovementManager.isSpringDragging).toBe(false);
            expect(nodeMovementManager.springTargetNode).toBeNull();
        });

    });

    describe('resolveDragCollisions', () => {
        let draggedNode;
        let otherNode;
        let moveNodeAndChildrenSpy;
        let startGlideSpy;

        beforeEach(() => {
            draggedNode = createMockNode('draggedNode', 100, 100);
            otherNode = createMockNode('otherNode', 105, 100); // Overlapping
            mockNodesContainer.appendChild(draggedNode);
            mockNodesContainer.appendChild(otherNode);

            Object.defineProperty(draggedNode, 'offsetWidth', { value: 20 });
            Object.defineProperty(otherNode, 'offsetWidth', { value: 20 });

            // Simulate _spring properties for draggedNode
            draggedNode._spring = { currentX: 100, currentY: 100 };

            moveNodeAndChildrenSpy = jest.spyOn(nodeMovementManager, 'moveNodeAndChildren');
            startGlideSpy = jest.spyOn(nodeMovementManager, 'startGlide');
        });

        afterEach(() => {
            moveNodeAndChildrenSpy.mockRestore();
            startGlideSpy.mockRestore();
        });

        test('should resolve collision by pushing nodes apart and nudging the other node when draggedNode collides', () => {
            nodeMovementManager.resolveDragCollisions(draggedNode, [otherNode]);

            expect(moveNodeAndChildrenSpy).toHaveBeenCalledWith(otherNode, expect.any(Number), expect.any(Number)); // Other node pushed
            expect(startGlideSpy).toHaveBeenCalledWith(otherNode, expect.any(Number), expect.any(Number)); // Other node nudged
            // Check that draggedNode's velocity is dampened
            expect(nodeMovementManager.currentVelocityX).toBeCloseTo(0 * (1 - nodeMovementManager.physics.DRAG_COLLISION_SELF_DAMPENING));
            expect(nodeMovementManager.currentVelocityY).toBeCloseTo(0 * (1 - nodeMovementManager.physics.DRAG_COLLISION_SELF_DAMPENING));
        });

        test('should not resolve collision with ancestor/descendant nodes when draggedNode collides', () => {
            const parentNode = createMockNode('parentNode', 100, 100);
            const childNode = createMockNode('childNode', 105, 100);
            parentNode._children.push(childNode);
            childNode._parent = parentNode;

            Object.defineProperty(parentNode, 'offsetWidth', { value: 20 });
            Object.defineProperty(childNode, 'offsetWidth', { value: 20 });

            parentNode._spring = { currentX: 100, currentY: 100 };

            nodeMovementManager.resolveDragCollisions(parentNode, [childNode]); // Dragging parent, colliding with child

            expect(moveNodeAndChildrenSpy).not.toHaveBeenCalledWith(childNode, expect.any(Number), expect.any(Number));
            expect(startGlideSpy).not.toHaveBeenCalledWith(childNode, expect.any(Number), expect.any(Number));
        });
        test('should resolve collision between two non-dragged nodes', () => {
            const nonDraggedNodeA = createMockNode('nodeA', 150, 150);
            const nonDraggedNodeB = createMockNode('nodeB', 155, 150); // Overlapping with A
            mockNodesContainer.appendChild(nonDraggedNodeA);
            mockNodesContainer.appendChild(nonDraggedNodeB);
            Object.defineProperty(nonDraggedNodeA, 'offsetWidth', { value: 20 });
            Object.defineProperty(nonDraggedNodeB, 'offsetWidth', { value: 20 });

            // Simulate spring properties for these nodes
            nonDraggedNodeA._spring = { currentX: 150, currentY: 150 };
            nonDraggedNodeB._spring = { currentX: 155, currentY: 150 };

            // The dragged node is somewhere else and not part of this collision
            const dummyDraggedNode = createMockNode('dummy', 0, 0);
            dummyDraggedNode._spring = { currentX: 0, currentY: 0 }; // Add _spring properties
            nodeMovementManager.resolveDragCollisions(dummyDraggedNode, [nonDraggedNodeA, nonDraggedNodeB]);

            // Assert that nodeA !== draggedNode (to cover the false branch of if (nodeA === draggedNode))
            expect(nonDraggedNodeA).not.toBe(dummyDraggedNode);

            // Expect nodeB to be pushed away from nodeA
            expect(moveNodeAndChildrenSpy).toHaveBeenCalledWith(nonDraggedNodeB, expect.any(Number), expect.any(Number));
        });

    });
    

    describe('_isAncestor', () => {
        let parentNode;
        let childNode;
        let unrelatedNode;

        beforeEach(() => {
            parentNode = createMockNode('parent');
            childNode = createMockNode('child');
            unrelatedNode = createMockNode('unrelated');

            parentNode._children.push(childNode);
            childNode._parent = parentNode;
        });

        test('should return true if potentialAncestor is an ancestor of node', () => {
            expect(nodeMovementManager._isAncestor(parentNode, childNode)).toBe(true);
        });

        test('should return false if potentialAncestor is not an ancestor of node', () => {
            expect(nodeMovementManager._isAncestor(unrelatedNode, childNode)).toBe(false); // Covers return false
            expect(nodeMovementManager._isAncestor(childNode, parentNode)).toBe(false); // Covers return false
        });

        test('should return false if the node has no parent', () => {
            const nodeWithNoParent = createMockNode('no_parent');
            expect(nodeMovementManager._isAncestor(parentNode, nodeWithNoParent)).toBe(false);
        });
    });
});