// d:/Rinkuji/static/PanZoom.js

// Class to manage Pan and Zoom functionality
export class PanZoom {
    constructor(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter) {
        this.viewport = viewport;
        this.canvas = canvas;
        this.zoomInBtn = zoomInBtn;
        this.zoomOutBtn = zoomOutBtn;
        this.resetViewBtn = resetViewBtn;
        this.zoomMeter = zoomMeter;

        this.scale = 1;
        this.pointX = 0;
        this.pointY = 0;
        this.panning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.initialPinchDistance = null;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.isTwoFingerPinch = false;

        this.MIN_SCALE = 0.25;
        this.MAX_SCALE = 2.0;
        this.SCALE_INCREMENT = 0.25;

        this.addEventListeners();
        this.resetView(); // Initial setup
    }

    getScale() { return this.scale; }
    getPointX() { return this.pointX; }
    getPointY() { return this.pointY; }

    updateZoomMeter() {
        this.zoomMeter.textContent = `${Math.round(this.scale * 100)}%`;
    }

    setTransform() {
        this.canvas.style.transform = `translate(${this.pointX}px, ${this.pointY}px) scale(${this.scale})`;
        this.updateZoomMeter();
    }

    zoomWithIncrement(increment) {
        const oldScale = this.scale;
        const newScale = oldScale + increment;
        this.scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));

        if (oldScale === this.scale) return; // No change, do nothing

        const factor = this.scale / oldScale;

        // The point to zoom on is the center (0,0) in the transform's coordinate space.
        // The formula new_pan = mouse_pos - (mouse_pos - old_pan) * factor becomes:
        // new_pan = 0 - (0 - old_pan) * factor = old_pan * factor
        this.pointX *= factor;
        this.pointY *= factor;

        this.setTransform();
    }

    zoomWithFactor(factor, mouseX, mouseY) {
        const oldScale = this.scale;
        const newScale = oldScale * factor;
        this.scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));

        if (oldScale === this.scale) return;

        const actualFactor = this.scale / oldScale;
        // The formula is new_pan = mouse_pos - (mouse_pos - old_pan) * zoom_factor
        // where mouse_pos and old_pan are in the same coordinate system.
        this.pointX = mouseX - (mouseX - this.pointX) * actualFactor;
        this.pointY = mouseY - (mouseY - this.pointY) * actualFactor;
        this.setTransform();
    }

    resetView() {
        this.pointX = 0;
        this.pointY = 0;
        this.scale = 1;
        this.setTransform();
    }

    // Public method for RinkuGraph to call for panning
    handlePanMouseMove(e) {
        if (this.panning) {
            this.pointX += (e.clientX - this.lastMouseX);
            this.pointY += (e.clientY - this.lastMouseY);
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.setTransform();
        }
    }

    handleTouchStart(e) {
        // e.preventDefault(); // Prevent scrolling and default browser zoom - only prevent on touchmove if it's a pan/pinch

        if (e.touches.length === 1) {
            this.panning = true;
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            this.isTwoFingerPinch = true;
            this.initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }

    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling and default browser zoom

        if (this.isTwoFingerPinch && e.touches.length === 2) {
            const currentPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = currentPinchDistance / this.initialPinchDistance;

            // Calculate the midpoint of the two touches for zooming center
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            const viewportRect = this.viewport.getBoundingClientRect();
            const viewport_center_x = viewportRect.left + viewportRect.width / 2;
            const viewport_center_y = viewportRect.top + viewportRect.height / 2;

            const mouse_rel_x = midX - viewport_center_x;
            const mouse_rel_y = midY - viewport_center_y;

            this.zoomWithFactor(factor, mouse_rel_x, mouse_rel_y);
            this.initialPinchDistance = currentPinchDistance; // Update for next move
        } else if (this.panning && e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - this.lastTouchX;
            const deltaY = e.touches[0].clientY - this.lastTouchY;
            this.pointX += deltaX;
            this.pointY += deltaY;
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
            this.setTransform();
        }
    }

    handleTouchEnd(e) {
        this.panning = false;
        this.isTwoFingerPinch = false;
        this.initialPinchDistance = null;
    }

    handleTouchCancel(e) {
        this.panning = false;
        this.isTwoFingerPinch = false;
        this.initialPinchDistance = null;
    }

    addEventListeners() {
        this.viewport.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.panning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.viewport.addEventListener('mouseup', () => {
            this.panning = false;
        });

        this.viewport.addEventListener('mouseleave', () => {
            this.panning = false;
        });

        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();

            const viewportRect = this.viewport.getBoundingClientRect();
            // The center of the viewport is the origin of our transform's coordinate system
            const viewport_center_x = viewportRect.left + viewportRect.width / 2;
            const viewport_center_y = viewportRect.top + viewportRect.height / 2;

            // Calculate mouse position relative to the transform's origin
            const mouse_rel_x = e.clientX - viewport_center_x;
            const mouse_rel_y = e.clientY - viewport_center_y;

            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            this.zoomWithFactor(factor, mouse_rel_x, mouse_rel_y);
        });

        this.zoomInBtn.addEventListener('click', () => this.zoomWithIncrement(this.SCALE_INCREMENT));
        this.zoomOutBtn.addEventListener('click', () => this.zoomWithIncrement(-this.SCALE_INCREMENT));
        this.resetViewBtn.addEventListener('click', () => this.resetView());

        // Touch events
        this.viewport.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.viewport.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.viewport.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.viewport.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
    }
}