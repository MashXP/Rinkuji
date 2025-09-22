
import { PanZoom } from '../../src/js/utils/PanZoom.js';

describe('Integration: PanZoom Touch Functionality', () => {
    let viewport;
    let canvas;
    let panZoomInstance;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="viewport" style="width: 500px; height: 500px;"></div>
            <canvas id="canvas"></canvas>
            <button id="zoomInBtn"></button>
            <button id="zoomOutBtn"></button>
            <button id="resetViewBtn"></button>
            <div id="zoomMeter"></div>
        `;
        viewport = document.getElementById('viewport');
        canvas = document.getElementById('canvas');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetViewBtn = document.getElementById('resetViewBtn');
        const zoomMeter = document.getElementById('zoomMeter');

        // Mock getBoundingClientRect for viewport and canvas
        viewport.getBoundingClientRect = jest.fn(() => ({
            left: 0, top: 0, width: 500, height: 500, x: 0, y: 0, right: 500, bottom: 500,
        }));
        canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0, top: 0, width: 500, height: 500, x: 0, y: 0, right: 500, bottom: 500,
        }));

        panZoomInstance = new PanZoom(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter);
        panZoomInstance.resetView(); // Ensure initial state
    });

    test('should pan with a single touch drag', () => {
        const initialX = panZoomInstance.getPointX();
        const initialY = panZoomInstance.getPointY();

        // Simulate touchstart
        const touchstartEvent = new TouchEvent('touchstart', {
            touches: [{ clientX: 100, clientY: 100 }],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchstartEvent);

        // Simulate touchmove
        const touchmoveEvent = new TouchEvent('touchmove', {
            touches: [{ clientX: 150, clientY: 120 }],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchmoveEvent);

        // Simulate touchend
        const touchendEvent = new TouchEvent('touchend', {
            touches: [],
            changedTouches: [{ clientX: 150, clientY: 120 }],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchendEvent);

        // Expect the canvas to have moved by (50, 20)
        expect(panZoomInstance.getPointX()).toBe(initialX + 50);
        expect(panZoomInstance.getPointY()).toBe(initialY + 20);
    });

    test('should zoom with a two-finger pinch gesture', () => {
        const initialScale = panZoomInstance.getScale();

        // Simulate touchstart with two fingers
        const touchstartEvent = new TouchEvent('touchstart', {
            touches: [
                { clientX: 100, clientY: 100 },
                { clientX: 200, clientY: 100 },
            ],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchstartEvent);

        // Simulate touchmove, increasing pinch distance (zoom in)
        const touchmoveEvent = new TouchEvent('touchmove', {
            touches: [
                { clientX: 90, clientY: 100 },  // Move closer to center
                { clientX: 210, clientY: 100 }, // Move further from center
            ],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchmoveEvent);

        // Simulate touchend
        const touchendEvent = new TouchEvent('touchend', {
            touches: [],
            changedTouches: [
                { clientX: 90, clientY: 100 },
                { clientX: 210, clientY: 100 },
            ],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchendEvent);

        // Expect the scale to have increased
        expect(panZoomInstance.getScale()).toBeGreaterThan(initialScale);
    });

    test('should zoom out with a two-finger pinch gesture (decreasing distance)', () => {
        // First, zoom in a bit to have something to zoom out from
        panZoomInstance.zoomWithFactor(1.5, 0, 0); // Zoom in to 1.5x
        const initialScale = panZoomInstance.getScale();

        // Simulate touchstart with two fingers
        const touchstartEvent = new TouchEvent('touchstart', {
            touches: [
                { clientX: 100, clientY: 100 },
                { clientX: 200, clientY: 100 },
            ],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchstartEvent);

        // Simulate touchmove, decreasing pinch distance (zoom out)
        const touchmoveEvent = new TouchEvent('touchmove', {
            touches: [
                { clientX: 120, clientY: 100 }, // Move closer
                { clientX: 180, clientY: 100 }, // Move closer
            ],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchmoveEvent);

        // Simulate touchend
        const touchendEvent = new TouchEvent('touchend', {
            touches: [],
            changedTouches: [
                { clientX: 120, clientY: 100 },
                { clientX: 180, clientY: 100 },
            ],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchendEvent);

        // Expect the scale to have decreased
        expect(panZoomInstance.getScale()).toBeLessThan(initialScale);
    });

    test('should not pan if touchmove is cancelled', () => {
        const initialX = panZoomInstance.getPointX();
        const initialY = panZoomInstance.getPointY();

        // Simulate touchstart
        const touchstartEvent = new TouchEvent('touchstart', {
            touches: [{ clientX: 100, clientY: 100 }],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchstartEvent);

        // Simulate touchmove
        const touchmoveEvent = new TouchEvent('touchmove', {
            touches: [{ clientX: 150, clientY: 120 }],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchmoveEvent);

        // Simulate touchcancel
        const touchcancelEvent = new TouchEvent('touchcancel', {
            touches: [],
            changedTouches: [{ clientX: 150, clientY: 120 }],
            bubbles: true,
            cancelable: true,
        });
        viewport.dispatchEvent(touchcancelEvent);

        // Expect the canvas to have moved by (50, 20) before cancel
        expect(panZoomInstance.getPointX()).toBe(initialX + 50);
        expect(panZoomInstance.getPointY()).toBe(initialY + 20);

        // After touchcancel, panning should be reset, but the last move should have applied
        expect(panZoomInstance.panning).toBe(false);
    });
});
