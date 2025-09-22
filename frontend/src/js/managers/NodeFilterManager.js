export class NodeFilterManager {
    /**
     * @param {RegExp} kanjiRegex - Regular expression to test for Kanji characters.
     */
    constructor(kanjiRegex) {
        this.kanjiRegex = kanjiRegex;
    }

    /**
     * Checks if a given word consists only of Kanji characters.
     * @param {string} word - The word to check.
     * @returns {boolean} True if the word contains only Kanji, false otherwise.
     */
    _isKanjiOnly(word) { // Private helper
        for (const char of word) {
            if (!this.kanjiRegex.test(char)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Applies a content filter to a specific node and its descendants.
     * @param {HTMLElement} node - The node to apply the filter to.
     * @param {'all'|'kanji'|'start-kanji'} filterType - The type of filter to apply.
     * @param {string|null} clickedKanjiChar - The specific Kanji character if filterType is 'start-kanji'.
     */
    filterNodeContent(node, filterType, clickedKanjiChar = null) {
        // Store filter state on the node for future children
        node.dataset.filterType = filterType;
        node.dataset.filterClickedKanji = clickedKanjiChar || '';

        // Apply the filter to the entire branch starting from this node
        this.applyChildFilterRecursively(node); // Call public method

        // --- Part 2: Apply CONTENT filter to the node itself ---
        const spans = Array.from(node.querySelectorAll('span'));
        if (filterType === 'start-kanji' && clickedKanjiChar) {
            let clickedKanjiFound = false;
            spans.forEach(span => {
                const hideSpan = !clickedKanjiFound && span.textContent !== clickedKanjiChar;
                span.classList.toggle('kanji-hidden-by-filter', hideSpan);
                span.style.opacity = hideSpan ? 0 : 1; // Apply fade effect
                if (span.textContent === clickedKanjiChar) {
                    clickedKanjiFound = true;
                }
            });
        } else {
            // For 'all' and 'kanji' filters, the parent's content is not filtered.
            // So, we remove any content filters that might have been applied previously.
            spans.forEach(span => {
                span.classList.remove('kanji-hidden-by-filter');
                span.style.opacity = 1;
            });
        }

        // console.log(`Node ${node.dataset.wordSlug} filtered by: ${filterType}`);
    }

    /**
     * Applies inherited filter rules to a newly created node.
     * @param {HTMLElement} newNode - The newly created node.
     * @param {SVGLineElement} newLine - The line connecting to the new node.
     * @param {'all'|'kanji'|'start-kanji'} parentFilterType - The filter type inherited from the parent.
     * @param {string|null} parentFilterKanji - The clicked Kanji char inherited from the parent.
     */
    applyInheritedFilter(newNode, newLine, parentFilterType, parentFilterKanji) {
        // A. Determine if this new node should be hidden by a parent's 'kanji' child filter
        if (parentFilterType === 'kanji') {
            const childWord = newNode.dataset.wordSlug;
            const containsKanji = this.kanjiRegex.test(childWord);
            const isPureKanji = this._isKanjiOnly(childWord); // Use private helper

            if (containsKanji && !isPureKanji) {
                // It's mixed-content and has no children, so it should be hidden.
                newNode.classList.add('mixed-content-node');
                newNode.classList.add('node-hidden-by-filter');
            }
        }

        // B. Also store the filter on the new node so it can apply it to its own future children
        newNode.dataset.filterType = parentFilterType;
        newNode.dataset.filterClickedKanji = parentFilterKanji;
    }

    /**
     * Recursively applies the parent's filter settings to its children.
     * This method is public because it's called by RinkuGraph's _expandNode.
     * @param {HTMLElement} parentNode - The parent node whose children need filtering.
     */
    applyChildFilterRecursively(parentNode) {
        const parentFilterType = parentNode.dataset.filterType || 'all';

        parentNode._children.forEach(child => {
            // Propagate the filter settings to the child first
            child.dataset.filterType = parentFilterType;
            child.dataset.filterClickedKanji = parentNode.dataset.filterClickedKanji;

            const childWord = child.dataset.wordSlug;
            const containsKanji = this.kanjiRegex.test(childWord);
            const isPureKanji = this._isKanjiOnly(childWord); // Use private helper

            // Reset visual state classes
            child.classList.remove('mixed-content-node', 'node-hidden-by-filter');

            let shouldBeHidden = false;
            if (parentFilterType === 'kanji') {
                if (!containsKanji) {
                    // Pure kana/other node, should be hidden.
                    shouldBeHidden = true;
                } else if (!isPureKanji) {
                    // It's a mixed-content node.
                    child.classList.add('mixed-content-node');
                    // Hide only if it has no children.
                    shouldBeHidden = child._children.length === 0;
                } else {
                    // Pure kanji node, should not be hidden.
                    shouldBeHidden = false;
                }
            }

            child.classList.toggle('node-hidden-by-filter', shouldBeHidden);

            // Apply visibility only if the parent is not collapsed
            if (parentNode.dataset.collapsed !== 'true') {
                this.setNodeVisibility(child, !shouldBeHidden);
            }

            // Recurse to the next level
            this.applyChildFilterRecursively(child); // Recursive call using 'this'
        });
    }

    /**
     * Sets the visibility of a node and its connecting line.
     * @param {HTMLElement} node - The node to set visibility for.
     * @param {boolean} isVisible - True to make visible, false to hide.
     */
    setNodeVisibility(node, isVisible) {
        if (!node) return;

        const transitionDuration = 100; // Matches CSS transition

        const setElementVisibility = (element, visible) => {
            if (!element) return;
            if (visible) {
                element.style.display = '';
                requestAnimationFrame(() => {
                    element.style.opacity = '1';
                });
            } else {
                element.style.opacity = '0';
                setTimeout(() => {
                    element.style.display = 'none';
                }, transitionDuration);
            }
        };

        setElementVisibility(node, isVisible);
        setElementVisibility(node.lineElement, isVisible); // Incoming expansion line
        setElementVisibility(node._linkingLineToOriginal, isVisible); // Incoming linking line

        // Outgoing linking lines should also be hidden/shown with the node
        if (node._linkingLinesFromThisNode) {
            node._linkingLinesFromThisNode.forEach(line => setElementVisibility(line, isVisible));
        }
    }
}