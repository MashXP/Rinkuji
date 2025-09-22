import { PanZoom } from './utils/PanZoom.js';
import { RinkuGraph } from './components/RinkuGraph.js';
import { OptionsMenu } from './components/OptionsMenu.js';
import { NewSearchModal } from './components/NewSearchModal.js';
import { UITogglingManager } from './managers/UITogglingManager.js';
import { initializeResponsiveLayout } from './utils/responsive.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeResponsiveLayout();
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
    const rinkuVersionDisplay = document.getElementById('rinku-version-display'); // New element

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
    let panZoom;
    if (viewport && canvas && zoomInBtn && zoomOutBtn && resetViewBtn && zoomMeter) {
        panZoom = new PanZoom(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter);
    }

    // Instantiate RinkuGraph, passing PanZoom instance
    if (panZoom && wordContainer && svgLayer && nodesContainer && parentKanjiSidebar && parentKanjiSearchInput && parentKanjiListContainer) {
        new RinkuGraph(
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
    }

    // --- UI Toggling Centralization ---
    // Use the UITogglingManager's static helper to set up UI controls.

    // Setup for the "Hide/Show Controls" button
    if (hideUiBtn && rinkuFooter) {
        UITogglingManager.setupToggle({
            button: hideUiBtn,
            target: rinkuFooter,
            toggleClass: 'is-manually-hidden', // This class moves the footer off-screen.
            buttonToggleClass: 'active', // Let's use 'active' for consistency, assuming it styles the button when controls are shown.
            onState: { // State when 'is-manually-hidden' class IS present (target is hidden)
                html: '<i class="fas fa-caret-left"></i>',
                title: 'Show Controls'
            },
            offState: { // State when 'hidden' class is NOT present (target is visible)
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

    // Fetch and display latest version
    fetch('/api/changelog')
        .then(response => response.json())
        .then(data => {
            if (data.changelog && rinkuVersionDisplay) {
                const changelogMarkdown = data.changelog;
                const entries = parseChangelog(changelogMarkdown);
                if (entries.length > 0) {
                    const versionInfo = entries[0].title; // e.g., "Version 1.0.0 - 2025-09-22"
                    const parts = versionInfo.split(' - ', 1);
                    let formattedVersion = "null";
                    if (parts.length === 2) {
                        const versionNum = parts[0].trim();
                        // const versionDate = parts[1].trim(); // No need for date
                        formattedVersion = `${versionNum}`;
                    } else {
                        formattedVersion = versionInfo; // Fallback if format is unexpected
                    }
                    rinkuVersionDisplay.textContent = formattedVersion;
                } else {
                    rinkuVersionDisplay.textContent = 'null';
                }
            } else if (rinkuVersionDisplay) {
                rinkuVersionDisplay.textContent = 'null';
            }
        })
        .catch(error => {
            console.error('Error fetching changelog for version display:', error);
            if (rinkuVersionDisplay) {
                rinkuVersionDisplay.textContent = 'err';
            }
        });
});

function parseChangelog(markdown) {
    const entries = [];
    const sections = markdown.split(/(?=^## )/m);

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (section.startsWith('## ')) {
            const lines = section.split('\n');
            const titleLine = lines[0];
            const versionMatch = titleLine.match(/^##\s*(.+)/);
            if (versionMatch) {
                const versionTitle = versionMatch[1].trim();
                const content = lines.slice(1).join('\n').trim();
                entries.push({ title: versionTitle, markdown: content });
            }
        }
    }
    return entries;
}
