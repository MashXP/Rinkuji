import { CanvasComponent } from './CanvasComponent.js';
import { KanjiSidebar } from './KanjiSidebar.js';
import { NodeFilterManager } from '../managers/NodeFilterManager.js';
import { ContextMenuHandler } from '../managers/ContextMenuHandler.js';
import { NodeDragHandler } from '../utils/NodeDragHandler.js';
import { GraphInitializer } from './GraphInitializer.js';
import { NodeCreator } from '../utils/NodeCreator.js';
import { LineCreator } from '../utils/LineCreator.js';
import { NodeMovementManager } from '../managers/NodeMovementManager.js';
import { NodeDuplicator } from '../utils/NodeDuplicator.js';
import { NodeCollapseExpandManager } from '../managers/NodeCollapseExpandManager.js';
import { MeaningDisplayManager } from '../managers/MeaningDisplayManager.js';
import { GraphExpansionManager } from './GraphExpansionManager.js';
import { GraphLayoutManager } from './GraphLayoutManager.js';
import { GraphViewManager } from './GraphViewManager.js';

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
        this.MAX_WORDS_TO_DISPLAY = 3;

        this.kanjiRegex = /[\u4e00-\u9faf]/;

        // State object for NodeMovementManager to access selection circle
        this.graphState = {
            currentSelectionCircle: null, currentSelectionCircleParentNode: null, currentSelectionCircleOffsetX: null, currentSelectionCircleOffsetY: null
        };

        // Initialize new managers
        this.viewManager = new GraphViewManager({
            graphState: this.graphState,
            svgLayer: this.svgLayer,
            canvas: this.canvas,
            panZoom: this.panZoom,
            lineCreator: new LineCreator(this.svgLayer, this.panZoom),
            getUnscaledElementCenter: this._getUnscaledElementCenter.bind(this)
        });

        // Initialize NodeFilterManager once and reuse it.
        this.nodeFilterManager = new NodeFilterManager(this.kanjiRegex);

        this.layoutManager = new GraphLayoutManager({
            nodeCreator: null, // Will be set below
            lineCreator: new LineCreator(this.svgLayer, this.panZoom),
            nodeFilterManager: this.nodeFilterManager,
            getUnscaledElementCenter: this._getUnscaledElementCenter.bind(this)
        });

        // Initialize NodeMovementManager first, as NodeDragHandler depends on it.
        this.nodeMovementManager = new NodeMovementManager(this.panZoom, this.graphState);

        // Initialize NodeDragHandler, passing the correct move callback.
        this.nodeDragHandler = new NodeDragHandler(
            this._getCanvasCoordinates.bind(this),
            this.nodeMovementManager.moveNodeAndChildren.bind(this.nodeMovementManager)
        );

        // Initialize NodeCollapseExpandManager without the sidebar first to break the circular dependency.
        // We will inject the sidebar into it after the sidebar is created.
        this.nodeCollapseExpandManager = new NodeCollapseExpandManager(this.nodeFilterManager, this.graphState, null, this.viewManager.clearSelectionCircle.bind(this.viewManager));

        // Initialize KanjiSidebar, passing the collapse/expand manager for its context menu actions.
        this.kanjiSidebar = new KanjiSidebar(
            parentKanjiSidebar,
            parentKanjiSearchInput,
            parentKanjiListContainer,
            this.viewManager.focusKanji.bind(this.viewManager),
            this.viewManager.centerViewOnElement.bind(this.viewManager),
            this.nodeCollapseExpandManager
        );
        // Now, inject the created sidebar into the manager.
        this.nodeCollapseExpandManager.kanjiSidebar = this.kanjiSidebar;

        // Initialize ContextMenuHandler first, as NodeCreator depends on it.
        this.contextMenuHandler = new ContextMenuHandler(
            document.getElementById('nodeContextMenu'),
            this.kanjiRegex,
            (node) => this.nodeCollapseExpandManager.collapseNode(node),
            (node) => this.nodeCollapseExpandManager.expandNode(node),
            (node, filterType, clickedKanji) => this.nodeFilterManager.filterNodeContent(node, filterType, clickedKanji),
            (sourceKanjiElement) => this.expansionManager.rerandomizeNode(sourceKanjiElement) // This ensures the latest method is called
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
            // prettier-ignore
            this.kanjiSidebar,
            this.nodeCreator, // Set below
            new LineCreator(this.svgLayer, this.panZoom),
            this.panZoom,
            this._addKanjiEventListeners.bind(this),
            this.viewManager.focusKanji.bind(this.viewManager),
            (e, isProgrammatic) => this.expansionManager.handleKanjiClick(e, isProgrammatic)
        );

        // Initialize the main expansion logic manager
        this.expansionManager = new GraphExpansionManager({
            graph: this,
            nodeDuplicator: this.nodeDuplicator,
            kanjiSidebar: this.kanjiSidebar,
            layoutManager: this.layoutManager,
            viewManager: this.viewManager,
            kanjiRegex: this.kanjiRegex,
            MAX_WORDS_TO_DISPLAY: this.MAX_WORDS_TO_DISPLAY
        });
        this.layoutManager.nodeCreator = this.nodeCreator;

        this.graphInitializer = new GraphInitializer(this.wordContainer, this.kanjiRegex, this._addKanjiEventListeners.bind(this));
        this.graphInitializer.initialize();
        this.addEventListeners();
    }

    _addKanjiEventListeners(kanjiSpan) {
        kanjiSpan.addEventListener('click', (e) => this.expansionManager.handleKanjiClick(e));
        kanjiSpan.addEventListener('dblclick', (e) => this.handleKanjiDoubleClick(e));
        kanjiSpan.addEventListener('touchend', (e) => this.expansionManager.handleKanjiClick(e));
    }

    _isRootLikeNode(node) {
        if (node.dataset.isRootNode === 'true' || node === this.wordContainer) {
            return true;
        }
        // A child node is "root-like" if its word doesn't contain the kanji that created it.
        const word = node.dataset.wordSlug;
        const sourceKanji = node.dataset.sourceKanji;
        return word && sourceKanji && !word.includes(sourceKanji);
    }

    _updateParentVisibilityAfterExpansion(parentNode) {
        const grandparentNode = parentNode._parent;
        if (!grandparentNode || grandparentNode.dataset.filterType !== 'kanji') {
            return;
        }

        const parentWord = parentNode.dataset.wordSlug;
        const containsKanji = this.kanjiRegex.test(parentWord);
        const isPureKanji = this.nodeFilterManager._isKanjiOnly(parentWord);

        if (containsKanji && !isPureKanji && parentNode._children.length > 0) {
            parentNode.classList.remove('node-hidden-by-filter');
            parentNode.classList.add('mixed-content-node');
            this.nodeFilterManager.setNodeVisibility(parentNode, true);
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

        // Check if the node has consolidated data
        if (node.dataset.consolidatedData) {
            const consolidatedData = JSON.parse(node.dataset.consolidatedData);
            this.meaningDisplayManager.showMeaning(consolidatedData.slug, consolidatedData);
        } else {
            this.meaningDisplayManager.showMeaning(node.dataset.wordSlug || this.word);
        }
    }

    handleKanjiDoubleClick(e) {
        const kanjiElement = e.currentTarget; // This will be the span element
        if (kanjiElement.classList.contains('active-source-kanji') || kanjiElement.classList.contains('expanded-parent-kanji')) {
            e.stopPropagation();
            const nodeToCenterOn = kanjiElement.parentElement;
            // Delegate to the view manager
            this.viewManager.focusKanji(kanjiElement);
            this.viewManager.centerViewOnElement(nodeToCenterOn);
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

        // Add touchend listener to the root word for showing its meaning on mobile
        this.wordContainer.addEventListener('touchend', (e) => {
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
    }
}