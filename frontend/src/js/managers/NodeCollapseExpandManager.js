export class NodeCollapseExpandManager {
    /**
     * @param {NodeFilterManager} nodeFilterManager - Instance of NodeFilterManager for applying filters on expand.
     * @param {object} graphState - Reference to RinkuGraph's graphState.
     * @param {KanjiSidebar} kanjiSidebar - Instance of KanjiSidebar.
     * @param {function(): void} clearSelectionCircleCallback - Callback to clear the selection circle.
     */
    constructor(nodeFilterManager, graphState, kanjiSidebar, clearSelectionCircleCallback) {
        this.nodeFilterManager = nodeFilterManager;
        this.graphState = graphState;
        this.kanjiSidebar = kanjiSidebar;
        this.clearSelectionCircleCallback = clearSelectionCircleCallback;
    }

    /**
     * Collapses a node, hiding its children and connecting lines.
     * @param {HTMLElement} node - The node to collapse.
     */
    collapseNode(node) {
        if (node.dataset.collapsed === 'true') return;

        node.dataset.collapsed = 'true';
        node.classList.add('collapsed-parent');

        // Hide all descendants and their associated lines
        this._recursivelySetVisibility(node, false);

        // If the selection circle is on the collapsed node or any of its descendants, hide it.
        if (this.graphState.currentSelectionCircleParentNode &&
            (this.graphState.currentSelectionCircleParentNode === node ||
             node.contains(this.graphState.currentSelectionCircleParentNode))) {
            this.clearSelectionCircleCallback();
        }

        // Notify the sidebar to update the dimming state of its items
        if (this.kanjiSidebar) this.kanjiSidebar.recalculateDimmingState();
        //console.log(`Node collapsed: ${node.dataset.wordSlug}`);
    }

    /**
     * Expands a node, making its children and connecting lines visible again.
     * @param {HTMLElement} node - The node to expand.
     */
    expandNode(node) {
        if (node.dataset.collapsed !== 'true') return;

        node.dataset.collapsed = 'false';
        node.classList.remove('collapsed-parent');

        // Notify the sidebar to update the dimming state of its items
        if (this.kanjiSidebar) this.kanjiSidebar.recalculateDimmingState();

        this.nodeFilterManager.applyChildFilterRecursively(node);
        //console.log(`Node expanded: ${node.dataset.wordSlug}`);
    }

    /**
     * Hides a node and all its descendants. Used by the sidebar.
     * @param {HTMLElement} node The node to hide.
     */
    hideNode(node) {
        if (node.dataset.hidden === 'true') return;
        node.dataset.hidden = 'true';

        // Hide the node itself and its direct connections
        this.nodeFilterManager.setNodeVisibility(node, false);
        // Hide all its children recursively
        this._recursivelySetVisibility(node, false);

        // If selection circle is on the hidden node or a descendant, clear it
        if (this.graphState.currentSelectionCircleParentNode &&
            (this.graphState.currentSelectionCircleParentNode === node ||
             node.contains(this.graphState.currentSelectionCircleParentNode))) {
            this.clearSelectionCircleCallback();
        }

        this.kanjiSidebar.recalculateDimmingState();
        //console.log(`Node hidden: ${node.dataset.wordSlug}`);
    }

    /**
     * Recursively sets the visibility of a node and its descendants.
     * @param {HTMLElement} node - The node to start from.
     * @param {boolean} isVisible - True to make visible, false to hide.
     */
    _recursivelySetVisibility(node, isVisible) {
        node._children.forEach(child => {
            this.nodeFilterManager.setNodeVisibility(child, isVisible);
            this._recursivelySetVisibility(child, isVisible);
        });
    }

    /**
     * Shows a previously hidden node. Used by the sidebar.
     * @param {HTMLElement} node The node to show.
     */
    showNode(node) {
        if (node.dataset.hidden !== 'true') return;
        delete node.dataset.hidden;

        // Show the node itself and its direct connections
        this.nodeFilterManager.setNodeVisibility(node, true);

        // If the node is not collapsed, show its children according to filters
        if (node.dataset.collapsed !== 'true') {
            this.nodeFilterManager.applyChildFilterRecursively(node);
        }
        
        this.kanjiSidebar.recalculateDimmingState();
        //console.log(`Node shown: ${node.dataset.wordSlug}`);
    }
}