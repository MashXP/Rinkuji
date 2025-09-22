export class NodeCreator {
    /**
     * @param {HTMLElement} nodesContainer - The container for all graph nodes.
     * @param {RegExp} kanjiRegex - Regular expression to test for Kanji characters.
     * @param {KanjiSidebar} kanjiSidebar - Instance of KanjiSidebar for checking parent Kanji.
     * @param {ContextMenuHandler} contextMenuHandler - Instance of ContextMenuHandler for node context menus.
     * @param {NodeDragHandler} nodeDragHandler - Instance of NodeDragHandler for making nodes draggable.
     * @param {PanZoom} panZoom - Instance of PanZoom for coordinate calculations.
     * @param {function(HTMLElement): void} addKanjiEventListeners - Callback to add event listeners to Kanji spans within nodes.
     * @param {function(HTMLElement, MouseEvent): void} onNodeClickCallback - Callback for when a node itself is clicked.
     */
    constructor(nodesContainer, kanjiRegex, kanjiSidebar, contextMenuHandler, nodeDragHandler, panZoom, addKanjiEventListeners, onNodeClickCallback) {
        this.nodesContainer = nodesContainer;
        this.kanjiRegex = kanjiRegex;
        this.kanjiSidebar = kanjiSidebar;
        this.contextMenuHandler = contextMenuHandler;
        this.nodeDragHandler = nodeDragHandler;
        this.panZoom = panZoom;
        this.addKanjiEventListeners = addKanjiEventListeners;
        this.onNodeClickCallback = onNodeClickCallback;
    }

    /**
     * Creates a new word node HTML element.
     * @param {string} wordString - The word slug for the node.
     * @param {string} sourceKanji - The Kanji character that created this node.
     * @param {SVGLineElement} lineElement - The SVG line connecting to this node.
     * @returns {HTMLElement} The created node element.
     */
    createWordNode(wordString, sourceKanji, lineElement) {
        const node = document.createElement('div');
        node.classList.add('expanded-node');
        node.dataset.wordSlug = wordString;
        node.dataset.sourceKanji = sourceKanji;
        node._parent = null; // Custom property for graph structure
        node._children = []; // Custom property for graph structure
        node.lineElement = lineElement; // Store reference to the connecting line

        node.addEventListener('contextmenu', (e) => {
            this.contextMenuHandler.handleContextMenu(e);
        });
        this.nodeDragHandler.addDragHandlersToNode(node);

        // Add click listener for showing definitions
        node.addEventListener('click', (e) => {
            // Only fire if a drag did not occur
            if (!this.nodeDragHandler.hasDragOccurred()) {
                this.onNodeClickCallback(node, e);
            }
        });

        // Add touchend listener for showing definitions on mobile
        node.addEventListener('touchend', (e) => {
            // Only fire if a drag did not occur
            if (!this.nodeDragHandler.hasDragOccurred()) {
                this.onNodeClickCallback(node, e);
            }
        });

        wordString.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.textContent = char;

            if (this.kanjiRegex.test(char)) {
                if (char === sourceKanji) {
                    charSpan.classList.remove('kanji-char');
                    charSpan.classList.add('active-source-kanji');
                } else if (this.kanjiSidebar.hasParentKanji(char)) {
                    charSpan.classList.remove('kanji-char');
                    charSpan.classList.add('expanded-parent-kanji');
                } else {
                    charSpan.classList.add('kanji-char');
                }
                this.addKanjiEventListeners(charSpan);
            }
            node.appendChild(charSpan);
        });
        return node;
    }

    /**
     * Positions and appends a node to the DOM, establishing parent-child relationship.
     * @param {HTMLElement} node - The node to position and append.
     * @param {HTMLElement} parentNode - The parent node in the graph structure.
     * @param {{ux: number, uy: number}} position - The unscaled canvas coordinates for the node.
     */
    positionAndAppendNode(node, parentNode, position) {
        node._parent = parentNode;
        parentNode._children.push(node);
        node.style.left = `${position.ux}px`;
        node.style.top = `${position.uy}px`;
        node.style.transform = 'translate(-50%, -50%)';
        this.nodesContainer.appendChild(node);
    }

    /**
     * Fades in a node and its connecting line.
     * @param {HTMLElement} node - The node element.
     * @param {SVGLineElement} line - The line element.
     */
    fadeInElements(node, line) {
        if (node && node.classList.contains('node-hidden-by-filter')) {
            node.style.opacity = 0;
            node.style.display = 'none';
            if (line) {
                line.style.opacity = 0;
                line.style.display = 'none';
            }
            return;
        }

        requestAnimationFrame(() => {
            if (node) node.style.opacity = 1;
            if (line) line.style.opacity = 1;
        });
    }

    /**
     * Refines the endpoint of a line to connect precisely to the center of a target Kanji span.
     * @param {SVGLineElement} line - The line to refine.
     * @param {HTMLElement} targetNode - The node containing the target Kanji span.
     */
    refineLineEndpoint(line, targetNode) {
        requestAnimationFrame(() => {
            const targetKanjiSpan = targetNode.querySelector('.active-source-kanji');
            if (targetKanjiSpan) {
                const targetPos = this._getUnscaledElementCenter(targetKanjiSpan);
                line.setAttribute('x2', targetPos.ux);
                line.setAttribute('y2', targetPos.uy);
            }
        });
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