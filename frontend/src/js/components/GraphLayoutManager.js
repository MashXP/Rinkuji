export class GraphLayoutManager {
    constructor(config) {
        this.nodeCreator = config.nodeCreator;
        this.lineCreator = config.lineCreator;
        this.nodeFilterManager = config.nodeFilterManager;
        this.getUnscaledElementCenter = config.getUnscaledElementCenter;
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

        const expansionRadius = 320; // 20rem * 16px/rem
        const numWords = words.length;

        // Determine the base direction vector
        let baseAngle;
        const grandparentNode = parentNode._parent;

        if (grandparentNode) {
            const grandparentPos = this.getUnscaledElementCenter(grandparentNode);
            const parentPos = this.getUnscaledElementCenter(parentNode);
            const dx = parentPos.ux - grandparentPos.ux;
            const dy = parentPos.uy - grandparentPos.uy;
            baseAngle = Math.atan2(dy, dx);
        } else {
            baseAngle = Math.PI / 2; // Default downwards
        }

        // Calculate angles for the "pitchfork" tines
        const angles = [];
        const spreadAngle = Math.PI / 6; // 30 degrees

        switch (numWords) {
            case 1:
                angles.push(baseAngle);
                break;
            case 2:
                angles.push(baseAngle - spreadAngle / 2);
                angles.push(baseAngle + spreadAngle / 2);
                break;
            default: // 3 or more
                angles.push(baseAngle - spreadAngle);
                angles.push(baseAngle);
                angles.push(baseAngle + spreadAngle);
                break;
        }

        // Create nodes at the calculated positions
        words.forEach((wordData, i) => {
            const angle = angles[i];
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
}