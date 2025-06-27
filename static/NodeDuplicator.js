export class NodeDuplicator {
    /**
     * @param {HTMLElement} wordContainer - The root word container.
     * @param {RegExp} kanjiRegex - Regular expression for Kanji.
     * @param {KanjiSidebar} kanjiSidebar - Instance of KanjiSidebar.
     * @param {NodeCreator} nodeCreator - Instance of NodeCreator.
     * @param {LineCreator} lineCreator - Instance of LineCreator.
     * @param {PanZoom} panZoom - Instance of PanZoom for coordinate calculations.
     * @param {function(HTMLElement): void} addKanjiEventListeners - Callback to add event listeners to Kanji spans.
     * @param {function(HTMLElement): void} focusKanjiCallback - Callback to focus on a Kanji.
     * @param {function(Event, boolean): Promise<void>} handleKanjiClickCallback - Callback to programmatically trigger Kanji expansion.
     */
    constructor(wordContainer, kanjiRegex, kanjiSidebar, nodeCreator, lineCreator, panZoom, addKanjiEventListeners, focusKanjiCallback, handleKanjiClickCallback) {
        this.wordContainer = wordContainer;
        this.kanjiRegex = kanjiRegex;
        this.kanjiSidebar = kanjiSidebar;
        this.nodeCreator = nodeCreator;
        this.lineCreator = lineCreator;
        this.panZoom = panZoom;
        this.addKanjiEventListeners = addKanjiEventListeners;
        this.focusKanjiCallback = focusKanjiCallback;
        this.handleKanjiClickCallback = handleKanjiClickCallback;
    }

    /**
     * Duplicates an existing node and expands a specific Kanji within the new node.
     * @param {HTMLElement} originalNode - The node to duplicate.
     * @param {HTMLElement} clickedKanjiElement - The Kanji span element that triggered the duplication.
     */
    async duplicateAndExpandNode(originalNode, clickedKanjiElement) {
        const originalWordString = originalNode.dataset.wordSlug || this.wordContainer.dataset.word;
        const clickedKanjiChar = clickedKanjiElement.textContent;

        console.log(`Duplicating node for word "${originalWordString}" to expand kanji "${clickedKanjiChar}"`);

        const originalNodeCenter = this._getUnscaledElementCenter(originalNode);
        const originalLineStartX = originalNodeCenter.ux;
        const originalLineStartY = originalNodeCenter.uy;

        const offsetY = 200;
        const newNode_ux = originalLineStartX;
        const newNode_uy = originalLineStartY + offsetY;

        const createdNode = this.nodeCreator.createWordNode(originalWordString, clickedKanjiChar, null);
        this.nodeCreator.positionAndAppendNode(createdNode, originalNode, { ux: newNode_ux, uy: newNode_uy });
        createdNode.style.opacity = 0;

        let targetKanjiSpanInNewNode = null;
        createdNode.querySelectorAll('span').forEach(span => {
            if (span.textContent === clickedKanjiChar && this.kanjiRegex.test(span.textContent)) {
                if (span.classList.contains('active-source-kanji')) {
                    targetKanjiSpanInNewNode = span;
                }
            }
        });

        const originalActiveSourceKanji = originalNode.querySelector('.active-source-kanji');
        originalNode.querySelectorAll('span').forEach(span => {
            if (span === originalActiveSourceKanji) {
                return;
            }
            span.classList.remove('kanji-char', 'active-source-kanji', 'expanded-parent-kanji');
            span.classList.add('inactive-kanji');
        });

        const linkingLine = this.lineCreator.createExpansionLine({ ux: originalLineStartX, uy: originalLineStartY }, { ux: newNode_ux, uy: newNode_uy });
        linkingLine.classList.remove('expansion-line');
        linkingLine.classList.add('linking-line');

        createdNode._linkingLineToOriginal = linkingLine;
        if (!originalNode._linkingLinesFromThisNode) originalNode._linkingLinesFromThisNode = [];
        originalNode._linkingLinesFromThisNode.push(linkingLine);

        this.nodeCreator.fadeInElements(createdNode, linkingLine);

        if (targetKanjiSpanInNewNode) {
            await this.handleKanjiClickCallback({ currentTarget: targetKanjiSpanInNewNode }, true);
        }
    }

    /**
     * Utility method to get the center of an element in unscaled canvas coordinates.
     * @param {HTMLElement} element - The HTML element to get the center of.
     * @returns {{ux: number, uy: number}} - Unscaled x and y coordinates of the element's center.
     */
    _getUnscaledElementCenter(element) {
        const canvasRect = this.panZoom.canvas.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();
        const scale = this.panZoom.getScale();

        const vx = elemRect.left + elemRect.width / 2;
        const vy = elemRect.top + elemRect.height / 2;

        const ux = (vx - canvasRect.left) / scale;
        const uy = (vy - canvasRect.top) / scale;

        return { ux, uy };
    }
}