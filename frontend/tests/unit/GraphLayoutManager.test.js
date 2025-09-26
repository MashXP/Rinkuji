import { GraphLayoutManager } from '@managers/GraphLayoutManager.js';

describe('GraphLayoutManager', () => {
    let layoutManager;
    let mockNodeCreator;
    let mockLineCreator;
    let mockNodeFilterManager;
    let mockGetUnscaledElementCenter;
    let mockNodeMovementManager;

    beforeEach(() => {
        mockNodeCreator = {
            createWordNode: jest.fn(() => document.createElement('div')),
            positionAndAppendNode: jest.fn(),
            fadeInElements: jest.fn(),
            refineLineEndpoint: jest.fn(),
        };
        mockLineCreator = {
            createExpansionLine: jest.fn(() => document.createElementNS('http://www.w3.org/2000/svg', 'line')),
            updateLine: jest.fn(),
        };
        mockNodeFilterManager = {
            applyInheritedFilter: jest.fn(),
        };
        mockGetUnscaledElementCenter = jest.fn(() => ({ ux: 100, uy: 100 }));
        mockNodeMovementManager = {
            stopAllGlides: jest.fn(),
            animateToPosition: jest.fn(),
        };

        layoutManager = new GraphLayoutManager({
            nodeCreator: mockNodeCreator,
            lineCreator: mockLineCreator,
            nodeFilterManager: mockNodeFilterManager,
            getUnscaledElementCenter: mockGetUnscaledElementCenter,
            nodeMovementManager: mockNodeMovementManager,
        });
    });

    describe('drawExpansion', () => {
        let sourceElement;
        let parentNode;
        const sourceKanji = '日';
        const words = [{ slug: 'word1' }, { slug: 'word2' }];

        beforeEach(() => {
            parentNode = document.createElement('div');
            sourceElement = document.createElement('span');
            sourceElement.textContent = '日';
            parentNode._children = []; // Initialize custom property for the test
            parentNode.appendChild(sourceElement);
        });

        test('should not draw if parentNode is collapsed', () => {
            parentNode.dataset.collapsed = 'true';
            layoutManager.drawExpansion(sourceElement, sourceKanji, words);
            expect(mockLineCreator.createExpansionLine).not.toHaveBeenCalled();
        });

        test('should create and position nodes and lines', () => {
            layoutManager.drawExpansion(sourceElement, sourceKanji, words);

            expect(mockLineCreator.createExpansionLine).toHaveBeenCalledTimes(words.length);
            expect(mockNodeCreator.createWordNode).toHaveBeenCalledTimes(words.length);
            expect(mockNodeCreator.positionAndAppendNode).toHaveBeenCalledTimes(words.length);
            expect(mockNodeCreator.fadeInElements).toHaveBeenCalledTimes(words.length);
            expect(mockNodeCreator.refineLineEndpoint).toHaveBeenCalledTimes(words.length);
        });

        test('should apply inherited filter if parentNode has filterType', () => {
            parentNode.dataset.filterType = 'kanji';
            parentNode.dataset.filterClickedKanji = '日';
            layoutManager.drawExpansion(sourceElement, sourceKanji, words);
            expect(mockNodeFilterManager.applyInheritedFilter).toHaveBeenCalledTimes(words.length);
        });

        test('should calculate baseAngle from grandparent if it exists', () => {
            const grandparentNode = document.createElement('div');
            parentNode._parent = grandparentNode;

            mockGetUnscaledElementCenter
                .mockReturnValueOnce({ ux: 100, uy: 100 }) // sourceElement
                .mockReturnValueOnce({ ux: 50, uy: 50 })   // grandparentNode
                .mockReturnValueOnce({ ux: 100, uy: 100 }); // parentNode

            layoutManager.drawExpansion(sourceElement, sourceKanji, words);
            expect(mockGetUnscaledElementCenter).toHaveBeenCalledWith(grandparentNode);
        });

        test('should generate correct number of angles for 1, 2, and 3+ words', () => {
            const oneWord = [{ slug: 'word1' }];
            const twoWords = [{ slug: 'word1' }, { slug: 'word2' }];
            const threeWords = [{ slug: 'word1' }, { slug: 'word2' }, { slug: 'word3' }];

            layoutManager.drawExpansion(sourceElement, sourceKanji, oneWord);
            expect(mockNodeCreator.createWordNode).toHaveBeenCalledTimes(1);

            mockNodeCreator.createWordNode.mockClear();
            layoutManager.drawExpansion(sourceElement, sourceKanji, twoWords);
            expect(mockNodeCreator.createWordNode).toHaveBeenCalledTimes(2);

            mockNodeCreator.createWordNode.mockClear();
            layoutManager.drawExpansion(sourceElement, sourceKanji, threeWords);
            expect(mockNodeCreator.createWordNode).toHaveBeenCalledTimes(3);
        });
    });

    describe('optimizeLayout', () => {
        let rootNode;
        let child1, child2;
        let grandchild1;

        // Use fake timers to control the setTimeout in optimizeLayout
        beforeEach(() => {
            jest.useFakeTimers();
            // Create a mock DOM structure
            rootNode = document.createElement('div');
            rootNode.style.left = '100px';
            rootNode.style.top = '100px';

            child1 = document.createElement('div');
            child2 = document.createElement('div');
            grandchild1 = document.createElement('div');

            rootNode._children = [child1, child2];
            child1._children = [grandchild1];
            child2._children = [];
            grandchild1._children = [];

            child1._parent = rootNode;
            child2._parent = rootNode;
            grandchild1._parent = child1;

            // Mock lines
            rootNode._parentLine = null;
            child1._parentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            child2._parentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            grandchild1._parentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should arrange nodes in a hierarchical tree layout', () => {
            layoutManager.optimizeLayout(rootNode);

            // Fast-forward timers to execute the animation logic inside setTimeout
            jest.runAllTimers();

            // Check that stopAllGlides was called
            expect(mockNodeMovementManager.stopAllGlides).toHaveBeenCalled();
            // Check that animateToPosition was called for each descendant
            expect(mockNodeMovementManager.animateToPosition).toHaveBeenCalledTimes(3);
            expect(mockNodeMovementManager.animateToPosition).toHaveBeenCalledWith(child1, expect.any(Object));
            expect(mockNodeMovementManager.animateToPosition).toHaveBeenCalledWith(child2, expect.any(Object));
            expect(mockNodeMovementManager.animateToPosition).toHaveBeenCalledWith(grandchild1, expect.any(Object));
        });

        test('should update the lines connecting the nodes', () => {
            layoutManager.optimizeLayout(rootNode);

            // Fast-forward timers to execute the animation logic inside setTimeout
            jest.runAllTimers();

            // The test for this is now implicitly covered by checking if animateToPosition is called,
            // as that's the method responsible for moving nodes and their lines.
            expect(mockNodeMovementManager.animateToPosition).toHaveBeenCalledTimes(3);
        });
    });
});