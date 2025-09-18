import { getSuggestions } from '../../services/api.js';

export class NewSearchModal {
    /**
     * Manages the new search modal dialog.
     * @param {HTMLElement} modalElement The main modal container element.
     * @param {HTMLElement} openButtonElement The button that opens the modal.
     * @param {HTMLElement} closeButtonElement The button that closes the modal.
     * @param {HTMLInputElement} inputElement The text input field inside the modal.
     * @param {HTMLElement} suggestionsListElement The element to display suggestions.
     * @param {HTMLElement} jishoLoadingIndicatorElement The element to display the Jisho loading indicator.
     */
    constructor(modalElement, openButtonElement, closeButtonElement, inputElement, suggestionsListElement, jishoLoadingIndicatorElement) {
        if (!modalElement || !openButtonElement || !closeButtonElement || !inputElement || !suggestionsListElement || !jishoLoadingIndicatorElement) {
            console.error("NewSearchModal: Missing required elements for initialization.");
            return;
        }
        this.modal = modalElement;
        this.openBtn = openButtonElement;
        this.closeBtn = closeButtonElement;
        this.input = inputElement;
        this.suggestionsList = suggestionsListElement;
        this.jishoLoadingIndicator = jishoLoadingIndicatorElement;
        this.debounceTimeout = null; // For debouncing
        this.selectedSuggestionIndex = -1; // -1 means no suggestion is selected

        this.init();
    }

    /**
     * Initializes event listeners for the modal.
     */
    init() {
        this.openBtn.addEventListener('click', () => this.show());
        this.closeBtn.addEventListener('click', () => this.hide());

        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.classList.contains('visible')) {
                this.hide();
            }
        });

        this.input.addEventListener('input', () => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => this.handleInput(), 1000);
            this.selectedSuggestionIndex = -1; // Reset selection on new input
        });

        this.input.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }

    /**
     * Displays the modal and focuses the input field.
     */
    show() {
        this.modal.classList.add('visible');
        setTimeout(() => {
            this.input.focus();
            this.input.select();
        }, 50);
    }

    /**
     * Hides the modal and clears suggestions.
     */
    hide() {
        this.modal.classList.remove('visible');
        this.clearSuggestions();
        this.hideLoadingIndicator();
    }

    /**
     * Handles keyboard navigation for suggestions.
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        const suggestions = Array.from(this.suggestionsList.children);
        if (suggestions.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault(); // Prevent cursor movement in input
            this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % suggestions.length;
            this.highlightSuggestion(suggestions);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault(); // Prevent cursor movement in input
            this.selectedSuggestionIndex = (this.selectedSuggestionIndex - 1 + suggestions.length) % suggestions.length;
            this.highlightSuggestion(suggestions);
        } else if (event.key === 'Enter') {
            if (this.selectedSuggestionIndex !== -1) {
                event.preventDefault(); // Prevent form submission if a suggestion is selected
                suggestions[this.selectedSuggestionIndex].click(); // Simulate click on selected suggestion
            }
        }
    }

    /**
     * Highlights the currently selected suggestion.
     * @param {HTMLElement[]} suggestions - Array of suggestion item elements.
     */
    highlightSuggestion(suggestions) {
        suggestions.forEach((item, index) => {
            if (index === this.selectedSuggestionIndex) {
                item.classList.add('selected');
                this.input.value = item.textContent; // Update input with selected suggestion
                item.scrollIntoView({ block: 'nearest' }); // Scroll to selected item
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * Handles the input event on the search field.
     */
    async handleInput() {
        const query = this.input.value.trim();

        this.clearSuggestions(); // Clear previous suggestions
        this.showLoadingIndicator(); // Show loading indicator

        if (query) {
            try {
                const suggestions = await getSuggestions(query);
                this.renderSuggestions(suggestions);
            } catch (error) {
                console.error("Error fetching suggestions:", error);
                // Optionally display an error message to the user
            } finally {
                this.hideLoadingIndicator(); // Hide loading indicator regardless of success or failure
            }
        } else {
            this.hideLoadingIndicator(); // Hide loading indicator if query is empty
        }
    }

    /**
     * Renders the suggestions in the suggestions list.
     * @param {string[]} suggestions - An array of suggestion strings.
     */
    renderSuggestions(suggestions) {
        this.clearSuggestions();
        this.selectedSuggestionIndex = -1; // Reset selection when new suggestions are rendered
        if (suggestions.length > 0) {
            this.suggestionsList.style.display = 'block'; // Ensure visibility
            suggestions.forEach(suggestionText => {
                const item = document.createElement('div');
                item.classList.add('suggestion-item');
                item.textContent = suggestionText;
                item.addEventListener('click', () => {
                    this.input.value = suggestionText;
                    this.clearSuggestions();
                    this.input.focus();
                });
                this.suggestionsList.appendChild(item);
            });
        } else {
            this.suggestionsList.style.display = 'none'; // Hide if no suggestions
        }
    }

    /**
     * Clears the suggestions list.
     */
    clearSuggestions() {
        this.suggestionsList.innerHTML = '';
        this.suggestionsList.style.display = 'none'; // Ensure hidden when cleared
    }

    /**
     * Shows the Jisho loading indicator.
     */
    showLoadingIndicator() {
        this.jishoLoadingIndicator.style.display = 'block';
    }

    /**
     * Hides the Jisho loading indicator.
     */
    hideLoadingIndicator() {
        this.jishoLoadingIndicator.style.display = 'none';
    }
}