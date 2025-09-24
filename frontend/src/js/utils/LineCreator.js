export class LineCreator {
    /**
     * @param {HTMLElement} svgLayer - The SVG layer for drawing lines and circles.
     * @param {PanZoom} panZoom - Instance of PanZoom for scale calculations.
     */
    constructor(svgLayer, panZoom) {
        this.svgLayer = svgLayer;
        this.panZoom = panZoom;
    }

    /**
     * Creates an SVG line element.
     * @param {{ux: number, uy: number}} sourcePos - Unscaled coordinates of the line's start.
     * @param {{ux: number, uy: number}} targetPos - Unscaled coordinates of the line's end.
     * @returns {SVGLineElement} The created SVG line element.
     */
    createExpansionLine(sourcePos, targetPos) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); // prettier-ignore
        line.setAttribute('x1', sourcePos.ux || 0);
        line.setAttribute('y1', sourcePos.uy || 0);
        line.setAttribute('x2', targetPos.ux || 0);
        line.setAttribute('y2', targetPos.uy || 0);
        line.classList.add('expansion-line');
        this.svgLayer.appendChild(line);
        return line;
    }

    /**
     * Creates an SVG circle element for selection.
     * @param {HTMLElement} sourceKanjiElement - The Kanji span element to circle.
     * @param {{ux: number, uy: number}} sourcePos - Unscaled coordinates of the circle's center.
     * @returns {SVGCircleElement} The created SVG circle element.
     */
    createSelectionCircleSVG(sourceKanjiElement, sourcePos) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const sourceRect = sourceKanjiElement.getBoundingClientRect();
        const circleRadius = (sourceRect.width / this.panZoom.getScale()) * 0.8;

        circle.setAttribute('cx', sourcePos.ux);
        circle.setAttribute('cy', sourcePos.uy);
        circle.setAttribute('r', circleRadius);
        circle.classList.add('selection-circle');
        circle.style.opacity = 0; // Start hidden, will be faded in
        return circle;
    }
}