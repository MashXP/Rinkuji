export class NewSearchModal {
    /**
     * Manages the new search modal dialog.
     * @param {HTMLElement} modalElement The main modal container element.
     * @param {HTMLElement} openButtonElement The button that opens the modal.
     * @param {HTMLElement} closeButtonElement The button that closes the modal.
     * @param {HTMLInputElement} inputElement The text input field inside the modal.
     */
    constructor(modalElement, openButtonElement, closeButtonElement, inputElement) {
        if (!modalElement || !openButtonElement || !closeButtonElement || !inputElement) {
            console.error("NewSearchModal: Missing required elements for initialization.");
            return;
        }
        this.modal = modalElement;
        this.openBtn = openButtonElement;
        this.closeBtn = closeButtonElement;
        this.input = inputElement;

        this.init();
    }

    /**
     * Initializes event listeners for the modal.
     */
    init() {
        this.openBtn.addEventListener('click', () => this.show());
        this.closeBtn.addEventListener('click', () => this.hide());

        // Close the modal if the backdrop is clicked
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });

        // Close the modal with the Escape key
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.classList.contains('visible')) {
                this.hide();
            }
        });
    }

    /**
     * Displays the modal and focuses the input field.
     */
    show() {
        this.modal.classList.add('visible');
        // Use a short timeout to ensure the element is visible and focusable before acting on it
        setTimeout(() => {
            this.input.focus();
            this.input.select();
        }, 50);
    }

    /**
     * Hides the modal.
     */
    hide() {
        this.modal.classList.remove('visible');
    }
}