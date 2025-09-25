/**
 * Manages drag-and-drop functionality for nodes, distinguishing between
 * genuine drags and simple clicks by using a drag threshold.
 */
export class NodeDragHandler {
    /**
     * @param {function(MouseEvent): {ux: number, uy: number}} getCanvasCoordinates - Callback to get unscaled canvas coordinates.
     * @param {function(HTMLElement, number, number): void} startSpringDragCallback - Callback to initiate spring drag.
     * @param {function(number, number): void} updateSpringDragTargetCallback - Callback to update spring drag target.
     * @param {function(): void} stopSpringDragCallback - Callback to stop spring drag.
     * @param {function(HTMLElement, number, number): void} startGlideCallback - Callback to initiate a glide animation.
     */
    constructor(getCanvasCoordinates, startSpringDragCallback, updateSpringDragTargetCallback, stopSpringDragCallback, startGlideCallback) {
        this.getCanvasCoordinates = getCanvasCoordinates;
        this.startSpringDragCallback = startSpringDragCallback;
        this.updateSpringDragTargetCallback = updateSpringDragTargetCallback;
        this.stopSpringDragCallback = stopSpringDragCallback;
        this.startGlideCallback = startGlideCallback;

        this.isDragging = false; // Is the mouse button currently down?
        this.activeNode = null; // The node being interacted with.

        this.initialX = 0; // Mouse X at the moment of mousedown
        this.initialY = 0; // Mouse Y at the moment of mousedown
        this.lastX = 0; // Mouse X in the previous mousemove frame
        this.lastY = 0; // Mouse Y in the previous mousemove frame
        this.lastMoveTime = 0; // Timestamp of the last mousemove/touchmove event
        this.lastDx = 0;
        this.lastDy = 0;
        this._dragOccurred = false; // Flag to track if movement exceeded the threshold.
        this.dragThreshold = 5; // Min pixels moved to be considered a drag.

        // Bind event handlers once to ensure they can be removed correctly.
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseUpOrLeave = this.handleMouseUpOrLeave.bind(this);
        this.boundHandleTouchMove = this.handleTouchMove.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    }

    /**
     * Attaches mousedown event listener to a node to enable dragging.
     * @param {HTMLElement} node - The node element to make draggable.  
     */
    addDragHandlersToNode(node) {
        node.addEventListener('mousedown', this.handleMouseDown.bind(this));
        node.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    }

    /**
     * Handles the touchstart event on a node, preparing for a potential drag.
     * @param {TouchEvent} e - The touch event.
     */
    handleTouchStart(e) {
        if (e.touches.length !== 1) return; // Only respond to single touch

        e.stopPropagation(); // Prevent panZoom from starting

        this.isDragging = true;
        this._dragOccurred = false; // **KEY FIX**: Reset flag at the start of every new interaction.
        this.activeNode = e.currentTarget;
        this.activeNode.style.zIndex = '1000'; // Bring to front

        const touch = e.touches[0];
        const canvasCoords = this.getCanvasCoordinates(touch);
        this.initialX = canvasCoords.ux;
        this.initialY = canvasCoords.uy;
        this.lastX = canvasCoords.ux;
        this.lastY = canvasCoords.uy;
        this.lastMoveTime = performance.now();
        this.lastDx = 0;
        this.lastDy = 0;

        // Add global touchmove and touchend listeners
        document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
        document.addEventListener('touchend', this.boundHandleTouchEnd);
        document.addEventListener('touchcancel', this.boundHandleTouchEnd);
    }

    handleTouchMove(e) {
        if (!this.isDragging || !this.activeNode || e.touches.length !== 1) return false;
        
        const touch = e.touches[0];
        const canvasCoords = this.getCanvasCoordinates(touch);

        // Check threshold against the initial touchstart position
        if (!this._dragOccurred) {
            const totalDeltaX = Math.abs(canvasCoords.ux - this.initialX);
            const totalDeltaY = Math.abs(canvasCoords.uy - this.initialY);
            if (totalDeltaX > this.dragThreshold || totalDeltaY > this.dragThreshold) {
                this._dragOccurred = true;
                this.startSpringDragCallback(this.activeNode, this.initialX, this.initialY);
                this.activeNode.style.cursor = 'grabbing';
                e.preventDefault(); // Prevent scrolling only when drag starts
            }
        }

        // If a drag has occurred, move the node incrementally
        if (this._dragOccurred) {
            this.updateSpringDragTargetCallback(canvasCoords.ux, canvasCoords.uy);

            const incrementalDx = canvasCoords.ux - this.lastX;
            const incrementalDy = canvasCoords.uy - this.lastY;
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastMoveTime;
            if (incrementalDx !== 0 || incrementalDy !== 0) {
                // Store the last delta for velocity calculation
                if (deltaTime > 0) {
                    this.lastDx = incrementalDx;
                    this.lastDy = incrementalDy;
                }
            }

            // Update last position for the next frame
            this.lastX = canvasCoords.ux;
            this.lastY = canvasCoords.uy;
            this.lastMoveTime = currentTime;
        }
        return true; // Indicate that a drag operation is active and being handled
    }

    /**
     * Handles touchend/touchcancel events to end dragging.
     */
    handleTouchEnd() {
        const nodeToGlide = this.activeNode; // Capture activeNode before nulling it
        if (nodeToGlide) {
            nodeToGlide.style.cursor = 'grab';
            nodeToGlide.style.zIndex = '';
        }
        this.isDragging = false;
        this.activeNode = null;

        // Calculate velocity at the moment of release
        if (this._dragOccurred) {
            this.stopSpringDragCallback();
            if (nodeToGlide && this.startGlideCallback) {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastMoveTime;
            // Only glide if release is quick after last move
            if (deltaTime < 500) { // Increased time window to make glide easier to trigger
                    const velocityDamping = 0.1; // Further reduce initial velocity for a gentler start.
                    let velocityX = (this.lastDx / (deltaTime || 1)) * velocityDamping;
                    let velocityY = (this.lastDy / (deltaTime || 1)) * velocityDamping;

                // Cap the maximum velocity to prevent extreme flings
                    const maxVelocity = 1.2; // pixels per millisecond. Lowered for more control.
                const currentVelocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

                if (currentVelocity > maxVelocity) {
                    const scale = maxVelocity / currentVelocity;
                    velocityX *= scale;
                    velocityY *= scale;
                }
                // Velocity = last change in position / time since last change
                this.startGlideCallback(nodeToGlide, velocityX, velocityY);
            }
            }
        }

        // Remove global touchmove and touchend listeners
        document.removeEventListener('touchmove', this.boundHandleTouchMove);
        document.removeEventListener('touchend', this.boundHandleTouchEnd);
        document.removeEventListener('touchcancel', this.boundHandleTouchEnd);
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
        this.lastMoveTime = performance.now();
        this.lastDx = 0;
        this.lastDy = 0;

        // Add global mousemove and mouseup listeners
        document.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('mouseup', this.boundHandleMouseUpOrLeave);
        document.addEventListener('mouseleave', this.boundHandleMouseUpOrLeave);
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.activeNode) return false;

        const canvasCoords = this.getCanvasCoordinates(e);

        // Check threshold against the initial mousedown position
        if (!this._dragOccurred) {
            const totalDeltaX = Math.abs(canvasCoords.ux - this.initialX);
            const totalDeltaY = Math.abs(canvasCoords.uy - this.initialY);
            if (totalDeltaX > this.dragThreshold || totalDeltaY > this.dragThreshold) {
                this._dragOccurred = true;
                this.startSpringDragCallback(this.activeNode, this.initialX, this.initialY);
                this.activeNode.style.cursor = 'grabbing';
            }
        }

        // If a drag has occurred, move the node incrementally
        if (this._dragOccurred) {
            this.updateSpringDragTargetCallback(canvasCoords.ux, canvasCoords.uy);

            const incrementalDx = canvasCoords.ux - this.lastX;
            const incrementalDy = canvasCoords.uy - this.lastY;
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastMoveTime;
            if (incrementalDx !== 0 || incrementalDy !== 0) {
                // Store the last delta for velocity calculation
                if (deltaTime > 0) {
                    this.lastDx = incrementalDx;
                    this.lastDy = incrementalDy;
                }
            }

            // Update last position for the next frame
            this.lastX = canvasCoords.ux;
            this.lastY = canvasCoords.uy;
            this.lastMoveTime = currentTime;
        }
        return true; // Indicate that a drag operation is active and being handled
    }

    /**
     * Handles mouseup/mouseleave events to end dragging.
     */
    handleMouseUpOrLeave() {
        const nodeToGlide = this.activeNode; // Capture activeNode before nulling it
        if (nodeToGlide) {
            nodeToGlide.style.cursor = 'grab';
            nodeToGlide.style.zIndex = '';
        }
        this.isDragging = false;
        this.activeNode = null;
        // Note: _dragOccurred is NOT reset here. It's reset on the next mousedown.
            // This allows the click event, which fires after mouseup, to correctly check its value.

            // Calculate velocity at the moment of release
            if (this._dragOccurred) {
                this.stopSpringDragCallback();
                if (nodeToGlide && this.startGlideCallback) {
                const currentTime = performance.now();
                const deltaTime = currentTime - this.lastMoveTime;
                // Only glide if release is quick after last move
                if (deltaTime < 500) { // Increased time window to make glide easier to trigger
                    const velocityDamping = 0.1; // Further reduce initial velocity for a gentler start.
                    let velocityX = (this.lastDx / (deltaTime || 1)) * velocityDamping;
                    let velocityY = (this.lastDy / (deltaTime || 1)) * velocityDamping;

                    // Cap the maximum velocity to prevent extreme flings
                    const maxVelocity = 1.2; // pixels per millisecond. Lowered for more control.
                    const currentVelocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

                    if (currentVelocity > maxVelocity) {
                        const scale = maxVelocity / currentVelocity;
                        velocityX *= scale;
                        velocityY *= scale;
                    }
                    // Velocity = last change in position / time since last change
                    this.startGlideCallback(nodeToGlide, velocityX, velocityY);
                }
                }
            }

            // Remove global mousemove and mouseup listeners
            document.removeEventListener('mousemove', this.boundHandleMouseMove);
            document.removeEventListener('mouseup', this.boundHandleMouseUpOrLeave);
            document.removeEventListener('mouseleave', this.boundHandleMouseUpOrLeave);
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