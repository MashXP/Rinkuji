export class NodeMovementManager {
    /**
     * @param {PanZoom} panZoom - Instance of PanZoom for coordinate calculations.
     * @param {object} graphState - Object holding current selection circle state (currentSelectionCircle, currentSelectionCircleParentNode, currentSelectionCircleOffsetX, currentSelectionCircleOffsetY).
     */
    constructor(panZoom, graphState) {
        this.panZoom = panZoom;
        this.graphState = graphState; // Reference to RinkuGraph's state for selection circle

        // Properties for the new spring-based interactive drag
        this.isSpringDragging = false;
        this.springTargetNode = null;
        this.springTargetX = 0;
        this.springTargetY = 0;
        this.springAnimationId = null;
        this.springGrabOffsetX = 0; // Offset from node center to cursor
        this.springGrabOffsetY = 0;
    }

    // ... (moveNodeAndChildren and other methods remain the same for now)
    
    /**
     * Moves a node and all its descendants, updating their positions and connecting lines.
     * @param {HTMLElement} node - The node to move.
     * @param {number} dx - Change in X coordinate.
     * @param {number} dy - Change in Y coordinate.
     * @param {number} [depth=0] - The depth of the node in the current move operation, for damping.
     */
    moveNodeAndChildren(node, dx, dy) {
        const currentX = parseFloat(node.style.left);
        const currentY = parseFloat(node.style.top);
        const newX = currentX + dx;
        const newY = currentY + dy;

        node.style.left = `${newX}px`;
        node.style.top = `${newY}px`;
        this._updateIncomingLine(node, dx, dy);

        if (node._linkingLineToOriginal) {
            node._linkingLineToOriginal.setAttribute('x2', newX);
            node._linkingLineToOriginal.setAttribute('y2', newY); 
        } 

        const anchorPoint = this._updateAndGetAnchorPoint(node, newX, newY);

        this._updateOutgoingLines(node, anchorPoint);

        if (node._linkingLinesFromThisNode) {
            node._linkingLinesFromThisNode.forEach(line => {
                line.setAttribute('x1', newX);
                line.setAttribute('y1', newY);
            });
        }

        node._children.forEach(child => {
            this.moveNodeAndChildren(child, dx, dy);
        });
    }

    /**
     * Updates the endpoint of the line connecting TO the given node.
     * @param {HTMLElement} node - The node whose incoming line needs updating.
     * @param {number} dx - Change in X coordinate.
     * @param {number} dy - Change in Y coordinate.
     */
    _updateIncomingLine(node, dx, dy) {
        if (node.lineElement) {
            let oldX2 = parseFloat(node.lineElement.getAttribute('x2')) || 0;
            let oldY2 = parseFloat(node.lineElement.getAttribute('y2')) || 0;

            node.lineElement.setAttribute('x2', oldX2 + dx);
            node.lineElement.setAttribute('y2', oldY2 + dy);
        }
    }

    /**
     * Updates the position of the selection circle if the moved node is its parent,
     * and returns the correct anchor point for any node's outgoing lines.
     * @param {HTMLElement} node - The node being moved.
     * @param {number} newX - The new X coordinate of the node's center.
     * @param {number} newY - The new Y coordinate of the node's center.
     * @returns {{x: number, y: number}} The anchor point for outgoing lines.
     */
    _updateAndGetAnchorPoint(node, newX, newY) {
        let anchorX = newX;
        let anchorY = newY;

        const { currentSelectionCircle, currentSelectionCircleParentNode, currentSelectionCircleOffsetX, currentSelectionCircleOffsetY } = this.graphState;

        if (currentSelectionCircle && currentSelectionCircleParentNode === node) {
            if (node.dataset.isRootNode === 'true') {
                anchorX = currentSelectionCircleOffsetX;
                anchorY = currentSelectionCircleOffsetY;
            } else {
                anchorX = newX + currentSelectionCircleOffsetX;
                anchorY = newY + currentSelectionCircleOffsetY;
            }
            currentSelectionCircle.setAttribute('cx', anchorX);
            currentSelectionCircle.setAttribute('cy', anchorY);
        } else if (node._sourceKanjiOffsetX !== undefined && node._sourceKanjiOffsetY !== undefined) {
            if (node.dataset.isRootNode === 'true') {
                anchorX = node._sourceKanjiOffsetX;
                anchorY = node._sourceKanjiOffsetY;
            } else {
                anchorX = newX + node._sourceKanjiOffsetX;
                anchorY = newY + node._sourceKanjiOffsetY;
            }
        } else if (node.dataset.isRootNode === 'true') {
            anchorX = 0;
            anchorY = 0;
        }
        return { x: anchorX, y: anchorY };
    }

    /**
     * Updates the start points of lines connecting FROM this node to its children.
     * @param {HTMLElement} node - The node whose outgoing lines need updating.
     * @param {{x: number, y: number}} anchorPoint - The new start point for the lines.
     */
    _updateOutgoingLines(node, anchorPoint) {
        if (node._children && node._children.length > 0) {
            node._children.forEach(childNode => {
                if (childNode.lineElement) {
                    childNode.lineElement.setAttribute('x1', anchorPoint.x);
                    childNode.lineElement.setAttribute('y1', anchorPoint.y);
                }
            });
        }
    }

    /**
     * Initiates a gliding animation for a node with given initial velocity.
     * @param {HTMLElement} node - The node to glide.
     * @param {number} initialVelocityX - The initial velocity in the X direction.
     * @param {number} initialVelocityY - The initial velocity in the Y direction.
     */
    startGlide(node, initialVelocityX, initialVelocityY) {
        let velocityX = initialVelocityX;
        let velocityY = initialVelocityY;
        let lastTime = performance.now();

        const decelerationRate = 0.95; // A higher value (closer to 1.0) decreases friction, making the glide longer and smoother.
        const minVelocityThreshold = 0.01; // Stop gliding when velocity is below this

        const animateGlide = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // Calculate new position based on velocity and delta time
            const dx = velocityX * deltaTime;
            const dy = velocityY * deltaTime;

            this.moveNodeAndChildren(node, dx, dy);

            // Apply deceleration
            velocityX *= decelerationRate;
            velocityY *= decelerationRate;

            // Stop animation if velocity is too low
            if (Math.abs(velocityX) < minVelocityThreshold && Math.abs(velocityY) < minVelocityThreshold) {
                return;
            }

            requestAnimationFrame(animateGlide);
        };

        requestAnimationFrame(animateGlide);
    }

    /**
     * Starts a spring-based drag animation for a node.
     * @param {HTMLElement} node The node to be dragged.
     * @param {number} startX The initial X coordinate of the drag target (cursor).
     * @param {number} startY The initial Y coordinate of the drag target (cursor).
     */
    startSpringDrag(node, startX, startY) {
        if (this.springAnimationId) {
            cancelAnimationFrame(this.springAnimationId);
        }
        const currentX = parseFloat(node.style.left);
        const currentY = parseFloat(node.style.top);

        // Store initial properties for all nodes in the hierarchy
        const setupNode = (n, parent) => {
            const nX = parseFloat(n.style.left);
            const nY = parseFloat(n.style.top);
            n._spring = {
                currentX: nX,
                currentY: nY,
                parent: parent // The element this node should follow
            };
            if (parent) {
                n._spring.initialRelativeOffsetX = nX - parseFloat(parent.style.left);
                n._spring.initialRelativeOffsetY = nY - parseFloat(parent.style.top);
            }
            n._children.forEach(child => setupNode(child, n));
        };
        setupNode(node, null); // The root of the drag has no parent to follow initially

        this.isSpringDragging = true;
        this.springTargetNode = node;
        this.springTargetX = startX;
        this.springTargetY = startY;
        this.springGrabOffsetX = startX - currentX;
        this.springGrabOffsetY = startY - currentY;

        const springFactor = 0.2; // How "stretchy" the drag is. Higher is less stretchy.
        const childDamping = 0.1; // How much children lag behind. Lower is more lag.
        const stopThreshold = 0.1; // How close to the target before stopping.

        const animateSpring = () => {
            if (!this.isSpringDragging || !this.springTargetNode) {
                this.springAnimationId = null;
                // Cleanup spring properties
                const cleanup = (n) => {
                    if (n) {
                        delete n._spring;
                        n._children.forEach(cleanup);
                    }
                };
                cleanup(this.springTargetNode);
                return;
            }

            // Animate only the root node of the drag.
            // moveNodeAndChildren will handle propagating the movement to descendants.
            const n = this.springTargetNode;

            // The root node follows the cursor
            const targetX = this.springTargetX - this.springGrabOffsetX;
            const targetY = this.springTargetY - this.springGrabOffsetY;

            const dx = (targetX - n._spring.currentX) * springFactor;
            const dy = (targetY - n._spring.currentY) * springFactor;

            if (Math.abs(dx) > stopThreshold || Math.abs(dy) > stopThreshold) {
                this.moveNodeAndChildren(n, dx, dy);
                n._spring.currentX += dx;
                n._spring.currentY += dy;
            }

            this.springAnimationId = requestAnimationFrame(animateSpring);
        };
        this.springAnimationId = requestAnimationFrame(animateSpring);
    }

    /**
     * Updates the target position for the spring-based drag.
     * @param {number} targetX The new target X coordinate (from cursor).
     * @param {number} targetY The new target Y coordinate (from cursor).
     */
    updateSpringDragTarget(targetX, targetY) {
        if (this.isSpringDragging) {
            this.springTargetX = targetX;
            this.springTargetY = targetY;
        }
    }

    /**
     * Stops the spring-based drag animation.
     */
    stopSpringDrag() {
        if (this.isSpringDragging) {
            // Snap to final position to ensure clean integer coordinates
            if (this.springTargetNode) {
                const finalTargetX = this.springTargetX - this.springGrabOffsetX;
                const finalTargetY = this.springTargetY - this.springGrabOffsetY;
    
                const currentX = parseFloat(this.springTargetNode.style.left);
                const currentY = parseFloat(this.springTargetNode.style.top);
    
                const dx = finalTargetX - currentX;
                const dy = finalTargetY - currentY;
    
                if (dx !== 0 || dy !== 0) {
                    this.moveNodeAndChildren(this.springTargetNode, dx, dy);
                }
            }
        }
        this.isSpringDragging = false;
        this.springGrabOffsetX = 0;
        this.springGrabOffsetY = 0;
        this.springTargetNode = null;
    }
}