export class NodeMovementManager {
    /**
     * @param {HTMLElement} nodesContainer - The container for all graph nodes.
     * @param {PanZoom} panZoom - Instance of PanZoom for coordinate calculations.
     * @param {object} graphState - Object holding current selection circle state (currentSelectionCircle, currentSelectionCircleParentNode, currentSelectionCircleOffsetX, currentSelectionCircleOffsetY).
     */
    constructor(nodesContainer, panZoom, graphState) {
        this.panZoom = panZoom;
        this.nodesContainer = nodesContainer;
        this.graphState = graphState; // Reference to RinkuGraph's state for selection circle

        // Properties for the new spring-based interactive drag
        this.isSpringDragging = false;
        this.springTargetNode = null;
        this.springTargetX = 0;
        this.springTargetY = 0;
        this.springAnimationId = null;
        this.springGrabOffsetX = 0; // Offset from node center to cursor
        this.springGrabOffsetY = 0;
        this.collidableNodes = []; // Nodes to check for collision against
        this.currentVelocityX = 0; // Velocity of the dragged node
        this.currentVelocityY = 0;

        // Centralized physics parameters
        this.physics = {
            // User Input (Flick gesture)
            FLICK_RELEASE_TIME_THRESHOLD: 500, // Max time (ms) after last move to trigger a glide.
            FLICK_VELOCITY_DAMPING: 0.1, // Multiplier to reduce initial "flick" velocity.

            // Glide animation
            MAX_GLIDE_VELOCITY: 0.5,
            GLIDE_DECELERATION: 0.98,
            MIN_GLIDE_VELOCITY: 0.03, // Minimum velocity to initiate a glide.

            // Spring Drag animation
            SPRING_FACTOR: 0.2, // How "stretchy" the drag is. Higher is less stretchy.
            SPRING_STOP_THRESHOLD: 0.1, // How close to the target before stopping.

            // Drag Collision (when dragging a node into another)
            DRAG_COLLISION_ITERATIONS: 10,
            DRAG_VELOCITY_TRANSFER: 0.01,
            DRAG_COLLISION_SELF_DAMPENING: 0.1, // How much the dragged node slows down on collision (0-1).

            // Glide Collision (when a gliding node hits another)
            GLIDE_BOUNCE_DAMPENING: 0.5, // How much energy is lost on bounce.
            GLIDE_NUDGE_FACTOR: 0.005, // How much the other node is pushed.
            COLLISION_PADDING: 20, // Shared padding for all collisions
        };
    }

    /**
     * Stops all gliding animations currently active in the container.
     * This is useful for immediately halting all node momentum, for example,
     * before starting a new layout animation like "Optimize View".
     */
    stopAllGlides() {
        const glidingNodes = this.nodesContainer.querySelectorAll('.is-gliding');
        glidingNodes.forEach(node => {
            if (node._glideAnimationId) {
                cancelAnimationFrame(node._glideAnimationId);
                delete node._glideAnimationId;
            }
            node.classList.remove('is-gliding');
        });
    }

    // ... (moveNodeAndChildren and other methods remain the same for now)
    
    /**
     * Moves a node and all its descendants, updating their positions and connecting lines.
     * @param {HTMLElement} node - The node to move.
     * @param {number} dx - Change in X coordinate.
     * @param {number} dy - Change in Y coordinate.
     */
    moveNodeAndChildren(node, dx, dy) {
        const currentX = parseFloat(node.style.left || 0);
        const currentY = parseFloat(node.style.top || 0);
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
            let oldX2 = parseFloat(node.lineElement.getAttribute('x2'));
            let oldY2 = parseFloat(node.lineElement.getAttribute('y2'));

            node.lineElement.setAttribute('x2', (oldX2 || 0) + dx);
            node.lineElement.setAttribute('y2', (oldY2 || 0) + dy);
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

        const currentVelocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

        // If initial velocity is too low, do not start glide
        if (currentVelocity < this.physics.MIN_GLIDE_VELOCITY) {
            return;
        }

        if (currentVelocity > this.physics.MAX_GLIDE_VELOCITY) {
            const scale = this.physics.MAX_GLIDE_VELOCITY / currentVelocity;
            velocityX *= scale;
            velocityY *= scale;
        }
        
        node.classList.add('is-gliding');
        
        // Get all other visible nodes to check for collisions against.
        // We do this once at the start of the glide for performance.
        const collidableNodes = Array.from(this.nodesContainer.children).filter(n => n !== node && n.style.display !== 'none');

        const animateGlide = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // Calculate new position based on velocity and delta time
            const dx = velocityX * deltaTime;
            const dy = velocityY * deltaTime;

            this.moveNodeAndChildren(node, dx, dy);
            
            // Check for and resolve collisions after moving.
            const bounce = this._resolveGlideCollisions(node, collidableNodes);

            // Apply deceleration
            velocityX *= this.physics.GLIDE_DECELERATION;
            velocityY *= this.physics.GLIDE_DECELERATION;

            // Stop animation if velocity is too low
            if (Math.abs(velocityX) < this.physics.MIN_GLIDE_VELOCITY && Math.abs(velocityY) < this.physics.MIN_GLIDE_VELOCITY) {
                node.classList.remove('is-gliding');
                return;
            }

            // If a bounce occurred, reverse and dampen velocity
            if (bounce.bounced) {
                velocityX = -velocityX * bounce.dampening;
                velocityY = -velocityY * bounce.dampening;
            }

            // If velocity becomes negligible after a bounce, stop the animation.
            if (Math.abs(velocityX) < this.physics.MIN_GLIDE_VELOCITY && Math.abs(velocityY) < this.physics.MIN_GLIDE_VELOCITY) {
                node.classList.remove('is-gliding');
                return;
            }

            requestAnimationFrame(animateGlide);
        };

        requestAnimationFrame(animateGlide);
    }

    /**
     * Resolves collisions for a single gliding node.
     * @param {HTMLElement} glidingNode - The node that is currently gliding.
     * @param {Array<HTMLElement>} otherNodes - An array of other nodes to check against.
     * @returns {{bounced: boolean, dampening: number}} - Info about the collision.
     */
    _resolveGlideCollisions(glidingNode, otherNodes) {
        let bounced = false;

        const posA = { x: parseFloat(glidingNode.style.left), y: parseFloat(glidingNode.style.top) };

        for (const nodeB of otherNodes) {
            if (this._isAncestor(nodeB, glidingNode) || this._isAncestor(glidingNode, nodeB)) {
                continue; // Prevent children from colliding with parents during glide
            }

            const posB = { x: parseFloat(nodeB.style.left), y: parseFloat(nodeB.style.top) };

            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const requiredDistance = (glidingNode.offsetWidth / 2) + (nodeB.offsetWidth / 2) + this.physics.COLLISION_PADDING;

            if (distance > 0 && distance < requiredDistance) {
                bounced = true;
                const overlap = requiredDistance - distance;
                const pushX = (dx / distance) * overlap;
                const pushY = (dy / distance) * overlap;

                // Move the gliding node back out of the collision immediately
                this.moveNodeAndChildren(glidingNode, -pushX, -pushY);

                // Give the other node a small nudge
                this.startGlide(nodeB, -pushX * this.physics.GLIDE_NUDGE_FACTOR, -pushY * this.physics.GLIDE_NUDGE_FACTOR);

                break; // Resolve one collision per frame for simplicity
            }
        }
        return { bounced, dampening: this.physics.GLIDE_BOUNCE_DAMPENING };
    }

    /**
     * Animates a node to a new target position over a set duration.
     * This is used for the "Optimize Layout" feature.
     * @param {HTMLElement} node - The node to animate.
     * @param {{ux: number, uy: number}} targetPos - The final destination coordinates.
     * @param {number} [duration=500] - The duration of the animation in milliseconds.
     */
    animateToPosition(node, targetPos, duration = 500) {
        if (duration === 0) {
            const currentX = parseFloat(node.style.left || 0);
            const currentY = parseFloat(node.style.top || 0);
            const dx = targetPos.ux - currentX;
            const dy = targetPos.uy - currentY;
            this.moveNodeAndChildren(node, dx, dy);
            return;
        }
        const startX = parseFloat(node.style.left || 0);
        const startY = parseFloat(node.style.top || 0);
        const totalDx = targetPos.ux - startX;
        const totalDy = targetPos.uy - startY;

        let startTime = null;

        // Easing function (ease-in-out)
        const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const animationFrame = (currentTime) => {
            if (startTime === null) {
                startTime = currentTime;
            }

            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const easedProgress = easeInOutQuad(progress);

            // Calculate the required incremental move for this frame
            const currentX = parseFloat(node.style.left || 0);
            const currentY = parseFloat(node.style.top || 0);
            const nextX = startX + totalDx * easedProgress;
            const nextY = startY + totalDy * easedProgress;
            const dx = nextX - currentX;
            const dy = nextY - currentY;

            this.moveNodeAndChildren(node, dx, dy);

            if (progress < 1) {
                requestAnimationFrame(animationFrame);
            }
        };

        requestAnimationFrame(animationFrame);
    }

    /**
     * Starts a spring-based drag animation for a node.
     * @param {HTMLElement} node - The node to be dragged.
     * @param {number} startX - The initial X coordinate of the drag target (cursor).
     * @param {number} startY - The initial Y coordinate of the drag target (cursor).
     * @param {Array<HTMLElement>} collidableNodes - Other nodes to check for collisions.
     */
    startSpringDrag(node, startX, startY, collidableNodes) {
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
        this.collidableNodes = collidableNodes.filter(n => n !== node && n.style.display !== 'none');
        this.currentVelocityX = 0;
        this.currentVelocityY = 0;

        const animateSpring = () => {
            if (!this.isSpringDragging || !this.springTargetNode) {
                this.springAnimationId = null;
                this.collidableNodes = [];
                return;
            }

            // Animate only the root node of the drag.
            // moveNodeAndChildren will handle propagating the movement to descendants.
            const n = this.springTargetNode;

            // The root node follows the cursor
            const targetX = this.springTargetX - this.springGrabOffsetX;
            const targetY = this.springTargetY - this.springGrabOffsetY;

            const dx = (targetX - n._spring.currentX) * this.physics.SPRING_FACTOR;
            const dy = (targetY - n._spring.currentY) * this.physics.SPRING_FACTOR;

            this.currentVelocityX = dx;
            this.currentVelocityY = dy;

            if (Math.abs(dx) > this.physics.SPRING_STOP_THRESHOLD || Math.abs(dy) > this.physics.SPRING_STOP_THRESHOLD) {
                this.moveNodeAndChildren(n, dx, dy);
                n._spring.currentX += dx;
                n._spring.currentY += dy;

                // Resolve collisions after moving the dragged node
                this.resolveDragCollisions(n, this.collidableNodes);
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
        if (this.isSpringDragging && this.springTargetNode) {
            this.springTargetX = targetX;
            this.springTargetY = targetY;
        }
    }

    /**
     * Stops the spring-based drag animation.
     */
    stopSpringDrag() {
        this.isSpringDragging = false;
        if (this.springTargetNode) {
            this._cleanupSpringProperties(this.springTargetNode);
        }
        this.springGrabOffsetX = 0;
        this.springGrabOffsetY = 0;
        this.springTargetNode = null;
        this.currentVelocityX = 0;
        this.currentVelocityY = 0;
        this.collidableNodes = [];
    }

    /**
     * Resolves collisions between the dragged node and other nodes during dragging.
     * @param {HTMLElement} draggedNode - The node being actively dragged.
     * @param {Array<HTMLElement>} otherNodes - An array of other nodes to check against.
     */
    resolveDragCollisions(draggedNode, otherNodes) {
        const allNodes = [draggedNode, ...otherNodes];
        const PADDING = this.physics.COLLISION_PADDING;

        for (let i = 0; i < this.physics.DRAG_COLLISION_ITERATIONS; i++) {
            for (let j = 0; j < allNodes.length; j++) {
                for (let k = j + 1; k < allNodes.length; k++) {
                    const nodeA = allNodes[j];
                    const nodeB = allNodes[k];

                    // Use the more accurate _spring position for the dragged node
                    const posA = (nodeA === draggedNode) ? { x: nodeA._spring.currentX, y: nodeA._spring.currentY } : { x: parseFloat(nodeA.style.left), y: parseFloat(nodeA.style.top) };
                    const posB = { x: parseFloat(nodeB.style.left), y: parseFloat(nodeB.style.top) };

                    const dx = posB.x - posA.x;
                    const dy = posB.y - posA.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const requiredDistance = (nodeA.offsetWidth / 2) + (nodeB.offsetWidth / 2) + PADDING;

                    if (distance > 0 && distance < requiredDistance) {
                        const overlap = (requiredDistance - distance) / 2;
                        const pushX = (dx / distance) * overlap;
                        const pushY = (dy / distance) * overlap;

                        // If nodeA is the one being dragged, only push nodeB.
                        // Otherwise, push both nodes away from each other.
                        if (nodeA === draggedNode) {
                            // If the collided node is not a child of the dragged node, push it and give it a slight nudge.
                            if (!this._isAncestor(draggedNode, nodeB) && !this._isAncestor(nodeB, draggedNode)) {
                                this.moveNodeAndChildren(nodeB, pushX, pushY); // Resolve the overlap immediately.
                                // Start a small glide on the collided node based on the push force.
                                this.startGlide(nodeB, pushX * this.physics.DRAG_VELOCITY_TRANSFER, pushY * this.physics.DRAG_VELOCITY_TRANSFER);
                                // Dampen the dragged node's own velocity using the new, separate parameter.
                                this.currentVelocityX *= 1 - this.physics.DRAG_COLLISION_SELF_DAMPENING;
                                this.currentVelocityY *= 1 - this.physics.DRAG_COLLISION_SELF_DAMPENING;
                            }
                        } else {
                            // This case is for when two non-dragged nodes collide during layout optimization, not during drag.
                            if (!this._isAncestor(nodeB, nodeA)) {
                                this.moveNodeAndChildren(nodeB, pushX, pushY);
                            }
                        }
                    }
                }
            }
        }
    }

    _isAncestor(potentialAncestor, node) {
        let currentNode = node._parent;
        while (currentNode) {
            if (currentNode === potentialAncestor) return true;
            currentNode = currentNode._parent;
        }
        return false;
    }

    _cleanupSpringProperties(node) {
        if (node) {
            delete node._spring;
            node._children.forEach(child => this._cleanupSpringProperties(child));
        }
    }
}