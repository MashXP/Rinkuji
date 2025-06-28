import { CanvasComponent } from './CanvasComponent.js';
import { KanjiSidebar } from './KanjiSidebar.js';
import { NodeFilterManager } from './NodeFilterManager.js';
import { ContextMenuHandler } from './ContextMenuHandler.js';
import { NodeDragHandler } from './NodeDragHandler.js';
import { GraphInitializer } from './GraphInitializer.js';
import { NodeCreator } from './NodeCreator.js';
import { LineCreator } from './LineCreator.js';
import { NodeMovementManager } from './NodeMovementManager.js';
import { NodeDuplicator } from './NodeDuplicator.js';
import { NodeCollapseExpandManager } from './NodeCollapseExpandManager.js';
import { MeaningDisplayManager } from './MeaningDisplayManager.js';

// Class to manage the Rinku Graph functionality (expansion, nodes, sidebar)
export class RinkuGraph extends CanvasComponent {
    constructor(viewport, canvas, wordContainer, svgLayer, nodesContainer, parentKanjiSidebar, parentKanjiSearchInput, parentKanjiListContainer, panZoom) {
        super(viewport, canvas, panZoom); // Initialize properties from CanvasComponent

        this.wordContainer = wordContainer;
        this.svgLayer = svgLayer;
        this.nodesContainer = nodesContainer;
        this.wordContainer.dataset.isRootNode = 'true'; // Mark root node for NodeMovementManager

        this.word = wordContainer.dataset.word;
        this.expandedElements = new Set();

        this.isSearching = false;

        this.kanjiRegex = /[\u4e00-\u9faf]/;

        // State object for NodeMovementManager to access selection circle
        this.graphState = {
            currentSelectionCircle: null, currentSelectionCircleParentNode: null, currentSelectionCircleOffsetX: null, currentSelectionCircleOffsetY: null
        };

        // Initialize NodeMovementManager first, as NodeDragHandler depends on it.
        this.nodeMovementManager = new NodeMovementManager(this.panZoom, this.graphState);

        // Initialize NodeDragHandler, passing the correct move callback.
        this.nodeDragHandler = new NodeDragHandler(
            this._getCanvasCoordinates.bind(this),
            this.nodeMovementManager.moveNodeAndChildren.bind(this.nodeMovementManager)
        );
        // Initialize NodeFilterManager
        this.nodeFilterManager = new NodeFilterManager(this.kanjiRegex);

        // Initialize NodeCollapseExpandManager without the sidebar first to break the circular dependency.
        // We will inject the sidebar into it after the sidebar is created.
        this.nodeCollapseExpandManager = new NodeCollapseExpandManager(this.nodeFilterManager, this.graphState, null, this._clearSelectionCircle.bind(this));

        // Initialize KanjiSidebar, passing the collapse/expand manager for its context menu actions.
        this.kanjiSidebar = new KanjiSidebar(
            parentKanjiSidebar,
            parentKanjiSearchInput,
            parentKanjiListContainer,
            this._focusKanji.bind(this), // Pass RinkuGraph's focus method
            this.centerViewOnElement.bind(this), // Pass RinkuGraph's center method
            this.nodeCollapseExpandManager
        );
        // Now, inject the created sidebar into the manager.
        this.nodeCollapseExpandManager.kanjiSidebar = this.kanjiSidebar;

        // Initialize ContextMenuHandler first, as NodeCreator depends on it.
        this.contextMenuHandler = new ContextMenuHandler(
            document.getElementById('nodeContextMenu'),
            this.kanjiRegex,
            this.nodeCollapseExpandManager.collapseNode.bind(this.nodeCollapseExpandManager),
            this.nodeCollapseExpandManager.expandNode.bind(this.nodeCollapseExpandManager),
            this.nodeFilterManager.filterNodeContent.bind(this.nodeFilterManager)
        );

        // Initialize Meaning Display Manager
        const meaningBar = document.getElementById('meaningBar');
        this.meaningDisplayManager = new MeaningDisplayManager(meaningBar);

        // Initialize LineCreator
        this.lineCreator = new LineCreator(this.svgLayer, this.panZoom);

        // Initialize NodeCreator
        this.nodeCreator = new NodeCreator(
            this.nodesContainer,
            this.kanjiRegex,
            this.kanjiSidebar,
            this.contextMenuHandler,
            this.nodeDragHandler,
            this.panZoom,
            this._addKanjiEventListeners.bind(this),
            this.handleNodeClick.bind(this) // Pass callback for node clicks
        );

        // Initialize NodeDuplicator
        this.nodeDuplicator = new NodeDuplicator(
            this.wordContainer,
            this.kanjiRegex,
            this.kanjiSidebar,
            this.nodeCreator,
            this.lineCreator,
            this.panZoom,
            this._addKanjiEventListeners.bind(this),
            this._focusKanji.bind(this),
            this.handleKanjiClick.bind(this) // Pass RinkuGraph's handleKanjiClick for programmatic calls
        );

        this.graphInitializer = new GraphInitializer(this.wordContainer, this.kanjiRegex, this._addKanjiEventListeners.bind(this));
        this.graphInitializer.initialize();
        this.addEventListeners();
    }

    _addKanjiEventListeners(kanjiSpan) {
        kanjiSpan.addEventListener('click', this.handleKanjiClick.bind(this));
        kanjiSpan.addEventListener('dblclick', this.handleKanjiDoubleClick.bind(this));
    }

    async handleKanjiClick(e, isProgrammatic = false) {
        const kanjiElement = e.currentTarget;

        // Block concurrent user clicks, but allow programmatic ones
        if (!isProgrammatic && (this.isSearching || this.nodeDragHandler.hasDragOccurred())) {
            console.log('Search in progress. Ignoring user click.');
            return;
        }

        try {
            if (!isProgrammatic) {
                this.isSearching = true;
                kanjiElement.classList.add('kanji-loading');
            }

            const kanjiChar = kanjiElement.textContent;
            const parentNode = kanjiElement.parentElement;
            const isRootNode = parentNode === this.wordContainer;
            const expandedKanjiCount = parentNode.querySelectorAll('.active-source-kanji, .expanded-parent-kanji').length;

            let isRootLikeNode = isRootNode;
            if (!isRootNode) {
                // A child node is "root-like" if its word doesn't contain the kanji that created it.
                const word = parentNode.dataset.wordSlug;
                const sourceKanji = parentNode.dataset.sourceKanji;
                if (word && sourceKanji && !word.includes(sourceKanji)) {
                    isRootLikeNode = true;
                }
            }

            let shouldDuplicate = false;
            if (isRootLikeNode) {
                shouldDuplicate = expandedKanjiCount >= 1;
            } else {
                shouldDuplicate = expandedKanjiCount > 1;
            }

            if (kanjiElement.classList.contains('kanji-char') && shouldDuplicate && !isProgrammatic) { // Only allow user clicks to trigger duplication
                await this.nodeDuplicator.duplicateAndExpandNode(parentNode, kanjiElement);
                return;
            }

            console.log(`Clicked kanji: ${kanjiChar}`);
            const relatedWords = await this.fetchRelatedWords(kanjiChar);

            if (relatedWords.length > 0) {
                this._focusKanji(kanjiElement);
                this.drawExpansion(kanjiElement, kanjiChar, relatedWords);
                kanjiElement.classList.remove('kanji-char');
                if (!this.expandedElements.has(kanjiElement)) {
                    this.expandedElements.add(kanjiElement);
                } // Mark as processed (for double-click centering)
                kanjiElement.classList.add('active-source-kanji');

                if (!this.kanjiSidebar.hasParentKanji(kanjiChar)) {
                    this.kanjiSidebar.addKanji(kanjiChar, kanjiElement.parentElement);
                }
                console.log(`Expanded ${kanjiChar} with ${relatedWords.length} words.`);
            } else {
                console.log(`Kanji ${kanjiChar} has no new expansions. Marking as expanded-parent-kanji.`);
                kanjiElement.classList.remove('kanji-char');
                if (!this.expandedElements.has(kanjiElement)) {
                    this.expandedElements.add(kanjiElement);
                }
                kanjiElement.classList.add('expanded-parent-kanji');
            }

            const grandparentNode = parentNode._parent;
            if (grandparentNode && grandparentNode.dataset.filterType === 'kanji') {
                const parentWord = parentNode.dataset.wordSlug;
                const containsKanji = this.kanjiRegex.test(parentWord);
                const isPureKanji = this.nodeFilterManager._isKanjiOnly(parentWord);

                if (containsKanji && !isPureKanji && parentNode._children.length > 0) {
                    parentNode.classList.remove('node-hidden-by-filter');
                    parentNode.classList.add('mixed-content-node');
                    this.nodeFilterManager.setNodeVisibility(parentNode, true);
                }
            }
        } catch (error) {
            console.error("An error occurred during kanji click handling:", error);
        } finally {
            if (!isProgrammatic) {
                this.isSearching = false;
                kanjiElement.classList.remove('kanji-loading');
            }
        }
    }

    // --- Data Fetching ---

    async fetchRelatedWords(kanjiChar) {
        try {
            const response = await fetch(`/search_by_kanji?kanji=${encodeURIComponent(kanjiChar)}`);
            if (!response.ok) {
                throw new Error(`API error for ${kanjiChar}: ${response.status}`);
            }
            const results = await response.json();
            console.log(`API response for ${kanjiChar}:`, results);

            const existingSlugs = new Set(Array.from(this.nodesContainer.querySelectorAll('[data-word-slug]')).map(n => n.dataset.wordSlug));
            existingSlugs.add(this.word);

            return results.data.filter(item => !existingSlugs.has(item.slug));
        } catch (error) {
            console.error('Failed to expand kanji:', error);
            return [];
        }
    }

    // --- Drawing and DOM Manipulation ---

    drawExpansion(sourceElement, sourceKanji, words) {
        const parentNode = sourceElement.parentElement;
        const sourcePos = this._getUnscaledElementCenter(sourceElement);
        if (parentNode.dataset.collapsed === 'true') return;
        
        parentNode._sourceKanjiOffsetX = sourcePos.ux - parseFloat(parentNode.style.left || 0);
        parentNode._sourceKanjiOffsetY = sourcePos.uy - parseFloat(parentNode.style.top || 0);
        if (parentNode.dataset.isRootNode === 'true') {
            parentNode._sourceKanjiOffsetX = sourcePos.ux;
            parentNode._sourceKanjiOffsetY = sourcePos.uy;
        }

        const expansionRadius = 320; // 20rem * 16px/rem
        const numWords = words.length;

        words.forEach((wordData, i) => {
            const angle = (2 * Math.PI / numWords) * i - (Math.PI / 2);
            const nodePos = {
                ux: sourcePos.ux + expansionRadius * Math.cos(angle),
                uy: sourcePos.uy + expansionRadius * Math.sin(angle)
            };

            const line = this.lineCreator.createExpansionLine(sourcePos, nodePos);
            const node = this.nodeCreator.createWordNode(wordData.slug, sourceKanji, line);

            if (parentNode.dataset.filterType) {
                this.nodeFilterManager.applyInheritedFilter(node, line, parentNode.dataset.filterType, parentNode.dataset.filterClickedKanji);
            }

            this.nodeCreator.positionAndAppendNode(node, parentNode, nodePos);
            this.nodeCreator.fadeInElements(line, node);
            this.nodeCreator.refineLineEndpoint(line, node);
        });
    }

    /**
     * Handles a click on the node itself (not a kanji span).
     * @param {HTMLElement} node - The node that was clicked.
     * @param {MouseEvent} e - The click event.
     */
    handleNodeClick(node, e) {
        // If the click target was a Kanji span, it's a kanji click, which is handled separately. Do nothing.
        // Clicks on non-kanji spans will fall through and show the node's meaning.
        if (e.target.tagName === 'SPAN' && this.kanjiRegex.test(e.target.textContent)) {
            return;
        }
        this.meaningDisplayManager.showMeaning(node.dataset.wordSlug || this.word);
    }
    /**
     * Clears the currently active selection circle from the SVG layer and resets its state.
     */
    _clearSelectionCircle() {
        if (this.graphState.currentSelectionCircle && this.graphState.currentSelectionCircle.parentNode) {
            this.graphState.currentSelectionCircle.parentNode.removeChild(this.graphState.currentSelectionCircle);
        }
        this.graphState.currentSelectionCircle = null;
        this.graphState.currentSelectionCircleParentNode = null;
    }
    _focusKanji(kanjiElement) {
        if (this.graphState.currentSelectionCircle && this.graphState.currentSelectionCircle.parentNode) {
            this.graphState.currentSelectionCircle.parentNode.removeChild(this.graphState.currentSelectionCircle);
        }
        this.graphState.currentSelectionCircle = null;
        this.graphState.currentSelectionCircleParentNode = null;
        this.graphState.currentSelectionCircleOffsetX = null;
        this.graphState.currentSelectionCircleOffsetY = null;

        const sourcePos = this._getUnscaledElementCenter(kanjiElement);
        const parentNode = kanjiElement.parentElement;

        const circle = this.lineCreator.createSelectionCircleSVG(kanjiElement, sourcePos);
        this.svgLayer.appendChild(circle);

        this.graphState.currentSelectionCircle = circle;
        this.graphState.currentSelectionCircleParentNode = parentNode;
        this.graphState.currentSelectionCircleOffsetX = sourcePos.ux - parseFloat(parentNode.style.left || 0);
        this.graphState.currentSelectionCircleOffsetY = sourcePos.uy - parseFloat(parentNode.style.top || 0);

        if (parentNode.dataset.isRootNode === 'true') {
            this.graphState.currentSelectionCircleOffsetX = sourcePos.ux;
            this.graphState.currentSelectionCircleOffsetY = sourcePos.uy;
        }

        requestAnimationFrame(() => {
            circle.style.opacity = 1;
        });
    }

    centerViewOnElement(element) {
        this.canvas.style.transition = 'transform 0.5s ease-in-out';

        let element_ux, element_uy;

        if (element.dataset.isRootNode === 'true') {
            element_ux = 0;
            element_uy = 0;
        } else {
            element_ux = parseFloat(element.style.left);
            element_uy = parseFloat(element.style.top);
        }

        const newScale = 1.0;

        this.panZoom.pointX = -element_ux * newScale;
        this.panZoom.pointY = -element_uy * newScale;
        this.panZoom.scale = newScale;

        this.panZoom.setTransform();

        setTimeout(() => {
            this.canvas.style.transition = 'transform 0.1s ease-out';
        }, 500);
    }

    handleKanjiDoubleClick(e) {
        const kanjiElement = e.currentTarget; // This will be the span element
        if (kanjiElement.classList.contains('active-source-kanji') || kanjiElement.classList.contains('expanded-parent-kanji')) {
            e.stopPropagation();
            const nodeToCenterOn = kanjiElement.parentElement;
            this._focusKanji(kanjiElement);
            this.centerViewOnElement(nodeToCenterOn);
        }
    }

    addEventListeners() {
        // Add contextmenu listener to the root word
        this.wordContainer.addEventListener('contextmenu', (e) => {
            this.contextMenuHandler.handleContextMenu(e);
        });

        // Add click listener to the root word for showing its meaning
        this.wordContainer.addEventListener('click', (e) => {
            // The root node isn't draggable by default, but this check ensures
            // consistency if that functionality is added later.
            if (!this.nodeDragHandler.hasDragOccurred()) {
                this.handleNodeClick(this.wordContainer, e);
            }
        });

        // Mousemove for dragging nodes AND panning
        this.viewport.addEventListener('mousemove', (e) => {
            const dragHandled = this.nodeDragHandler.handleMouseMove(e);
            if (!dragHandled) {
                this.panZoom.handlePanMouseMove(e);
            }
        });

        // Add listener to viewport to hide meaning bar on background click
        this.viewport.addEventListener('mousedown', (e) => {
            if (e.target === this.viewport) {
                this.meaningDisplayManager.hideMeaning();
            }
        });

        this.viewport.addEventListener('mouseup', this.nodeDragHandler.handleMouseUpOrLeave.bind(this.nodeDragHandler));
        this.viewport.addEventListener('mouseleave', this.nodeDragHandler.handleMouseUpOrLeave.bind(this.nodeDragHandler));
    }
}