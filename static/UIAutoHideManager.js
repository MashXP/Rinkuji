
export class UIAutoHideManager {
    /**
     * @param {HTMLElement[]} elements - An array of elements to manage.
     * @param {number} [timeout=2500] - The idle timeout in milliseconds.
     */
    constructor(elements, timeout = 2500) {
        // Filter out any null/undefined elements passed to the constructor
        this.elements = elements.filter(el => el);
        this.idleTimeout = timeout;
        this.idleTimer = null;
    }

    /**
     * Initializes the auto-hide functionality by adding event listeners.
     */
    init() {
        if (this.elements.length === 0) {
            return; // Do nothing if there are no elements to manage
        }

        // Bind 'this' to the methods to ensure correct context in event listeners
        this.showElements = this.showElements.bind(this);
        this.hideElements = this.hideElements.bind(this);

        // Listen for global activity
        document.body.addEventListener('mousemove', this.showElements, { passive: true });
        document.body.addEventListener('touchstart', this.showElements, { passive: true });

        // Also add listeners to the elements themselves to prevent hiding while hovered
        this.elements.forEach(el => {
            el.addEventListener('mouseenter', this.showElements);
            el.addEventListener('mouseleave', this.showElements); // Re-trigger timer on mouse leave
        });

        // Show elements on initial load
        this.showElements();
    }

    showElements() {
        this.elements.forEach(el => el.classList.add('visible'));
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(this.hideElements, this.idleTimeout);
    }

    hideElements() {
        const isHovering = this.elements.some(el => el.matches(':hover'));
        if (!isHovering) {
            this.elements.forEach(el => el.classList.remove('visible'));
        }
    }
}