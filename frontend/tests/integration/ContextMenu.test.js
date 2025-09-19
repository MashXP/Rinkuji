import { RinkuGraph } from '../../src/js/components/RinkuGraph.js';
import { PanZoom } from '../../src/js/utils/PanZoom.js';
import * as apiService from '@services/api.js';

// Mock the API service
jest.mock('@services/api.js', () => ({
    getWordGraph: jest.fn(),
    searchByKanji: jest.fn(),
}));

describe('Integration: Context Menu Functionality', () => {
    let viewport;
    let canvas;
    let wordContainer;
    let svgLayer;
    let nodesContainer;
    let parentKanjiSidebar;
    let parentKanjiSearchInput;
    let parentKanjiListContainer;
    let panZoomInstance;
    let rinkuGraph;
    let nodeContextMenu;

    // Mock fetch as it's used directly by RinkuGraph
    global.fetch = jest.fn();

    beforeEach(async () => {
        jest.clearAllMocks();
        document.body.innerHTML = `
            <div id="viewport"></div>
            <canvas id="canvas"></canvas>
            <div id="wordContainer" data-word="" data-word-slug=""></div>
            <svg id="svgLayer"></svg>
            <div id="nodesContainer"></div>
            <div id="parentKanjiSidebar"></div>
            <input id="parentKanjiSearchInput" type="text">
            <div id="parentKanjiListContainer"></div>
            <div id="nodeContextMenu" class="context-menu">
                <div class="context-menu-item" data-action="collapse">Collapse</div>
                <div class="context-menu-item" data-action="expand" style="display: none;">Expand</div>
                <div class="context-menu-item" data-action="randomize" style="display: none;">Randomize Children</div>
                <div class="context-menu-item" has-submenu">
                    Filter Content
                    <div class="context-menu-submenu">
                        <div class="context-menu-item" data-action="filter-all">Show All</div>
                        <div class="context-menu-item" data-action="filter-kanji">Only Kanji</div>
                        <div class="context-menu-item" data-action="filter-start-kanji">Start from Clicked Kanji</div>
                    </div>
                </div>
            </div>
            <div id="meaningBar"></div>
            <button id="zoomInBtn"></button>
            <button id="zoomOutBtn"></button>
            <button id="resetViewBtn"></button>
            <div id="zoomMeter"></div>
        `;

        viewport = document.getElementById('viewport');
        canvas = document.getElementById('canvas');
        wordContainer = document.getElementById('wordContainer');
        svgLayer = document.getElementById('svgLayer');
        nodesContainer = document.getElementById('nodesContainer');
        parentKanjiSidebar = document.getElementById('parentKanjiSidebar');
        parentKanjiSearchInput = document.getElementById('parentKanjiSearchInput');
        parentKanjiListContainer = document.getElementById('parentKanjiListContainer');
        nodeContextMenu = document.getElementById('nodeContextMenu');

        canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 1000,
            height: 800,
            x: 0,
            y: 0,
            right: 1000,
            bottom: 800,
        }));

        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetViewBtn = document.getElementById('resetViewBtn');
        const zoomMeter = document.getElementById('zoomMeter');
        panZoomInstance = new PanZoom(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter);

        rinkuGraph = new RinkuGraph(
            viewport, canvas, wordContainer, svgLayer, nodesContainer,
            parentKanjiSidebar, parentKanjiSearchInput, parentKanjiListContainer, panZoomInstance
        );

        // Mock requestAnimationFrame to execute immediately
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());

        // Setup initial graph state for interactions
        const initialWordData = {
            word: '日本語',
            kanji: [
                { char: '日', meaning: 'day' }
            ]
        };
        apiService.getWordGraph.mockResolvedValue({ data: initialWordData });
        wordContainer.dataset.word = initialWordData.word;
        wordContainer.dataset.wordSlug = initialWordData.word;
        const kanjiSpan = document.createElement('span');
        kanjiSpan.textContent = '日';
        kanjiSpan.classList.add('kanji-char');
        wordContainer.appendChild(kanjiSpan);
        rinkuGraph._addKanjiEventListeners(kanjiSpan);

        // Simulate expansion
        const relatedWordsResponse = {
            data: [
                { slug: '休日', meaning: 'holiday' },
                { slug: '毎日', meaning: 'every day' }
            ]
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(relatedWordsResponse),
        });
        await rinkuGraph.handleKanjiClick({ currentTarget: kanjiSpan });

        // Ensure nodes are created before interaction tests
        const node1 = nodesContainer.querySelector('[data-word-slug="休日"]');
        expect(node1).not.toBeNull();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('context menu should appear on right-click of a node and trigger collapse', () => {
        const targetNode = nodesContainer.querySelector('[data-word-slug="休日"]');
        const collapseNodeSpy = jest.spyOn(rinkuGraph.nodeCollapseExpandManager, 'collapseNode');

        // Simulate right-click on the node
        const contextMenuEvent = new MouseEvent('contextmenu', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
            cancelable: true,
        });
        targetNode.dispatchEvent(contextMenuEvent);

        expect(nodeContextMenu.style.display).toBe('block');

        // Simulate clicking the collapse menu item
        const collapseMenuItem = nodeContextMenu.querySelector('[data-action="collapse"]');
        expect(collapseMenuItem).not.toBeNull();
        collapseMenuItem.click();

        expect(collapseNodeSpy).toHaveBeenCalledWith(targetNode);
        expect(nodeContextMenu.style.display).toBe('none'); // Menu should hide after action

        collapseNodeSpy.mockRestore();
    });

    test('context menu should appear on right-click of a kanji span and trigger filter', () => {
        const targetNode = nodesContainer.querySelector('[data-word-slug="休日"]');
        const kanjiSpan = targetNode.querySelector('span'); // Assuming first span is a kanji
        const filterNodeContentSpy = jest.spyOn(rinkuGraph.nodeFilterManager, 'filterNodeContent');

        // Simulate right-click on the kanji span
        const contextMenuEvent = new MouseEvent('contextmenu', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
            cancelable: true,
        });
        kanjiSpan.dispatchEvent(contextMenuEvent);

        expect(nodeContextMenu.style.display).toBe('block');

        // Simulate clicking the filter menu item
        const filterMenuItem = nodeContextMenu.querySelector('[data-action="filter-start-kanji"]');
        expect(filterMenuItem).not.toBeNull();
        filterMenuItem.click();

        expect(filterNodeContentSpy).toHaveBeenCalledWith(targetNode, 'start-kanji', kanjiSpan.textContent);
        expect(nodeContextMenu.style.display).toBe('none'); // Menu should hide after action

        filterNodeContentSpy.mockRestore();
    });

    test('context menu should hide on document click outside menu', () => {
        const targetNode = nodesContainer.querySelector('[data-word-slug="休日"]');

        // Simulate right-click to show menu
        const contextMenuEvent = new MouseEvent('contextmenu', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
            cancelable: true,
        });
        targetNode.dispatchEvent(contextMenuEvent);
        expect(nodeContextMenu.style.display).toBe('block');

        // Simulate click on document body (outside menu)
        document.body.click();
        expect(nodeContextMenu.style.display).toBe('none');
    });
});