document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('rinkuViewport');
    const canvas = document.getElementById('rinkuCanvas');
    const wordContainer = document.getElementById('rinkuWord');
    const word = wordContainer.dataset.word;

    // Zoom UI elements
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');
    const zoomMeter = document.getElementById('zoomMeter');

    // 1. Populate the word with clickable Kanji
    const kanjiRegex = /[\u4e00-\u9faf]/;
    word.split('').forEach(char => {
        const charSpan = document.createElement('span');
        charSpan.textContent = char;
        if (kanjiRegex.test(char)) {
            charSpan.classList.add('kanji-char');
            charSpan.addEventListener('click', () => {
                // Placeholder for future functionality
                alert(`You clicked on the kanji: ${char}`);
            });
        }
        wordContainer.appendChild(charSpan);
    });

    // 2. Pan and Zoom State & Constants
    let scale = 1; // Current zoom level (1 = 100%)
    let panning = false; // Is the user currently panning?
    let pointX = 0; // X translation of the canvas (relative to its flexbox-centered position)
    let pointY = 0; // Y translation of the canvas (relative to its flexbox-centered position)
    let lastMouseX = 0; // Last mouse X position for panning
    let lastMouseY = 0; // Last mouse Y position for panning

    const MIN_SCALE = 0.25;
    const MAX_SCALE = 2.0;
    const SCALE_INCREMENT = 0.25;

    // 3. Helper Functions
    function updateZoomMeter() {
        zoomMeter.textContent = `${Math.round(scale * 100)}%`;
    }

    function setTransform() {
        canvas.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
        updateZoomMeter();
    }

    // Zooms by a fixed increment, centered on the viewport (for buttons)
    function zoomWithIncrement(increment) {
        const oldScale = scale;
        const newScale = oldScale + increment;
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

        if (oldScale === scale) return; // No change, do nothing

        const factor = scale / oldScale;

        // Calculate the viewport center in the canvas's current coordinate system
        // This makes the zoom consistent with the mouse wheel zoom
        const canvasRect = canvas.getBoundingClientRect();
        const viewportCenterX_in_canvas_coords = (viewport.clientWidth / 2) - canvasRect.left;
        const viewportCenterY_in_canvas_coords = (viewport.clientHeight / 2) - canvasRect.top;

        // Apply the zoom-at-point formula using viewport center as the fixed point
        pointX = viewportCenterX_in_canvas_coords - (viewportCenterX_in_canvas_coords - pointX) * factor;
        pointY = viewportCenterY_in_canvas_coords - (viewportCenterY_in_canvas_coords - pointY) * factor;

        setTransform();
    }

    // Zooms by a factor, at a specific point (for mouse wheel)
    function zoomWithFactor(factor, mouseX, mouseY) {
        const oldScale = scale;
        const newScale = oldScale * factor;
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

        if (oldScale === scale) return; // No change, do nothing

        const actualFactor = scale / oldScale;

        // Apply the zoom-at-point formula
        // mouseX, mouseY are relative to the canvas's current top-left
        // pointX, pointY are the current translation values
        pointX = mouseX - (mouseX - pointX) * actualFactor;
        pointY = mouseY - (mouseY - pointY) * actualFactor;

        setTransform();
    }

    // 4. Initial Setup & Reset Logic
    function resetView() {
        // Reset to no translation (which is the flexbox-centered position)
        pointX = 0;
        pointY = 0;
        scale = 1;
        setTransform();
    }

    // 5. Event Listeners
    viewport.addEventListener('mousedown', (e) => {
        e.preventDefault();
        panning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    viewport.addEventListener('mouseup', () => {
        panning = false;
    });

    viewport.addEventListener('mouseleave', () => {
        panning = false;
    });

    viewport.addEventListener('mousemove', (e) => {
        if (!panning) return;
        // Update pointX and pointY based on mouse movement
        pointX += (e.clientX - lastMouseX);
        pointY += (e.clientY - lastMouseY);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        setTransform();
    });

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        // Get mouse position relative to the canvas's current top-left
        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomWithFactor(factor, mouseX, mouseY);
    });

    zoomInBtn.addEventListener('click', () => {
        zoomWithIncrement(SCALE_INCREMENT);
    });

    zoomOutBtn.addEventListener('click', () => {
        zoomWithIncrement(-SCALE_INCREMENT);
    });

    resetViewBtn.addEventListener('click', () => {
        resetView();
    });

    // 6. Initialize the view on load
    resetView();
});