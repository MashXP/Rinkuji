import { PanZoom } from './utils/PanZoom.js';
import { RinkuGraph } from './components/RinkuGraph.js';
import { OptionsMenu } from './components/OptionsMenu.js';
import { NewSearchModal } from './components/NewSearchModal.js';
import { UITogglingManager } from './managers/UITogglingManager.js';

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

    // Options Modal elements
    const optionsModal = document.getElementById('optionsModal');
    const optionsBtn = document.getElementById('optionsBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // New Search Modal elements
    const newSearchModal = document.getElementById('newSearchModal');
    const newSearchBtn = document.getElementById('newSearchBtn');
    const newSearchModalCloseBtn = document.getElementById('newSearchModalCloseBtn');
    const newSearchInput = document.getElementById('newSearchInput');
    const suggestionsList = document.getElementById('suggestionsList');
    const jishoLoadingIndicator = document.getElementById('jishoLoadingIndicator');

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
        parentKanjiSearchInput,
        parentKanjiListContainer,
        panZoom
    );

    // --- UI Toggling Centralization ---
    // Use the UITogglingManager's static helper to set up UI controls.

    // Setup for the "Hide/Show Controls" button
    if (hideUiBtn && rinkuFooter) {
        UITogglingManager.setupToggle({
            button: hideUiBtn,
            target: rinkuFooter,
            toggleClass: 'is-manually-hidden',
            onState: { // State when UI is hidden
                html: '<i class="fas fa-caret-left"></i>',
                title: 'Show Controls'
            },
            offState: { // State when UI is visible
                html: '<i class="fas fa-caret-right"></i>',
                title: 'Hide Controls'
            }
        });
    }

    // Setup for the sidebar toggle button
    if (sidebarToggleBtn && parentKanjiSidebar) {
        UITogglingManager.setupToggle({
            button: sidebarToggleBtn,
            target: parentKanjiSidebar,
            toggleClass: 'visible',
            buttonToggleClass: 'active',
            onState: { // State when sidebar is visible
                html: '<i class="fas fa-times"></i>',
                title: 'Close Kanji List'
            },
            offState: { // State when UI is hidden
                html: '<i class="fas fa-bars"></i>',
                title: 'Toggle Kanji List'
            }
        });
    }

    // Instantiate OptionsMenu
    if (optionsModal && optionsBtn && modalCloseBtn) {
        new OptionsMenu(optionsModal, optionsBtn, modalCloseBtn);
    }

    // Instantiate NewSearchModal
    let searchModal;
    if (newSearchModal && newSearchBtn && newSearchModalCloseBtn && newSearchInput && suggestionsList && jishoLoadingIndicator) {
        searchModal = new NewSearchModal(newSearchModal, newSearchBtn, newSearchModalCloseBtn, newSearchInput, suggestionsList, jishoLoadingIndicator);
    }

    // Check if the initial word is empty and show the search modal
    const urlParams = new URLSearchParams(window.location.search);
    const wordParam = urlParams.get('word');

    if (!wordParam && searchModal) {
        searchModal.show();
    }
});