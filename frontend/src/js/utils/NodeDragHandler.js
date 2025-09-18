// d:/Rinkuji/static/NodeDragHandler.js

/**
 * Manages drag-and-drop functionality for nodes, distinguishing between
 * genuine drags and simple clicks by using a drag threshold.
 */
export class NodeDragHandler {
    /**
     * @param {function(MouseEvent): {ux: number, uy: number}} getCanvasCoordinates - Callback to get unscaled canvas coordinates.
     * @param {function(HTMLElement, number, number): void} moveNodeAndChildrenCallback - Callback to move the node and its children.
     */
    constructor(getCanvasCoordinates, moveNodeAndChildrenCallback) {
        this.getCanvasCoordinates = getCanvasCoordinates;
        this.moveNodeAndChildrenCallback = moveNodeAndChildrenCallback;

        this.isDragging = false; // Is the mouse button currently down?
        this.activeNode = null; // The node being interacted with.

        // Use separate variables for clarity and robustness
        this.initialX = 0; // Mouse X at the moment of mousedown
        this.initialY = 0; // Mouse Y at the moment of mousedown
        this.lastX = 0; // Mouse X in the previous mousemove frame
        this.lastY = 0; // Mouse Y in the previous mousemove frame

        this._dragOccurred = false; // Flag to track if movement exceeded the threshold.
        this.dragThreshold = 5; // Min pixels moved to be considered a drag.
    }

    /**
     * Attaches mousedown event listener to a node to enable dragging.
     * @param {HTMLElement} node - The node element to make draggable.
     */
    addDragHandlersToNode(node) {
        node.addEventListener('mousedown', this.handleMouseDown.bind(this));
    }

    /**
     * Handles the mousedown event on a node, preparing for a potential drag.
     * @param {MouseEvent} e - The mouse event.
     */
    handleMouseDown(e) {
        if (e.button !== 0) return; // Only respond to left-click
        e.stopPropagation(); // Prevent panZoom from starting, and viewport from hiding meaning bar

        this.isDragging = true;
        this._dragOccurred = false; // **KEY FIX**: Reset flag at the start of every new interaction.
        this.activeNode = e.currentTarget;
        this.activeNode.style.zIndex = '1000'; // Bring to front

        const canvasCoords = this.getCanvasCoordinates(e);
        this.initialX = canvasCoords.ux;
        this.initialY = canvasCoords.uy;
        this.lastX = canvasCoords.ux;
        this.lastY = canvasCoords.uy;
    }

    /**
     * Handles the mousemove event, moving the node if the drag threshold is passed.
     * @param {MouseEvent} e - The mouse event.
     * @returns {boolean} True if a drag is in progress, false otherwise.
     */
    handleMouseMove(e) {
        if (!this.isDragging || !this.activeNode) return false;

        const canvasCoords = this.getCanvasCoordinates(e);

        // Check threshold against the initial mousedown position
        if (!this._dragOccurred) {
            const totalDeltaX = Math.abs(canvasCoords.ux - this.initialX);
            const totalDeltaY = Math.abs(canvasCoords.uy - this.initialY);
            if (totalDeltaX > this.dragThreshold || totalDeltaY > this.dragThreshold) {
                this._dragOccurred = true;
                this.activeNode.style.cursor = 'grabbing';
            }
        }

        // If a drag has occurred, move the node incrementally
        if (this._dragOccurred) {
            const incrementalDx = canvasCoords.ux - this.lastX;
            const incrementalDy = canvasCoords.uy - this.lastY;

            if (incrementalDx !== 0 || incrementalDy !== 0) {
                this.moveNodeAndChildrenCallback(this.activeNode, incrementalDx, incrementalDy);
            }

            // Update last position for the next frame
            this.lastX = canvasCoords.ux;
            this.lastY = canvasCoords.uy;
        }
        return true; // Indicate that a drag operation is active and being handled
    }

    /**
     * Handles mouseup/mouseleave events to end dragging.
     */
    handleMouseUpOrLeave() {
        if (this.activeNode) {
            this.activeNode.style.cursor = 'grab';
            this.activeNode.style.zIndex = '';
        }
        this.isDragging = false;
        this.activeNode = null;
        // Note: _dragOccurred is NOT reset here. It's reset on the next mousedown.
        // This allows the click event, which fires after mouseup, to correctly check its value.
    }

    /**
     * Returns whether a drag operation has occurred since the last mousedown.
     * Useful for distinguishing clicks from drags.
     * @returns {boolean}
     */
    hasDragOccurred() {
        return this._dragOccurred;
    }
}