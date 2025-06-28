export class UITogglingManager {
    /**
     * @param {HTMLElement[]} elements - An array of elements to manage.
     * @param {number} [timeout=2500] - The idle timeout in milliseconds.
     */
    constructor(elements, timeout = 2500) {
        // Filter out any null/undefined elements passed to the constructor
        this.elements = elements.filter(el => el);
        this.idleTimeout = timeout;
        this.idleTimer = null;
        this.isManuallyHidden = false; // New state to track manual toggling
    }

    /**
     * Initializes the manager by adding event listeners for auto-hiding.
     */
    initAutoHide() {
        if (this.elements.length === 0) {
            return; // Do nothing if there are no elements to manage
        }

        // Bind 'this' to the methods to ensure correct context in event listeners
        this.showElements = this.showElements.bind(this);
        this.hideElements = this.hideElements.bind(this);

        // Listen for global activity to show elements
        document.body.addEventListener('mousemove', this.showElements, { passive: true });
        document.body.addEventListener('touchstart', this.showElements, { passive: true });

        // Also add listeners to the elements themselves to prevent hiding while hovered
        this.elements.forEach(el => {
            el.addEventListener('mouseenter', this.showElements);
            el.addEventListener('mouseleave', this.showElements); // Re-trigger timer on mouse leave
        });

        // Show elements on initial load to start the timer
        this.showElements();
    }

    /**
     * Shows the elements and resets the idle timer.
     */
    showElements() {
        if (this.isManuallyHidden) {
            return; // Do not auto-show if manually hidden
        }
        this.elements.forEach(el => el.classList.add('visible'));
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(this.hideElements, this.idleTimeout);
    }

    /**
     * Hides the elements if the mouse is not hovering over them.
     */
    hideElements() {
        if (this.isManuallyHidden) {
            return; // Do not auto-hide if manually hidden
        }
        const isHovering = this.elements.some(el => el.matches(':hover'));
        if (!isHovering) {
            this.elements.forEach(el => el.classList.remove('visible'));
        }
    }

    /**
     * Manually toggles the visibility of the elements.
     */
    manualToggle() {
        this.isManuallyHidden = !this.isManuallyHidden;
        if (this.isManuallyHidden) {
            // If manually hidden, clear any pending auto-hide timer and hide elements immediately
            clearTimeout(this.idleTimer);
            this.elements.forEach(el => el.classList.remove('visible'));
        } else {
            // If manually shown, make them visible and restart the auto-hide timer
            this.showElements();
        }
        return this.isManuallyHidden;
    }

    /**
     * Manually toggles a specific class on the managed elements,
     * independent of the auto-hide 'visible' state.
     * @param {string} className - The class to toggle.
     * @returns {boolean} The new state (true if class is present on the first element, false if not).
     */
    manualToggleClass(className) {
        let isToggledOn = false;
        this.elements.forEach((el, index) => {
            const elementIsToggled = el.classList.toggle(className);
            // The final state is determined by the first element in the array
            if (index === 0) {
                isToggledOn = elementIsToggled;
            }
        });
        return isToggledOn;
    }

    /**
     * A static helper to configure a standard UI toggle button.
     * It sets up the event listener and manages the button's appearance.
     * @param {object} config - The configuration object for the toggle.
     * @param {HTMLElement} config.button - The button that triggers the toggle.
     * @param {HTMLElement} config.target - The main element whose class will be toggled.
     * @param {string} config.toggleClass - The class to toggle on the target element.
     * @param {string} [config.buttonToggleClass] - An optional class to toggle on the button itself.
     * @param {object} config.onState - Configuration for the 'on' (toggled) state.
     * @param {string} config.onState.html - The innerHTML for the button in the 'on' state.
     * @param {string} config.onState.title - The title for the button in the 'on' state.
     * @param {object} config.offState - Configuration for the 'off' (default) state.
     * @param {string} config.offState.html - The innerHTML for the button in the 'off' state.
     * @param {string} config.offState.title - The title for the button in the 'off' state.
     */
    static setupToggle({ button, target, toggleClass, buttonToggleClass, onState, offState }) {
        if (!button || !target) return;

        // Set initial state from the 'off' configuration
        button.innerHTML = offState.html;
        button.title = offState.title;

        button.addEventListener('click', () => {
            const isToggledOn = target.classList.toggle(toggleClass);

            if (buttonToggleClass) {
                button.classList.toggle(buttonToggleClass, isToggledOn);
            }

            button.innerHTML = isToggledOn ? onState.html : offState.html;
            button.title = isToggledOn ? onState.title : offState.title;
        });
    }
}