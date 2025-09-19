import { NodeCollapseExpandManager } from '@managers/NodeCollapseExpandManager.js';

// Mock dependencies
const mockNodeFilterManager = {
    applyChildFilterRecursively: jest.fn(),
    setNodeVisibility: jest.fn(),
};

const mockGraphState = {
    currentSelectionCircleParentNode: null,
};

const mockKanjiSidebar = {
    recalculateDimmingState: jest.fn(),
};

const mockClearSelectionCircleCallback = jest.fn();

describe('NodeCollapseExpandManager', () => {
    let manager;
    let mockNode;
    let mockChildNode1;
    let mockChildNode2;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new NodeCollapseExpandManager(
            mockNodeFilterManager,
            mockGraphState,
            mockKanjiSidebar,
            mockClearSelectionCircleCallback
        );

        // Setup mock nodes
        mockNode = document.createElement('div');
        mockNode.dataset.wordSlug = 'parent';
        mockNode._children = [];

        mockChildNode1 = document.createElement('div');
        mockChildNode1.dataset.wordSlug = 'child1';
        mockChildNode1._children = [];

        mockChildNode2 = document.createElement('div');
        mockChildNode2.dataset.wordSlug = 'child2';
        mockChildNode2._children = [];

        mockNode._children.push(mockChildNode1, mockChildNode2);

        // Mock Node.prototype.contains
        Object.defineProperty(Node.prototype, 'contains', {
            value: jest.fn(function(otherNode) {
                let current = otherNode;
                while (current) {
                    if (current === this) {
                        return true;
                    }
                    current = current.parentNode;
                }
                return false;
            }),
            writable: true,
        });
    });

    describe('collapseNode', () => {
        test('should set collapsed dataset and class, and hide children', () => {
            manager.collapseNode(mockNode);

            expect(mockNode.dataset.collapsed).toBe('true');
            expect(mockNode.classList.contains('collapsed-parent')).toBe(true);
            expect(mockNodeFilterManager.setNodeVisibility).toHaveBeenCalledWith(mockChildNode1, false);
            expect(mockNodeFilterManager.setNodeVisibility).toHaveBeenCalledWith(mockChildNode2, false);
            expect(mockKanjiSidebar.recalculateDimmingState).toHaveBeenCalled();
        });

        test('should not collapse if already collapsed', () => {
            mockNode.dataset.collapsed = 'true';
            manager.collapseNode(mockNode);

            expect(mockNodeFilterManager.setNodeVisibility).not.toHaveBeenCalled();
        });

        test('should clear selection circle if on collapsed node or descendant', () => {
            mockGraphState.currentSelectionCircleParentNode = mockNode;
            manager.collapseNode(mockNode);
            expect(mockClearSelectionCircleCallback).toHaveBeenCalled();

            mockClearSelectionCircleCallback.mockClear();
            mockNode.dataset.collapsed = 'false'; // Reset collapsed state
            manager.collapseNode(mockNode);
            expect(mockClearSelectionCircleCallback).toHaveBeenCalled();
        });

        test('should not clear selection circle if not on collapsed node or descendant', () => {
            mockGraphState.currentSelectionCircleParentNode = document.createElement('div'); // unrelated node
            manager.collapseNode(mockNode);
            expect(mockClearSelectionCircleCallback).not.toHaveBeenCalled();
        });
    });

    describe('expandNode', () => {
        test('should remove collapsed dataset and class, and apply child filter', () => {
            mockNode.dataset.collapsed = 'true';
            mockNode.classList.add('collapsed-parent');

            manager.expandNode(mockNode);

            expect(mockNode.dataset.collapsed).toBe('false');
            expect(mockNode.classList.contains('collapsed-parent')).toBe(false);
            expect(mockKanjiSidebar.recalculateDimmingState).toHaveBeenCalled();
            expect(mockNodeFilterManager.applyChildFilterRecursively).toHaveBeenCalledWith(mockNode);
        });

        test('should not expand if not collapsed', () => {
            manager.expandNode(mockNode);
            expect(mockNodeFilterManager.applyChildFilterRecursively).not.toHaveBeenCalled();
        });
    });

    describe('hideNode', () => {
        test('should set hidden dataset and hide node and children', () => {
            manager.hideNode(mockNode);

            expect(mockNode.dataset.hidden).toBe('true');
            expect(mockNodeFilterManager.setNodeVisibility).toHaveBeenCalledWith(mockNode, false);
            expect(mockNodeFilterManager.setNodeVisibility).toHaveBeenCalledWith(mockChildNode1, false);
            expect(mockKanjiSidebar.recalculateDimmingState).toHaveBeenCalled();
        });

        test('should not hide if already hidden', () => {
            mockNode.dataset.hidden = 'true';
            manager.hideNode(mockNode);
            expect(mockNodeFilterManager.setNodeVisibility).not.toHaveBeenCalled();
        });

        test('should clear selection circle if on hidden node or descendant', () => {
            mockGraphState.currentSelectionCircleParentNode = mockNode;
            manager.hideNode(mockNode);
            expect(mockClearSelectionCircleCallback).toHaveBeenCalled();
        });
    });

    describe('showNode', () => {
        test('should remove hidden dataset and show node', () => {
            mockNode.dataset.hidden = 'true';
            manager.showNode(mockNode);

            expect(mockNode.dataset.hidden).toBeUndefined();
            expect(mockNodeFilterManager.setNodeVisibility).toHaveBeenCalledWith(mockNode, true);
            expect(mockKanjiSidebar.recalculateDimmingState).toHaveBeenCalled();
        });

        test('should apply child filter if not collapsed', () => {
            mockNode.dataset.hidden = 'true';
            mockNode.dataset.collapsed = 'false';
            manager.showNode(mockNode);
            expect(mockNodeFilterManager.applyChildFilterRecursively).toHaveBeenCalledWith(mockNode);
        });

        test('should not apply child filter if collapsed', () => {
            mockNode.dataset.hidden = 'true';
            mockNode.dataset.collapsed = 'true';
            manager.showNode(mockNode);
            expect(mockNodeFilterManager.applyChildFilterRecursively).not.toHaveBeenCalled();
        });

        test('should not show if not hidden', () => {
            manager.showNode(mockNode);
            expect(mockNodeFilterManager.setNodeVisibility).not.toHaveBeenCalled();
        });
    });

    test('_recursivelySetVisibility should call setNodeVisibility for all children', () => {
        manager._recursivelySetVisibility(mockNode, true);
        expect(mockNodeFilterManager.setNodeVisibility).toHaveBeenCalledWith(mockChildNode1, true);
        expect(mockNodeFilterManager.setNodeVisibility).toHaveBeenCalledWith(mockChildNode2, true);
    });
});