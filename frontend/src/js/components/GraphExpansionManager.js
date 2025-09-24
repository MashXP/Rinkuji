export class GraphExpansionManager {
    constructor(config) {
        this.graph = config.graph; // Reference to the main RinkuGraph instance
        this.nodeDuplicator = config.nodeDuplicator;
        this.kanjiSidebar = config.kanjiSidebar;
        this.layoutManager = config.layoutManager;
        this.viewManager = config.viewManager;
        this.kanjiRegex = config.kanjiRegex;
        this.MAX_WORDS_TO_DISPLAY = config.MAX_WORDS_TO_DISPLAY;
    }

    /**
     * Shuffles an array in place using the Fisher-Yates algorithm.
     * @param {Array<any>} array The array to shuffle.
     */
    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    _selectWordsToDisplay(relatedWords, kanjiChar, limit) {
        if (relatedWords.length <= limit) {
            return relatedWords;
        }

        // We have more words than available slots, so we need to select.
        // Prioritize showing the single-kanji word if it exists.
        const kanjiAsWord = relatedWords.find(word => word.slug === kanjiChar);
        const otherWords = relatedWords.filter(word => word.slug !== kanjiChar);
        this._shuffleArray(otherWords);

        let wordsToDisplay = [];
        // Only add the prioritized word if there's space
        if (kanjiAsWord && wordsToDisplay.length < limit) {
            wordsToDisplay.push(kanjiAsWord);
        }

        const remainingSlots = limit - wordsToDisplay.length;
        wordsToDisplay.push(...otherWords.slice(0, remainingSlots));

        return wordsToDisplay;
    }

    /**
     * Main dispatcher for handling a click on a kanji element.
     * @param {MouseEvent} e - The click event.
     * @param {boolean} [isProgrammatic=false] - True if the click was triggered by code. 
     */
    async handleKanjiClick(e, isProgrammatic = false) {
        const kanjiElement = e.currentTarget;

        if (!isProgrammatic && (this.graph.isSearching || this.graph.nodeDragHandler.hasDragOccurred())) {
            console.log('Search in progress. Ignoring user click.');
            return;
        }

        if ((kanjiElement.classList.contains('active-source-kanji') || kanjiElement.classList.contains('expanded-parent-kanji')) && kanjiElement.dataset.hasMoreWords === 'true') {
            await this.rerandomizeNode(kanjiElement);
            return;
        }

        const parentNode = kanjiElement.parentElement;
        if (this._shouldDuplicateNode(parentNode, isProgrammatic)) {
            await this.nodeDuplicator.duplicateAndExpandNode(parentNode, kanjiElement);
            return;
        }

        if (!isProgrammatic) {
            this.graph.isSearching = true;
            kanjiElement.classList.add('kanji-loading');
        }

        try {
            await this._performExpansion(kanjiElement);
        } catch (error) {
            console.error("An error occurred during kanji click handling:", error);
        } finally {
            if (!isProgrammatic) {
                this.graph.isSearching = false;
                kanjiElement.classList.remove('kanji-loading');
            }
        }
    }

    /**
     * Updates the visual state of a kanji element after expansion.
     * @param {HTMLElement} kanjiElement - The kanji element to update.
     * @param {string} newClass - The new class to add ('active-source-kanji' or 'expanded-parent-kanji').
     */
    _updateSourceKanjiState(kanjiElement, newClass) {
        kanjiElement.classList.remove('kanji-char');
        this.graph.expandedElements.add(kanjiElement); // The Set still lives on the main graph instance
        kanjiElement.classList.add(newClass);
    }

    /**
     * Fetches related words and orchestrates the drawing of new nodes.
     * @param {HTMLElement} kanjiElement - The kanji element that was clicked.
     */
    async _performExpansion(kanjiElement) {
        const kanjiChar = kanjiElement.textContent;
        const parentNode = kanjiElement.parentElement;

        console.log(`Clicked kanji: ${kanjiChar}`);
        const relatedWords = await this.graph.fetchRelatedWords(kanjiChar);

        if (relatedWords.length > 0) {
            // Separate consolidated kanji from regular words
            const consolidatedKanji = relatedWords.find(item => item.is_consolidated);
            const regularWords = relatedWords.filter(item => !item.is_consolidated);

            let wordsToDisplay = [];

            // If a consolidated kanji exists, add it to the display list
            if (consolidatedKanji) {
                wordsToDisplay.push(consolidatedKanji);
            }

            // If there are more words than display slots, mark the source for rerandomization
            if (regularWords.length > this.MAX_WORDS_TO_DISPLAY - wordsToDisplay.length) {
                kanjiElement.dataset.hasMoreWords = 'true';
            }

            // Determine how many regular words we can display.
            const slotsForRegularWords = this.MAX_WORDS_TO_DISPLAY - wordsToDisplay.length;

            // Select random regular words to fill the remaining slots
            const selectedRegularWords = this._selectWordsToDisplay(regularWords, kanjiChar, slotsForRegularWords);
            wordsToDisplay.push(...selectedRegularWords);

            this.viewManager.focusKanji(kanjiElement);
            this.layoutManager.drawExpansion(kanjiElement, kanjiChar, wordsToDisplay);
            this._updateSourceKanjiState(kanjiElement, 'active-source-kanji');
            this.kanjiSidebar.addKanji(kanjiChar, parentNode);
        } else {
            // No new words found, mark the kanji as fully expanded for now.
            this._updateSourceKanjiState(kanjiElement, 'expanded-parent-kanji');
        }

        this.graph._updateParentVisibilityAfterExpansion(parentNode);
    }

    /**
     * Determines if a node should be duplicated before expansion.
     * @param {HTMLElement} parentNode - The node containing the clicked kanji. 
     * @param {boolean} isProgrammatic - Whether the click was programmatic.
     * @returns {boolean}
     */
    _shouldDuplicateNode(parentNode, isProgrammatic) {
        if (isProgrammatic) {
            return false;
        }
        const expandedKanjiCount = parentNode.querySelectorAll('.active-source-kanji, .expanded-parent-kanji').length;
        if (this.graph._isRootLikeNode(parentNode)) {
            return expandedKanjiCount >= 1;
        }
        return expandedKanjiCount > 1;
    }

    /**
     * Handles the logic for rerandomizing the children of a source kanji.
     * @param {HTMLElement} sourceKanjiElement - The kanji element to rerandomize.
     */
    async rerandomizeNode(sourceKanjiElement) {
        if (!sourceKanjiElement || !sourceKanjiElement.classList.contains('active-source-kanji')) {
            console.warn("Cannot rerandomize: Invalid source kanji element.");
            return;
        }

        const parentNode = sourceKanjiElement.parentElement;
        const sourceKanji = sourceKanjiElement.textContent;

        const allSourceChildren = Array.from(parentNode._children || []).filter(child => child.dataset.sourceKanji === sourceKanji);
        const expandedChildren = allSourceChildren.filter(child => child._children && child._children.length > 0);
        const unexpandedChildren = allSourceChildren.filter(child => !child._children || child._children.length === 0);

        unexpandedChildren.forEach(child => {
            if (child.lineElement && child.lineElement.parentNode) {
                child.lineElement.parentNode.removeChild(child.lineElement);
            }
            if (child.parentNode) {
                child.parentNode.removeChild(child);
            }
        });
        parentNode._children = (parentNode._children || []).filter(child => !unexpandedChildren.includes(child));

        // 3. Fetch all possible related words (excluding what's currently on the graph, including the preserved expanded children)
        const allRelatedWords = await this.graph.fetchRelatedWords(sourceKanji);

        // 4. Determine how many new words we need and select them
        const slotsToFill = this.MAX_WORDS_TO_DISPLAY - expandedChildren.length;
        let newWordsToDisplay = [];

        if (slotsToFill > 0 && allRelatedWords.length > 0) {
            // Check if the single-kanji word should be prioritized
            const isKanjiAsWordAlreadyExpanded = expandedChildren.some(child => child.dataset.wordSlug === sourceKanji);
            const kanjiAsWordCandidate = allRelatedWords.find(word => word.slug === sourceKanji);

            let candidates = [...allRelatedWords];
            this._shuffleArray(candidates); // Shuffle all candidates first

            if (kanjiAsWordCandidate && !isKanjiAsWordAlreadyExpanded) {
                // If the prioritized word is available and not already shown, ensure it's included.
                // Remove it from its random position and put it at the front.
                candidates = candidates.filter(word => word.slug !== sourceKanji);
                candidates.unshift(kanjiAsWordCandidate);
            }
            
            newWordsToDisplay = candidates.slice(0, slotsToFill);
        }

        // 5. Update the 'hasMoreWords' flag for the context menu
        const hasMore = allRelatedWords.length > newWordsToDisplay.length;
        if (hasMore) {
            sourceKanjiElement.dataset.hasMoreWords = 'true';
        } else {
            delete sourceKanjiElement.dataset.hasMoreWords;
        }

        // 6. Draw the new expansion for the newly selected words
        if (newWordsToDisplay.length > 0) {
            this.layoutManager.drawExpansion(sourceKanjiElement, sourceKanji, newWordsToDisplay);
            console.log(`Rerandomized ${sourceKanji} with ${newWordsToDisplay.length} new words, keeping ${expandedChildren.length} expanded nodes.`);
        } else {
             console.log(`Rerandomized ${sourceKanji}: No new words to add, kept ${expandedChildren.length} expanded nodes.`);
        }
    }
}