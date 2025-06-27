export class KanjiSidebar {
    /**
     * @param {HTMLElement} sidebarElement - The main sidebar DOM element.
     * @param {HTMLElement} toggleButton - The button to toggle the sidebar.
     * @param {HTMLInputElement} searchInput - The input field for searching Kanji.
     * @param {HTMLElement} kanjiListContainer - The container for the list of Kanji entries.
     * @param {function(HTMLElement): void} focusKanjiCallback - Callback to focus on a Kanji in the graph.
     * @param {function(HTMLElement): void} centerViewCallback - Callback to center the view on a node.
     * @param {NodeCollapseExpandManager} nodeCollapseExpandManager - Instance of NodeCollapseExpandManager.
     */
    constructor(sidebarElement, toggleButton, searchInput, kanjiListContainer, focusKanjiCallback, centerViewCallback, nodeCollapseExpandManager) {
        this.sidebarElement = sidebarElement;
        this.toggleButton = toggleButton;
        this.searchInput = searchInput;
        this.kanjiListContainer = kanjiListContainer;
        this.focusKanjiCallback = focusKanjiCallback;
        this.centerViewCallback = centerViewCallback;
        this.nodeCollapseExpandManager = nodeCollapseExpandManager; // Store reference

        this.parentKanjiMap = new Map(); // Tracks all kanji used as expansion parents and their first expanded node
        this.activeSidebarNode = null; // The node associated with the currently active context menu

        this._setupEventListeners();
        this._createContextMenu(); // Setup the sidebar's context menu
        this._updateToggleButton(); // Set initial state of the button
    }

    /**
     * Adds a Kanji character and its associated node to the map, then updates the list.
     * @param {string} kanjiChar - The Kanji character.
     * @param {HTMLElement} node - The HTML element (node) associated with the Kanji.
     */
    addKanji(kanjiChar, node) {
        if (!this.parentKanjiMap.has(kanjiChar)) {
            this.parentKanjiMap.set(kanjiChar, node);
            this._updateList();
        }
    }

    /**
     * Checks if a Kanji character is already in the parent Kanji map.
     * @param {string} kanjiChar - The Kanji character to check.
     * @returns {boolean} True if the Kanji is in the map, false otherwise.
     */
    hasParentKanji(kanjiChar) {
        return this.parentKanjiMap.has(kanjiChar);
    }

    /**
     * Updates (re-renders) the parent Kanji list based on the current map and search filter.
     */
    _updateList() {
        this.kanjiListContainer.innerHTML = ''; // Clear existing list
        const searchFilter = this.searchInput.value.trim().toLowerCase();

        // Sort kanji alphabetically for consistent display
        const sortedKanji = Array.from(this.parentKanjiMap.keys()).sort();

        sortedKanji.forEach(kanjiChar => {
            // Apply search filter
            if (searchFilter && !kanjiChar.toLowerCase().includes(searchFilter)) {
                return; // Skip if it doesn't match the search
            }

            const targetNode = this.parentKanjiMap.get(kanjiChar);

            const listItem = document.createElement('div');
            listItem.classList.add('parent-kanji-list-item');
            listItem.textContent = kanjiChar;
            listItem.dataset.kanji = kanjiChar; // Store kanji char for easy lookup

            // Dim the entry if its corresponding node is collapsed OR hidden
            if (targetNode && (targetNode.dataset.collapsed === 'true' || targetNode.dataset.hidden === 'true')) {
                listItem.classList.add('dimmed');
            }

            listItem.addEventListener('click', () => {
                if (targetNode) {
                    // Find the specific kanji span within the targetNode to focus
                    let foundKanjiSpan = null;
                    // Iterate over children to find the correct kanji span
                    Array.from(targetNode.children).forEach(span => {
                        if (span.textContent === kanjiChar && (span.classList.contains('active-source-kanji') || span.classList.contains('expanded-parent-kanji'))) {
                            foundKanjiSpan = span;
                        }
                    });
                    // If found, focus on it and center the view using the provided callbacks
                    if (foundKanjiSpan) this.focusKanjiCallback(foundKanjiSpan);
                    this.centerViewCallback(targetNode);
                }
            });

            listItem.addEventListener('contextmenu', (e) => this._handleSidebarContextMenu(e, targetNode));

            this.kanjiListContainer.appendChild(listItem);
        });
    }

    /**
     * Recalculates the dimming state for all Kanji entries in the sidebar.
     * An entry is dimmed if its associated graph node is collapsed.
     */
    recalculateDimmingState() {
        const listItems = this.kanjiListContainer.querySelectorAll('.parent-kanji-list-item');
        listItems.forEach(item => {
            const kanjiChar = item.dataset.kanji;
            const node = this.parentKanjiMap.get(kanjiChar);
            if (node) {
                const isDimmed = node.dataset.collapsed === 'true' || node.dataset.hidden === 'true';
                item.classList.toggle('dimmed', isDimmed);
            }
        });
    }

    /**
     * Toggles the visibility of the sidebar.
     */
    _toggleSidebar() {
        // Toggle the 'visible' class on the sidebar container
        this.sidebarElement.classList.toggle('visible');
        // Toggle the 'active' class on the toggle button itself
        this.toggleButton.classList.toggle('active');
        this._updateToggleButton();
    }

    /**
     * Updates the toggle button's content based on the sidebar state.
     */
    _updateToggleButton() {
        // Check the 'active' class on the button, as per the original SidebarToggleHandler logic
        if (this.toggleButton.classList.contains('active')) {
            this.toggleButton.textContent = '✕'; // Icon for open state
            this.toggleButton.title = 'Close Kanji List';
        } else {
            this.toggleButton.textContent = '☰'; // Icon for closed state
            this.toggleButton.title = 'Toggle Kanji List';
        }
    }

    // --- Sidebar Context Menu Logic ---
    _createContextMenu() {
        this.sidebarContextMenu = document.createElement('div');
        this.sidebarContextMenu.id = 'sidebarContextMenu';
        this.sidebarContextMenu.classList.add('context-menu'); // Reuse existing context menu styles
        this.sidebarContextMenu.innerHTML = `
            <div class="context-menu-item" data-action="show-node">Show Node</div>
            <div class="context-menu-item" data-action="hide-node">Hide Node</div>
        `;
        document.body.appendChild(this.sidebarContextMenu);

        this.sidebarContextMenu.addEventListener('click', (e) => this._handleContextMenuItemClick(e));
    }

    _handleSidebarContextMenu(e, node) {
        e.preventDefault();
        e.stopPropagation();

        this.activeSidebarNode = node;

        this.sidebarContextMenu.style.left = `${e.clientX}px`;
        this.sidebarContextMenu.style.top = `${e.clientY}px`;
        this.sidebarContextMenu.style.display = 'block';
    }

    _handleContextMenuItemClick(e) {
        const action = e.target.dataset.action;
        if (!action || !this.activeSidebarNode) return;

        e.stopPropagation();

        switch (action) {
            case 'show-node':
                this.nodeCollapseExpandManager.showNode(this.activeSidebarNode);
                break;
            case 'hide-node':
                this.nodeCollapseExpandManager.hideNode(this.activeSidebarNode);
                break;
        }
        this._hideContextMenu();
    }

    _hideContextMenu() {
        if (this.sidebarContextMenu) {
            this.sidebarContextMenu.style.display = 'none';
            this.activeSidebarNode = null;
        }
    }

    _setupEventListeners() {
        this.searchInput.addEventListener('input', this._updateList.bind(this));
        this.toggleButton.addEventListener('click', this._toggleSidebar.bind(this));
        // Hide context menu if clicked anywhere else
        document.addEventListener('click', (e) => {
            if (this.sidebarContextMenu && !this.sidebarContextMenu.contains(e.target)) {
                this._hideContextMenu();
            }
        });
    }
}