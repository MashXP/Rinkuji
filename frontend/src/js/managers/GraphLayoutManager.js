export class GraphLayoutManager {
    constructor(config) {
        this.nodeCreator = config.nodeCreator;
        this.lineCreator = config.lineCreator;
        this.nodeFilterManager = config.nodeFilterManager;
        this.getUnscaledElementCenter = config.getUnscaledElementCenter;
        this.nodeMovementManager = config.nodeMovementManager;
    }

    /**
     * Draws the new word nodes expanding from a source kanji.
     * @param {HTMLElement} sourceElement - The kanji span that was clicked.
     * @param {string} sourceKanji - The character of the source kanji.
     * @param {Array<object>} words - The array of word data objects to display.
     */
    drawExpansion(sourceElement, sourceKanji, words) {
        const parentNode = sourceElement.parentElement;
        const sourcePos = this.getUnscaledElementCenter(sourceElement);
        if (parentNode.dataset.collapsed === 'true') return;

        parentNode._sourceKanjiOffsetX = sourcePos.ux - parseFloat(parentNode.style.left || 0);
        parentNode._sourceKanjiOffsetY = sourcePos.uy - parseFloat(parentNode.style.top || 0);
        if (parentNode.dataset.isRootNode === 'true') {
            parentNode._sourceKanjiOffsetX = sourcePos.ux;
            parentNode._sourceKanjiOffsetY = sourcePos.uy;
        }

        const expansionRadius = 250;
        const existingChildrenCount = parentNode._children.length; // Count all existing children, including duplicated ones
        const numWords = words.length + existingChildrenCount;

        // Determine the base direction vector
        let baseAngle;
        const grandparentNode = parentNode._parent;
        const angles = []; // Initialize angles array here

        if (grandparentNode) {
            // Existing "pitchfork" logic for subsequent expansions
            const grandparentPos = this.getUnscaledElementCenter(grandparentNode);
            const parentPos = this.getUnscaledElementCenter(parentNode);
            const dx = parentPos.ux - grandparentPos.ux;
            const dy = parentPos.uy - grandparentPos.uy;
            baseAngle = Math.atan2(dy, dx); // Use the existing baseAngle declaration
            const spreadAngle = Math.PI / 6; // 15 degrees

            // For more than 3 children, we widen the total spread.
            // The total spread will be (numWords - 1) * spreadAngle.
            // We start from -(totalSpread / 2) and add spreadAngle for each step.
            const totalSpread = (numWords - 1) * spreadAngle;
            const startAngle = baseAngle - totalSpread / 2;

            for (let i = 0; i < numWords; i++) {
                const angle = startAngle + i * spreadAngle;
                angles.push(angle);
            }
        } else {
            // New radial logic for the initial expansion from the root node
            const angleStep = (2 * Math.PI) / numWords;
            for (let i = 0; i < numWords; i++) {
                // Start from the top ( -PI/2 ) and go clockwise
                angles.push(-Math.PI / 2 + i * angleStep);
            }
        }

        // --- Find available angle slots ---
        const occupiedAngles = new Set();
        const parentCenter = this.getUnscaledElementCenter(parentNode);
        parentNode._children.forEach(child => {
            const childCenter = this.getUnscaledElementCenter(child);
            const dx = childCenter.ux - parentCenter.ux;
            const dy = childCenter.uy - parentCenter.uy;
            const angle = Math.atan2(dy, dx);
            occupiedAngles.add(angle.toFixed(4)); // Use fixed precision to compare angles
        });

        const availableAngles = angles.filter(angle => !occupiedAngles.has(angle.toFixed(4)));

        // Create nodes at the calculated positions
        words.forEach((wordData, i) => { // The index 'i' here is for the new words being added.
            if (i >= availableAngles.length) return; // Should not happen if logic is correct, but a good safeguard.
            const angle = availableAngles[i];
            const nodePos = {
                ux: sourcePos.ux + expansionRadius * Math.cos(angle),
                uy: sourcePos.uy + expansionRadius * Math.sin(angle)
            };

            const line = this.lineCreator.createExpansionLine(sourcePos, nodePos);
            const node = this.nodeCreator.createWordNode(wordData.slug, sourceKanji, line);

            if (wordData.is_consolidated) {
                node.dataset.consolidatedData = JSON.stringify(wordData);
            }

            if (parentNode.dataset.filterType) {
                this.nodeFilterManager.applyInheritedFilter(node, line, parentNode.dataset.filterType, parentNode.dataset.filterClickedKanji);
            }

            this.nodeCreator.positionAndAppendNode(node, parentNode, nodePos);
            this.nodeCreator.fadeInElements(node, line);
            // Ensure the new node is registered as a child for graph traversal logic
            // This was the missing piece for the rerandomize test.
            parentNode._children.push(node);
            this.nodeCreator.refineLineEndpoint(line, node);
        });
    }

    /**
     * Recursively repositions the children and descendants of a selected node
     * to an organized "pitchfork" layout without affecting the rest of the graph.
     * @param {HTMLElement} selectedNode The node whose children should be organized.
     */
    optimizeLayout(selectedNode) {
        this.nodeMovementManager.stopAllGlides();

        const EXPANSION_RADIUS = 200; // A bit smaller to give more room
        const newPositions = new Map(); // Store new positions: node -> {ux, uy}
        const PADDING = 30; // Extra space between nodes
        const ITERATIONS = 10; // How many times to run the collision loop
        const getChildren = (node) => (node && Array.isArray(node._children) ? node._children.filter(c => !c.classList.contains('node-hidden-by-filter')) : []);

        /**
         * First pass: Recursively calculate the new ideal positions for all nodes in the subtree.
         * @param {HTMLElement} node The current node to arrange children for.
         * @param {HTMLElement} parent The parent of the current node (used to determine angle).
         * @param {{ux: number, uy: number}} parentPos The calculated new position of the parent.
         */
        const calculatePositions = (node, parent, parentPos) => {
            const children = getChildren(node);
            if (children.length === 0) return;

            let angles = [];
            // If we are calculating for the direct children of the selected node,
            // and that node is the absolute root of the graph, use a radial layout.
            if (node === selectedNode && node.dataset.isRootNode === 'true') {
                const angleStep = (2 * Math.PI) / children.length;
                for (let i = 0; i < children.length; i++) {
                    angles.push(-Math.PI / 2 + i * angleStep); // Start from top
                }
            } else {
                // Otherwise, use the standard "pitchfork" layout.
                let baseAngle;
                if (parent) {
                    // Calculate direction from the parent's *new* position.
                    const parentCurrentPos = this.getUnscaledElementCenter(parent);
                    const dx = parentPos.ux - parentCurrentPos.ux;
                    const dy = parentPos.uy - parentCurrentPos.uy;
                    baseAngle = Math.atan2(dy, dx);
                } else {
                    // For a non-root node that is the start of optimization, default to pointing up.
                    baseAngle = -Math.PI / 2;
                }

                const spreadAngle = Math.PI / 12; // 15 degrees
                // Use the same dynamic spread as drawExpansion for consistency.
                const totalSpread = (children.length - 1) * spreadAngle;
                const startAngle = baseAngle - totalSpread / 2;

                for (let i = 0; i < children.length; i++) {
                    const angle = startAngle + i * spreadAngle;
                    angles.push(angle);
                }
            }

            // Calculate initial positions
            const childPositions = [];
            children.forEach((child, i) => {
                const angle = angles[i];
                const newChildPos = {
                    ux: parentPos.ux + EXPANSION_RADIUS * Math.cos(angle),
                    uy: parentPos.uy + EXPANSION_RADIUS * Math.sin(angle)
                };
                childPositions.push({ node: child, pos: newChildPos, angle: angle });
            });

            // Set final positions and recurse
            childPositions.forEach(({ node: child, pos: newChildPos }) => {
                newPositions.set(child, newChildPos);
                calculatePositions(child, node, newChildPos); // Recurse with the new calculated position
            });
        };

        /**
         * Iteratively checks for and resolves collisions between all nodes being moved.
         * @param {Array<HTMLElement>} nodesToMove - An array of all nodes in the subtree.
         */
        const resolveCollisions = (nodesToMove) => {
            for (let iter = 0; iter < ITERATIONS; iter++) {
                for (let i = 0; i < nodesToMove.length; i++) {
                    for (let j = i + 1; j < nodesToMove.length; j++) {
                        const nodeA = nodesToMove[i];
                        const nodeB = nodesToMove[j];

                        const posA = newPositions.get(nodeA);
                        const posB = newPositions.get(nodeB);

                        const dx = posB.ux - posA.ux;
                        const dy = posB.uy - posA.uy;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        const requiredDistance = (nodeA.offsetWidth / 2) + (nodeB.offsetWidth / 2) + PADDING;

                        if (distance < requiredDistance) {
                            const overlap = (requiredDistance - distance) / 2;
                            const pushX = (dx / distance) * overlap;
                            const pushY = (dy / distance) * overlap;

                            newPositions.get(nodeA).ux -= pushX;
                            newPositions.get(nodeA).uy -= pushY;
                            newPositions.get(nodeB).ux += pushX;
                            newPositions.get(nodeB).uy += pushY;
                        }
                    }
                }
            }
        };

        // --- Execution ---

        // 1. Start the recursive calculation. The selectedNode's position is the fixed anchor.
        const initialPosition = this.getUnscaledElementCenter(selectedNode);
        newPositions.set(selectedNode, initialPosition);
        calculatePositions(selectedNode, selectedNode._parent, initialPosition);

        // 2. Gather all nodes that will be moved.
        const nodesToMove = Array.from(newPositions.keys()).filter(n => n !== selectedNode);

        // 3. Run the iterative collision resolution on the calculated positions.
        if (nodesToMove.length > 1) {
            resolveCollisions(nodesToMove);
        }

        // 2. Second pass: Apply all the calculated movements.
        // Use a timeout to allow the UI to update (e.g., show spinner) before starting the animation.
        setTimeout(() => {
            newPositions.forEach((newPos, node) => {
                if (node === selectedNode) return; // Don't move the node that was clicked
                this.nodeMovementManager.animateToPosition(node, newPos);
            });
        }, 10); // A small delay is sufficient
    }
}