// d:/Rinkuji/static/main.js

import { PanZoom } from './PanZoom.js'; // Assuming PanZoom is also a module
import { RinkuGraph } from './RinkuGraph.js'; // Import RinkuGraph as a module

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
    // Sidebar elements
    const parentKanjiSidebar = document.getElementById('parentKanjiSidebar');
    const parentKanjiSearchInput = document.getElementById('parentKanjiSearch');
    const parentKanjiListContainer = document.getElementById('parentKanjiList');

    // Sidebar Toggle Button
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');

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
});