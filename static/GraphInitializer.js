export class GraphInitializer {
    /**
     * @param {HTMLElement} wordContainer - The DOM element for the initial word.
     * @param {RegExp} kanjiRegex - Regular expression to test for Kanji characters.
     * @param {function(HTMLElement): void} addKanjiEventListeners - Callback to add event listeners to Kanji spans.
     */
    constructor(wordContainer, kanjiRegex, addKanjiEventListeners) {
        this.wordContainer = wordContainer;
        this.kanjiRegex = kanjiRegex;
        this.addKanjiEventListeners = addKanjiEventListeners;
    }

    /**
     * Populates the initial word container with clickable Kanji spans.
     */
    initialize() {
        const word = this.wordContainer.dataset.word;
        this.wordContainer._children = []; // Initialize the root node's custom children array for graph structure

        word.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.textContent = char;
            if (this.kanjiRegex.test(char)) {
                charSpan.classList.add('kanji-char');
                this.addKanjiEventListeners(charSpan);
            }
            this.wordContainer.appendChild(charSpan);
        });
    }
}