export class GraphViewManager {
    constructor(config) {
        this.graphState = config.graphState;
        this.svgLayer = config.svgLayer;
        this.canvas = config.canvas;
        this.panZoom = config.panZoom;
        this.lineCreator = config.lineCreator;
        this.getUnscaledElementCenter = config.getUnscaledElementCenter;
    }

    /**
     * Clears the currently active selection circle from the SVG layer and resets its state.
     */
    clearSelectionCircle() {
        if (this.graphState.currentSelectionCircle && this.graphState.currentSelectionCircle.parentNode) {
            this.graphState.currentSelectionCircle.parentNode.removeChild(this.graphState.currentSelectionCircle);
        }
        this.graphState.currentSelectionCircle = null;
        this.graphState.currentSelectionCircleParentNode = null;
    }

    /**
     * Creates and displays a selection circle around a kanji element.
     * @param {HTMLElement} kanjiElement - The kanji span to focus on.
     */
    focusKanji(kanjiElement) {
        this.clearSelectionCircle();

        const sourcePos = this.getUnscaledElementCenter(kanjiElement);
        const parentNode = kanjiElement.parentElement;

        const circle = this.lineCreator.createSelectionCircleSVG(kanjiElement, sourcePos);
        this.svgLayer.appendChild(circle);

        this.graphState.currentSelectionCircle = circle;
        this.graphState.currentSelectionCircleParentNode = parentNode;
        this.graphState.currentSelectionCircleOffsetX = sourcePos.ux - parseFloat(parentNode.style.left || 0);
        this.graphState.currentSelectionCircleOffsetY = sourcePos.uy - parseFloat(parentNode.style.top || 0);

        if (parentNode.dataset.isRootNode === 'true') {
            this.graphState.currentSelectionCircleOffsetX = sourcePos.ux;
            this.graphState.currentSelectionCircleOffsetY = sourcePos.uy;
        }

        requestAnimationFrame(() => {
            circle.style.opacity = 1;
        });
    }

    /**
     * Centers the viewport on a given graph element.
     * @param {HTMLElement} element - The element to center on.
     */
    centerViewOnElement(element) {
        this.canvas.style.transition = 'transform 0.5s ease-in-out';

        let element_ux, element_uy;

        if (element.dataset.isRootNode === 'true') {
            element_ux = 0;
            element_uy = 0;
        } else {
            element_ux = parseFloat(element.style.left || 0);
            element_uy = parseFloat(element.style.top || 0);
        }

        this.panZoom.pointX = -element_ux * this.panZoom.scale;
        this.panZoom.pointY = -element_uy * this.panZoom.scale;
        this.panZoom.setTransform();

        setTimeout(() => {
            this.canvas.style.transition = 'transform 0.1s ease-out';
        }, 500);
    }
}