import { GraphViewManager } from '@components/GraphViewManager.js';

describe('GraphViewManager', () => {
    let viewManager;
    let mockGraphState;
    let mockSvgLayer;
    let mockCanvas;
    let mockPanZoom;
    let mockLineCreator;
    let mockGetUnscaledElementCenter;

    beforeEach(() => {
        jest.useFakeTimers();
        mockGraphState = {
            currentSelectionCircle: null,
            currentSelectionCircleParentNode: null,
            currentSelectionCircleOffsetX: null,
            currentSelectionCircleOffsetY: null,
        };
        mockSvgLayer = {
            appendChild: jest.fn(),
        };
        mockCanvas = {
            style: {},
        };
        mockPanZoom = {
            pointX: 0,
            pointY: 0,
            scale: 1,
            setTransform: jest.fn(),
        };
        mockLineCreator = {
            createSelectionCircleSVG: jest.fn(() => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.style = {};
                return circle;
            }),
        };
        mockGetUnscaledElementCenter = jest.fn(() => ({ ux: 50, uy: 60 }));

        viewManager = new GraphViewManager({
            graphState: mockGraphState,
            svgLayer: mockSvgLayer,
            canvas: mockCanvas,
            panZoom: mockPanZoom,
            lineCreator: mockLineCreator,
            getUnscaledElementCenter: mockGetUnscaledElementCenter,
        });

        // Mock requestAnimationFrame
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('clearSelectionCircle', () => {
        test('should remove selection circle from DOM', () => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const parent = document.createElement('div');
            parent.appendChild(circle);
            mockGraphState.currentSelectionCircle = circle;

            viewManager.clearSelectionCircle();

            expect(parent.children.length).toBe(0);
            expect(mockGraphState.currentSelectionCircle).toBeNull();
        });
    });

    describe('focusKanji', () => {
        test('should create and append selection circle', () => {
            const kanjiElement = document.createElement('span');
            const parentNode = document.createElement('div');
            parentNode.appendChild(kanjiElement);

            viewManager.focusKanji(kanjiElement);

            expect(mockLineCreator.createSelectionCircleSVG).toHaveBeenCalled();
            expect(mockSvgLayer.appendChild).toHaveBeenCalled();
            expect(mockGraphState.currentSelectionCircle).not.toBeNull();
        });
    });

    describe('centerViewOnElement', () => {
        test('should set panZoom transform for a non-root element', () => {
            const element = document.createElement('div');
            element.style.left = '100px';
            element.style.top = '200px';
            element.dataset.isRootNode = 'false';

            viewManager.centerViewOnElement(element);

            expect(mockPanZoom.pointX).toBe(-100);
            expect(mockPanZoom.pointY).toBe(-200);
            expect(mockPanZoom.setTransform).toHaveBeenCalled();
        });

        test('should center on root node at (0,0)', () => {
            const element = document.createElement('div');
            element.dataset.isRootNode = 'true';

            viewManager.centerViewOnElement(element);

            expect(mockPanZoom.pointX).toBe(-0);
            expect(mockPanZoom.pointY).toBe(-0);
            expect(mockPanZoom.setTransform).toHaveBeenCalled();
        });

        test('should reset canvas transition after timeout', () => {
            const element = document.createElement('div');
            viewManager.centerViewOnElement(element);
            expect(mockCanvas.style.transition).toBe('transform 0.5s ease-in-out');
            jest.runAllTimers();
            expect(mockCanvas.style.transition).toBe('transform 0.1s ease-out');
        });
    });
});