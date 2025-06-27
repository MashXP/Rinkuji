// d:/Rinkuji/static/NodeDragHandler.js

// Class to manage drag functionality for nodes within a canvas environment.
export class NodeDragHandler {
    /**
     * @param {function(MouseEvent): {ux: number, uy: number}} getCanvasCoordinatesCallback - Callback to get unscaled canvas coordinates.
     * @param {function(HTMLElement, number, number): void} moveNodeAndChildrenCallback - Callback to move the node and its children.
     */
    constructor(getCanvasCoordinatesCallback, moveNodeAndChildrenCallback) {
        this.getCanvasCoordinatesCallback = getCanvasCoordinatesCallback;
        this.moveNodeAndChildrenCallback = moveNodeAndChildrenCallback;

        this.draggingNode = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragOccurred = false; // Flag to distinguish click from drag
    }

    /**
     * Attaches mousedown event listener to a node to enable dragging.
     * @param {HTMLElement} node - The node element to make draggable.
     */
    addDragHandlersToNode(node) {
        node.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.draggingNode = node;

            const { ux: mouse_ux, uy: mouse_uy } = this._getCanvasCoordinates(e);
            const node_center_ux = parseFloat(node.style.left);
            const node_center_uy = parseFloat(node.style.top);

            this.dragOffsetX = mouse_ux - node_center_ux;
            this.dragOffsetY = mouse_uy - node_center_uy;

            this.draggingNode.style.cursor = 'grabbing';
            this.draggingNode.style.zIndex = '1000';
            this.dragOccurred = false; // Reset for new drag
        });
    }

    /**
     * Handles mousemove events for dragging.
     * @param {MouseEvent} e - The mouse event.
     * @returns {boolean} True if a drag is in progress, false otherwise.
     */
    handleMouseMove(e) {
        if (this.draggingNode) {
            e.stopPropagation(); // Prevent pan if dragging a node
            this.dragOccurred = true; // Mark that a drag has occurred

            const { ux, uy } = this._getCanvasCoordinates(e);
            const new_center_ux = ux - this.dragOffsetX;
            const new_center_uy = uy - this.dragOffsetY;
            const old_center_ux = parseFloat(this.draggingNode.style.left);
            const old_center_uy = parseFloat(this.draggingNode.style.top);
            const dx = new_center_ux - old_center_ux;
            const dy = new_center_uy - old_center_uy;

            if (dx !== 0 || dy !== 0) {
                this.moveNodeAndChildrenCallback(this.draggingNode, dx, dy);
            }
            return true; // Indicate that a drag was handled
        }
        return false; // No drag in progress
    }

    /**
     * Handles mouseup/mouseleave events to end dragging.
     */
    handleMouseUpOrLeave() {
        if (this.draggingNode) {
            this.draggingNode.style.cursor = 'grab';
            this.draggingNode.style.zIndex = '';
            this.draggingNode = null;
        }
        // Reset dragOccurred after a short delay to allow click event to fire first
        setTimeout(() => {
            this.dragOccurred = false;
        }, 0);
    }

    /**
     * Utility method to get mouse coordinates relative to the unscaled canvas.
     * Uses the callback provided in the constructor.
     * @param {MouseEvent} event - The mouse event.
     * @returns {{ux: number, uy: number}} - Unscaled x and y coordinates.
     */
    _getCanvasCoordinates(event) {
        return this.getCanvasCoordinatesCallback(event);
    }

    /**
     * Returns whether a drag operation has occurred since the last mousedown.
     * Useful for distinguishing clicks from drags.
     * @returns {boolean}
     */
    hasDragOccurred() {
        return this.dragOccurred;
    }
}