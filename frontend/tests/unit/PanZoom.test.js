import { PanZoom } from '../../src/js/utils/PanZoom.js';

// JSDOM doesn't have TouchEvent, so we create a simple mock
class MockTouch {
    constructor(properties) {
        Object.assign(this, properties);
    }
}
global.TouchEvent = class MockTouchEvent extends Event {
    constructor(type, options = {}) {
        super(type, options);
        this.touches = (options.touches || []).map(t => new MockTouch(t));
    }
};

describe('PanZoom', () => {
    let viewport;
    let canvas;
    let zoomInBtn;
    let zoomOutBtn;
    let resetViewBtn;
    let zoomMeter;
    let panZoom;

    beforeEach(() => {
        // Create mock DOM elements
        document.body.innerHTML = `
            <div id="viewport">
                <canvas id="canvas"></canvas>
            </div>
            <button id="zoomInBtn"></button>
            <button id="zoomOutBtn"></button>
            <button id="resetViewBtn"></button>
            <div id="zoomMeter"></div>
        `;

        viewport = document.getElementById('viewport');
        canvas = document.getElementById('canvas');
        zoomInBtn = document.getElementById('zoomInBtn');
        zoomOutBtn = document.getElementById('zoomOutBtn');
        resetViewBtn = document.getElementById('resetViewBtn');
        zoomMeter = document.getElementById('zoomMeter');

        // Instantiate PanZoom
        panZoom = new PanZoom(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter);

        // Spy on setTransform to check if it's called, but let the original implementation run.
        jest.spyOn(panZoom, 'setTransform');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Mouse Panning', () => {
        test('should start panning on mousedown', () => {
            const mousedownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true, cancelable: true });
            const preventDefaultSpy = jest.spyOn(mousedownEvent, 'preventDefault');
            viewport.dispatchEvent(mousedownEvent);
            expect(preventDefaultSpy).toHaveBeenCalled();
            viewport.dispatchEvent(mousedownEvent);
            expect(panZoom.panning).toBe(true);
            expect(panZoom.lastMouseX).toBe(100);
            expect(panZoom.lastMouseY).toBe(100);
        });

        test('handlePanMouseMove should not pan if panning is false', () => {
            panZoom.panning = false;
            const mousemoveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 150, bubbles: true });

            panZoom.handlePanMouseMove(mousemoveEvent);

            expect(panZoom.pointX).toBe(0);
            expect(panZoom.pointY).toBe(0);
            expect(panZoom.setTransform).not.toHaveBeenCalled();
        });

        test('handlePanMouseMove should update points and transform when panning', () => {
            // Manually set panning state to unit test the handler
            panZoom.panning = true;
            panZoom.lastMouseX = 100;
            panZoom.lastMouseY = 100;

            const mousemoveEvent = new MouseEvent('mousemove', { clientX: 120, clientY: 130 });
            panZoom.handlePanMouseMove(mousemoveEvent);

            expect(panZoom.pointX).toBe(20); // 0 + (120 - 100)
            expect(panZoom.pointY).toBe(30); // 0 + (130 - 100)
            expect(panZoom.lastMouseX).toBe(120);
            expect(panZoom.lastMouseY).toBe(130);
            expect(panZoom.setTransform).toHaveBeenCalled();
        });

        test('should stop panning on mouseup', () => {
            panZoom.panning = true;
            const mouseupEvent = new MouseEvent('mouseup', { bubbles: true });
            viewport.dispatchEvent(mouseupEvent);
            expect(panZoom.panning).toBe(false);
        });

        test('should stop panning on mouseleave', () => {
            panZoom.panning = true;
            const mouseleaveEvent = new MouseEvent('mouseleave', { bubbles: true });
            viewport.dispatchEvent(mouseleaveEvent);
            expect(panZoom.panning).toBe(false);
        });
    });

    describe('Touch Events', () => {
        test('handleTouchStart should set up for one-finger panning', () => {
            const touchEvent = new TouchEvent('touchstart', {
                touches: [{ clientX: 50, clientY: 50 }],
                bubbles: true
            });
            viewport.dispatchEvent(touchEvent);

            expect(panZoom.panning).toBe(true);
            expect(panZoom.lastTouchX).toBe(50);
            expect(panZoom.lastTouchY).toBe(50);
            expect(panZoom.isTwoFingerPinch).toBe(false);
        });

        test('handleTouchStart should set up for two-finger pinch', () => {
            const touchEvent = new TouchEvent('touchstart', {
                touches: [
                    { clientX: 50, clientY: 50 },
                    { clientX: 150, clientY: 50 } // 100px apart
                ],
                bubbles: true
            });
            viewport.dispatchEvent(touchEvent);

            expect(panZoom.isTwoFingerPinch).toBe(true);
            expect(panZoom.initialPinchDistance).toBe(100);
            expect(panZoom.panning).toBe(false);
        });

        test('handleTouchStart should do nothing for more than two fingers', () => {
            const touchEvent = new TouchEvent('touchstart', {
                touches: [
                    { clientX: 50, clientY: 50 },
                    { clientX: 150, clientY: 50 },
                    { clientX: 100, clientY: 150 }
                ],
                bubbles: true
            });
            viewport.dispatchEvent(touchEvent);

            expect(panZoom.panning).toBe(false);
            expect(panZoom.isTwoFingerPinch).toBe(false);
        });

        test('handleTouchMove should handle one-finger panning', () => {
            // Start one-finger pan
            viewport.dispatchEvent(new TouchEvent('touchstart', {
                touches: [{ clientX: 100, clientY: 100 }],
                bubbles: true
            }));

            const moveTouchEvent = new TouchEvent('touchmove', {
                touches: [{ clientX: 120, clientY: 130 }],
                bubbles: true
            });
            const preventDefaultSpy = jest.spyOn(moveTouchEvent, 'preventDefault');
            viewport.dispatchEvent(moveTouchEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(panZoom.pointX).toBe(20);
            expect(panZoom.pointY).toBe(30);
            expect(panZoom.lastTouchX).toBe(120);
            expect(panZoom.lastTouchY).toBe(130);
            expect(panZoom.setTransform).toHaveBeenCalled();
        });

        test('handleTouchMove should handle two-finger pinch zoom', () => {
            // Start pinch
            viewport.dispatchEvent(new TouchEvent('touchstart', {
                touches: [
                    { clientX: 50, clientY: 50 },
                    { clientX: 150, clientY: 50 } // 100px apart
                ],
                bubbles: true
            }));

            viewport.getBoundingClientRect = jest.fn(() => ({ left: 10, top: 20, width: 1000, height: 800 }));

            const moveTouchEvent = new TouchEvent('touchmove', {
                touches: [
                    { clientX: 25, clientY: 50 },
                    { clientX: 175, clientY: 50 } // 150px apart
                ],
                bubbles: true
            });
            const preventDefaultSpy = jest.spyOn(moveTouchEvent, 'preventDefault');
            viewport.dispatchEvent(moveTouchEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(panZoom.setTransform).toHaveBeenCalled();
            // Check that scale has changed
            expect(panZoom.getScale()).toBeCloseTo(1.5);
            // Check that position has changed due to zooming on a point
            expect(panZoom.getPointX()).not.toBe(0);
            expect(panZoom.getPointY()).not.toBe(0);
        });

        test('handleTouchCancel should reset touch states', () => {
            panZoom.panning = true;
            panZoom.isTwoFingerPinch = true;
            panZoom.initialPinchDistance = 100;

            const touchCancelEvent = new TouchEvent('touchcancel', { bubbles: true });
            viewport.dispatchEvent(touchCancelEvent);

            expect(panZoom.panning).toBe(false);
            expect(panZoom.isTwoFingerPinch).toBe(false);
            expect(panZoom.initialPinchDistance).toBeNull();
        });

        test('handleTouchEnd should reset touch states when all fingers are lifted', () => {
            panZoom.panning = true;
            panZoom.isTwoFingerPinch = true;
            panZoom.initialPinchDistance = 100;

            const touchendEvent = new TouchEvent('touchend', {
                touches: [], // No remaining touches
                bubbles: true
            });
            viewport.dispatchEvent(touchendEvent);

            expect(panZoom.panning).toBe(false);
            expect(panZoom.isTwoFingerPinch).toBe(false);
            expect(panZoom.initialPinchDistance).toBeNull();
        });

        test('handleTouchEnd should switch from pinch to pan when one finger remains', () => {
            panZoom.isTwoFingerPinch = true;
            const touchendEvent = new TouchEvent('touchend', {
                touches: [{ clientX: 50, clientY: 50 }], // One finger remains
                bubbles: true
            });
            viewport.dispatchEvent(touchendEvent);

            expect(panZoom.isTwoFingerPinch).toBe(false);
            expect(panZoom.panning).toBe(true); // Should switch to panning
            expect(panZoom.lastTouchX).toBe(50);
        });

        test('handleTouchEnd should do nothing special if one finger remains but was not pinching', () => {
            panZoom.panning = true; // Was in one-finger pan mode
            panZoom.isTwoFingerPinch = false;

            const touchendEvent = new TouchEvent('touchend', {
                touches: [{ clientX: 50, clientY: 50 }], // One finger remains
                bubbles: true
            });
            viewport.dispatchEvent(touchendEvent);

            // State should not change, as it was already panning. The method should just do nothing.
            expect(panZoom.panning).toBe(true);
            expect(panZoom.isTwoFingerPinch).toBe(false);
        });
    });

    describe('Mouse Wheel Zoom', () => {
        test('should zoom in on wheel up', () => {
            viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, top: 0, width: 1000, height: 800 }));
            const wheelEvent = new WheelEvent('wheel', { deltaY: -100, clientX: 600, clientY: 450, bubbles: true, cancelable: true });
            const preventDefaultSpy = jest.spyOn(wheelEvent, 'preventDefault');
            viewport.dispatchEvent(wheelEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(panZoom.setTransform).toHaveBeenCalled();
            expect(panZoom.getScale()).toBeCloseTo(1.1);
        });

        test('should zoom out on wheel down', () => {
            viewport.getBoundingClientRect = jest.fn(() => ({ left: 0, top: 0, width: 1000, height: 800 }));
            const wheelEvent = new WheelEvent('wheel', { deltaY: 100, clientX: 400, clientY: 350, bubbles: true, cancelable: true });
            viewport.dispatchEvent(wheelEvent);

            expect(panZoom.setTransform).toHaveBeenCalled();
            expect(panZoom.getScale()).toBeCloseTo(1 / 1.1);
        });
    });

    describe('Zoom Limits', () => {
        test('zoomWithIncrement should not zoom past MAX_SCALE', () => {
            panZoom.scale = panZoom.MAX_SCALE;
            panZoom.setTransform.mockClear(); // Clear calls from setup

            panZoom.zoomWithIncrement(panZoom.SCALE_INCREMENT); // Try to zoom in more

            expect(panZoom.getScale()).toBe(panZoom.MAX_SCALE);
            expect(panZoom.setTransform).not.toHaveBeenCalled(); // Should return early
        });

        test('zoomWithFactor should not zoom past MIN_SCALE', () => {
            panZoom.scale = panZoom.MIN_SCALE;
            panZoom.setTransform.mockClear();

            panZoom.zoomWithFactor(0.5, 0, 0); // Try to zoom out more

            expect(panZoom.getScale()).toBe(panZoom.MIN_SCALE);
            expect(panZoom.setTransform).not.toHaveBeenCalled(); // Should return early
        });
    });

    describe('Button Controls', () => {
        test('zoomInBtn click should call zoomWithIncrement with positive value', () => {
            const initialScale = panZoom.getScale();
            zoomInBtn.click();
            expect(panZoom.getScale()).toBe(initialScale + panZoom.SCALE_INCREMENT);
            expect(panZoom.setTransform).toHaveBeenCalled();
        });

        test('zoomOutBtn click should call zoomWithIncrement with negative value', () => {
            const initialScale = panZoom.getScale();
            zoomOutBtn.click();
            expect(panZoom.getScale()).toBe(initialScale - panZoom.SCALE_INCREMENT);
            expect(panZoom.setTransform).toHaveBeenCalled();
        });

        test('resetViewBtn click should call resetView', () => {
            // Make some changes first
            panZoom.scale = 1.5;
            panZoom.pointX = 50;
            panZoom.pointY = 50;

            resetViewBtn.click();

            expect(panZoom.getScale()).toBe(1);
            expect(panZoom.getPointX()).toBe(0);
            expect(panZoom.getPointY()).toBe(0);
            expect(panZoom.setTransform).toHaveBeenCalled();
        });
    });
});