import { LineCreator } from '../../src/js/utils/LineCreator.js';

describe('LineCreator', () => {
    let svgLayer;
    let panZoom;
    let lineCreator;

    beforeEach(() => {
        svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        panZoom = {
            getScale: jest.fn(() => 1),
        };
        lineCreator = new LineCreator(svgLayer, panZoom);
    });

    describe('createExpansionLine', () => {
        test('should create a line with given source and target positions', () => {
            const sourcePos = { ux: 10, uy: 20 };
            const targetPos = { ux: 100, uy: 200 };

            const line = lineCreator.createExpansionLine(sourcePos, targetPos);

            expect(line.tagName).toBe('line');
            expect(line.getAttribute('x1')).toBe('10');
            expect(line.getAttribute('y1')).toBe('20');
            expect(line.getAttribute('x2')).toBe('100');
            expect(line.getAttribute('y2')).toBe('200');
            expect(line.classList.contains('expansion-line')).toBe(true);
            expect(svgLayer.contains(line)).toBe(true);
        });

        test('should default to 0 for falsy coordinate values to cover all branches', () => {
            const sourcePos = { ux: 50, uy: null }; // Falsy y1
            const targetPos = { ux: undefined, uy: 50 }; // Falsy x2

            const line = lineCreator.createExpansionLine(sourcePos, targetPos);

            expect(line.getAttribute('x1')).toBe('50');
            expect(line.getAttribute('y1')).toBe('0'); // Should fall back to 0
            expect(line.getAttribute('x2')).toBe('0'); // Should fall back to 0
            expect(line.getAttribute('y2')).toBe('50');
        });
    });

    // You can add tests for createSelectionCircleSVG here if needed
    // For example, checking if it creates a circle with the correct attributes.
});