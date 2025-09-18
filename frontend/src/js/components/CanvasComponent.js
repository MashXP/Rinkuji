export class CanvasComponent {
    /**
     * @param {HTMLElement} viewport - The main container element for the canvas.
     * @param {HTMLElement} canvas - The canvas element where content is drawn/transformed.
     * @param {PanZoom} panZoom - An instance of the PanZoom class for coordinate transformations.
     */
    constructor(viewport, canvas, panZoom) {
        // Enforce abstract class behavior: prevent direct instantiation
        if (new.target === CanvasComponent) {
            throw new TypeError("Cannot construct CanvasComponent instances directly. This is an abstract class.");
        }

        this.viewport = viewport;
        this.canvas = canvas;
        this.panZoom = panZoom;
    }

    /**
     * Abstract method to be implemented by subclasses to add their specific event listeners.
     * It's called in the constructor to ensure listeners are set up during instantiation.
     */
    addEventListeners() {
        // No-op in the abstract class. Subclasses must override this method.
        throw new Error("Method 'addEventListeners()' must be implemented by subclasses.");
    }

    /**
     * Utility method to get mouse coordinates relative to the unscaled canvas.
     * @param {MouseEvent} event - The mouse event.
     * @returns {{ux: number, uy: number}} - Unscaled x and y coordinates.
     */
    _getCanvasCoordinates(event) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const scale = this.panZoom.getScale();
        const ux = (event.clientX - canvasRect.left) / scale;
        const uy = (event.clientY - canvasRect.top) / scale;
        return { ux, uy };
    }

    /**
     * Utility method to get the center of an element in unscaled canvas coordinates.
     * @param {HTMLElement} element - The HTML element to get the center of.
     * @returns {{ux: number, uy: number}} - Unscaled x and y coordinates of the element's center.
     */
    _getUnscaledElementCenter(element) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();
        const scale = this.panZoom.getScale();

        const vx = elemRect.left + elemRect.width / 2;
        const vy = elemRect.top + elemRect.height / 2;

        const ux = (vx - canvasRect.left) / scale;
        const uy = (vy - canvasRect.top) / scale;

        return { ux, uy };
    }
}