import { PanZoom } from './PanZoom.js';
import { RinkuGraph } from './RinkuGraph.js';
import { UIAutoHideManager } from './UIAutoHideManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('rinkuViewport');
    const canvas = document.getElementById('rinkuCanvas');
    const wordContainer = document.getElementById('rinkuWord');

    // Graph-related elements
    const svgLayer = document.getElementById('rinkuSvgLayer');
    const nodesContainer = document.getElementById('rinkuNodesContainer');
    // Zoom UI elements
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');
    const zoomMeter = document.getElementById('zoomMeter');
    const zoomControls = document.querySelector('.zoom-controls');
    // Sidebar elements
    const parentKanjiSidebar = document.getElementById('parentKanjiSidebar');
    const parentKanjiSearchInput = document.getElementById('parentKanjiSearch');
    const parentKanjiListContainer = document.getElementById('parentKanjiList');

    // Sidebar Toggle Button
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    // Footer
    const rinkuFooter = document.querySelector('.footer-rinku');
    const hideUiBtn = document.getElementById('hideUiBtn');

    // Instantiate PanZoom
    const panZoom = new PanZoom(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter);

    // Instantiate RinkuGraph, passing PanZoom instance
    const rinkuGraph = new RinkuGraph(
        viewport,
        canvas,
        wordContainer,
        svgLayer,
        nodesContainer,
        parentKanjiSidebar,
        sidebarToggleBtn,
        parentKanjiSearchInput,
        parentKanjiListContainer,
        panZoom
    );

    // Setup auto-hiding for designated UI elements (Footer is now handled manually)
    const autoHideElements = [sidebarToggleBtn, zoomControls];
    const uiAutoHideManager = new UIAutoHideManager(autoHideElements);
    uiAutoHideManager.init();

    // Add click listener for the manual hide button to toggle the footer
    if (hideUiBtn && rinkuFooter) {
        hideUiBtn.addEventListener('click', () => {
            const isHidden = rinkuFooter.classList.toggle('is-manually-hidden');
            // Change the button icon and title based on the new state
            hideUiBtn.innerHTML = isHidden ? '◀' : '▶';
            hideUiBtn.title = isHidden ? 'Show Controls' : 'Hide Controls';
        });
    }
});