export class OptionsMenu {
    /**
     * Manages the options modal dialog.
     * @param {HTMLElement} modalElement The main modal container element.
     * @param {HTMLElement} openButtonElement The button that opens the modal.
     * @param {HTMLElement} closeButtonElement The button that closes the modal.
     */
    constructor(modalElement, openButtonElement, closeButtonElement) {
        if (!modalElement || !openButtonElement || !closeButtonElement) {
            console.error("OptionsMenu: Missing required elements for initialization.");
            return;
        }
        this.modal = modalElement;
        this.openBtn = openButtonElement;
        this.closeBtn = closeButtonElement;

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

        // Close the modal with the Escape key for better accessibility
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.classList.contains('visible')) {
                this.hide();
            }
        });
    }

    /**
     * Displays the modal.
     */
    show() {
        this.modal.classList.add('visible');
    }

    /**
     * Hides the modal.
     */
    hide() {
        this.modal.classList.remove('visible');
    }
}