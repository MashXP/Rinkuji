export class ContextMenuHandler {
    /**
     * @param {HTMLElement} nodeContextMenu - The context menu DOM element.
     * @param {RegExp} kanjiRegex - Regular expression to test for Kanji characters.
     * @param {function(HTMLElement): void} collapseNodeCallback - Callback to collapse a node.
     * @param {function(HTMLElement): void} expandNodeCallback - Callback to expand a node.
     * @param {function(HTMLElement, 'all'|'kanji'|'start-kanji', string|null): void} filterNodeContentCallback - Callback to filter node content.
     * @param {function(HTMLElement): void} rerandomizeNodeCallback - Callback to rerandomize child nodes.
     */
    constructor(nodeContextMenu, kanjiRegex, collapseNodeCallback, expandNodeCallback, filterNodeContentCallback, rerandomizeNodeCallback) {
        this.nodeContextMenu = nodeContextMenu;
        this.kanjiRegex = kanjiRegex;
        this.collapseNodeCallback = collapseNodeCallback;
        this.expandNodeCallback = expandNodeCallback;
        this.filterNodeContentCallback = filterNodeContentCallback;
        this.rerandomizeNodeCallback = rerandomizeNodeCallback;

        this.activeContextMenuNode = null; // The node that the context menu is currently open for
        this.activeContextMenuKanji = null; // The specific kanji span that was right-clicked

        this.touchstartTime = 0;
        this.longPressTimer = null;

        this.addEventListeners();
    }

    /**
     * Handles showing the context menu on right-click.
     * @param {MouseEvent} e - The mouse event.
     */
    handleContextMenu(e) {
        // Hide any previously open context menu
        this.hideContextMenu();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Check if right-click was on a word node or kanji span
        let targetNode = e.target.closest('.expanded-node, #rinkuWord');
        let targetKanji = e.target.closest('span'); // Check if a kanji span was clicked

        if (targetNode) {
            e.preventDefault(); // Prevent default browser context menu
            this.activeContextMenuNode = targetNode;
            // Ensure targetKanji is actually part of the targetNode
            this.activeContextMenuKanji = targetKanji && targetNode.contains(targetKanji) ? targetKanji : null;

            // Position the context menu
            this.nodeContextMenu.style.left = `${e.clientX}px`;
            this.nodeContextMenu.style.top = `${e.clientY}px`;
            this.nodeContextMenu.style.display = 'block';

            // Update Collapse/Expand button visibility
            const collapseBtn = this.nodeContextMenu.querySelector('[data-action="collapse"]');
            const expandBtn = this.nodeContextMenu.querySelector('[data-action="expand"]');
            if (targetNode.dataset.collapsed === 'true') {
                collapseBtn.style.display = 'none';
                expandBtn.style.display = 'block';
            } else {
                collapseBtn.style.display = 'block';
                expandBtn.style.display = 'none';
            }

            // Update "Start from Clicked Kanji" option visibility
            const filterStartKanjiBtn = this.nodeContextMenu.querySelector('[data-action="filter-start-kanji"]');
            if (this.activeContextMenuKanji && this.kanjiRegex.test(this.activeContextMenuKanji.textContent)) {
                filterStartKanjiBtn.style.display = 'block';
            } else {
                filterStartKanjiBtn.style.display = 'none';
            }

            // --- Update "Randomize" option visibility ---
            const randomizeBtn = this.nodeContextMenu.querySelector('[data-action="randomize"]');
            let kanjiToRandomize = null;

            if (this.activeContextMenuKanji && this.activeContextMenuKanji.dataset.hasMoreWords === 'true') {
                // Case 1: User right-clicked directly on an eligible kanji.
                kanjiToRandomize = this.activeContextMenuKanji;
            } else if (!this.activeContextMenuKanji && this.activeContextMenuNode) {
                // Case 2: User right-clicked the node background.
                // Check if there's exactly one unambiguous, randomizable source kanji in this node.
                const eligibleKanjis = this.activeContextMenuNode.querySelectorAll('.active-source-kanji[data-has-more-words="true"]');
                if (eligibleKanjis.length === 1) {
                    kanjiToRandomize = eligibleKanjis[0];
                }
            }

            if (kanjiToRandomize) {
                randomizeBtn.style.display = 'block';
                // Temporarily store the target kanji on the button itself for the click handler.
                randomizeBtn._targetKanji = kanjiToRandomize;
            } else {
                randomizeBtn.style.display = 'none';
                delete randomizeBtn._targetKanji; // Clean up
            }
        }
    }

    /**
     * Hides the context menu.
     */
    hideContextMenu() {
        this.nodeContextMenu.style.display = 'none';
        this.activeContextMenuNode = null;
        this.activeContextMenuKanji = null;

        // Clean up any temporary data on the context menu items
        const randomizeBtn = this.nodeContextMenu.querySelector('[data-action="randomize"]');
        if (randomizeBtn) {
            delete randomizeBtn._targetKanji;
        }
    }

    /**
     * Handles clicks on context menu items.
     * @param {MouseEvent} e - The mouse event.
     */
    handleContextMenuItemClick(e) {
        const action = e.target.dataset.action;
        if (!action || !this.activeContextMenuNode) return;

        e.stopPropagation(); // Prevent hideContextMenu from being called immediately by document click

        switch (action) {
            case 'collapse':
                this.collapseNodeCallback(this.activeContextMenuNode);
                break;
            case 'expand':
                this.expandNodeCallback(this.activeContextMenuNode);
                break;
            case 'filter-all':
                this.filterNodeContentCallback(this.activeContextMenuNode, 'all');
                break;
            case 'filter-kanji':
                this.filterNodeContentCallback(this.activeContextMenuNode, 'kanji');
                break;
            case 'filter-start-kanji':
                if (this.activeContextMenuKanji) {
                    this.filterNodeContentCallback(this.activeContextMenuNode, 'start-kanji', this.activeContextMenuKanji.textContent);
                }
                break;
            case 'randomize':
                // The target kanji was stored on the button element itself
                const targetKanji = e.target._targetKanji;
                if (targetKanji) {
                    this.rerandomizeNodeCallback(targetKanji);
                }
                break;
        }
        this.hideContextMenu(); // Hide menu after action
    }

    handleTouchStart(e) {
        this.touchstartTime = Date.now();
        this.longPressTimer = setTimeout(() => {
            this.handleContextMenu(e);
        }, 500);
    }

    handleTouchEnd(e) {
        clearTimeout(this.longPressTimer);
    }

    handleTouchMove(e) {
        clearTimeout(this.longPressTimer);
    }

    addEventListeners() {
        // Event listener for clicks on context menu items
        this.nodeContextMenu.addEventListener('click', this.handleContextMenuItemClick.bind(this));
        // Event listener to hide context menu when clicking anywhere else on the document
        document.addEventListener('click', this.hideContextMenu.bind(this));

        // Touch events for long press
        document.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
    }
}