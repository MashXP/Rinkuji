export class NodeMovementManager {
    /**
     * @param {PanZoom} panZoom - Instance of PanZoom for coordinate calculations.
     * @param {object} graphState - Object holding current selection circle state (currentSelectionCircle, currentSelectionCircleParentNode, currentSelectionCircleOffsetX, currentSelectionCircleOffsetY).
     */
    constructor(panZoom, graphState) {
        this.panZoom = panZoom;
        this.graphState = graphState; // Reference to RinkuGraph's state for selection circle
    }

    /**
     * Moves a node and all its descendants, updating their positions and connecting lines.
     * @param {HTMLElement} node - The node to move.
     * @param {number} dx - Change in X coordinate.
     * @param {number} dy - Change in Y coordinate.
     */
    moveNodeAndChildren(node, dx, dy) {
        const currentX = parseFloat(node.style.left);
        const currentY = parseFloat(node.style.top);
        const newX = currentX + dx;
        const newY = currentY + dy;
        console.log(`Moving node ${node.id}: currentX=${currentX}, dx=${dx}, newX=${newX}`);

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
            const oldX2 = parseFloat(node.lineElement.getAttribute('x2'));
            const oldY2 = parseFloat(node.lineElement.getAttribute('y2'));
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
}