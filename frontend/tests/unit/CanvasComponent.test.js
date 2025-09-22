import { CanvasComponent } from '../../src/js/components/CanvasComponent.js';

// Explicitly unmock the module to ensure we are testing the real implementation,
// as it might be mocked by other test files in the suite.
jest.unmock('../../src/js/components/CanvasComponent.js');

// Mock PanZoom class
class MockPanZoom {
    constructor() {
        this.scale = 1;
    }
    getScale() {
        return this.scale;
    }
    setScale(newScale) {
        this.scale = newScale;
    }
}

// Mock subclass to test CanvasComponent's protected methods
class ConcreteCanvasComponent extends CanvasComponent {
    constructor(viewport, canvas, panZoom) {
        super(viewport, canvas, panZoom);
        this.addEventListeners(); // Call the abstract method in subclass
    }

    addEventListeners() {
        // Implementation for testing purposes
    }
}

describe('CanvasComponent', () => {
    let viewport;
    let canvas;
    let panZoom;

    beforeEach(() => {
        viewport = document.createElement('div');
        canvas = document.createElement('canvas');
        panZoom = new MockPanZoom();

        // Mock getBoundingClientRect for canvas
        canvas.getBoundingClientRect = jest.fn(() => ({
            left: 100,
            top: 50,
            width: 800,
            height: 600,
            x: 100,
            y: 50,
            right: 900,
            bottom: 650,
        }));
    });

    test('should not be able to construct CanvasComponent instances directly', () => {
        expect(() => new CanvasComponent(viewport, canvas, panZoom)).toThrow(
            'Cannot construct CanvasComponent instances directly. This is an abstract class.'
        );
    });

    test('subclasses must implement addEventListeners method', () => {
        class MissingEventListeners extends CanvasComponent {
            // Missing addEventListeners implementation
        }
        expect(() => new MissingEventListeners(viewport, canvas, panZoom)).toThrow(
            "Method 'addEventListeners()' must be implemented by subclasses."
        );
    });

    test('base addEventListeners should be a no-op for coverage', () => {
        const component = new ConcreteCanvasComponent(viewport, canvas, panZoom);
        // This test is purely for code coverage purposes.
        // The base method is designed to be overridden and never called directly.
        expect(() => CanvasComponent.prototype.addEventListeners.call(component)).not.toThrow();
    });

    test('_getCanvasCoordinates should return correct unscaled coordinates', () => {
        const component = new ConcreteCanvasComponent(viewport, canvas, panZoom);
        const mockEvent = { clientX: 150, clientY: 100 }; // Relative to viewport

        const { ux, uy } = component._getCanvasCoordinates(mockEvent);

        // clientX (150) - canvasRect.left (100) = 50
        // clientY (100) - canvasRect.top (50) = 50
        // Since scale is 1, ux = 50, uy = 50
        expect(ux).toBe(50);
        expect(uy).toBe(50);

        // Test with different scale
        panZoom.setScale(2);
        const { ux: ux2, uy: uy2 } = component._getCanvasCoordinates(mockEvent);
        expect(ux2).toBe(25); // 50 / 2
        expect(uy2).toBe(25); // 50 / 2
    });

    test('_getUnscaledElementCenter should return correct unscaled center coordinates', () => {
        const component = new ConcreteCanvasComponent(viewport, canvas, panZoom);
        const mockElement = document.createElement('div');
        mockElement.getBoundingClientRect = jest.fn(() => ({
            left: 120,
            top: 70,
            width: 40,
            height: 20,
            x: 120,
            y: 70,
            right: 160,
            bottom: 90,
        }));

        const { ux, uy } = component._getUnscaledElementCenter(mockElement);

        // Element center in viewport coords:
        // vx = 120 + 40/2 = 140
        // vy = 70 + 20/2 = 80

        // Unscaled canvas coords:
        // ux = (140 - canvasRect.left (100)) / scale (1) = 40
        // uy = (80 - canvasRect.top (50)) / scale (1) = 30
        expect(ux).toBe(40);
        expect(uy).toBe(30);

        // Test with different scale
        panZoom.setScale(2);
        const { ux: ux2, uy: uy2 } = component._getUnscaledElementCenter(mockElement);
        expect(ux2).toBe(20); // 40 / 2
        expect(uy2).toBe(15); // 30 / 2
    });
});