import { RinkuGraph } from '../../src/js/components/RinkuGraph.js';
import { PanZoom } from '../../src/js/utils/PanZoom.js';
import { GraphExpansionManager } from '../../src/js/components/GraphExpansionManager.js';
import { waitFor } from '@testing-library/dom';
import * as apiService from '@services/api.js';

// Mock the API service
jest.mock('@services/api.js', () => ({
    getWordGraph: jest.fn(),
    searchByKanji: jest.fn(),
    searchWord: jest.fn(),
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
    let rinkuGraph; // Declare at the top level
    let nodeContextMenu;

    // Mock fetch as it's used directly by RinkuGraph
    global.fetch = jest.fn();

    beforeEach(async () => {
        jest.clearAllMocks(); // Clear mocks before each test
        document.body.innerHTML = `
            <div id="viewport"></div>
            <canvas id="canvas"></canvas>
            <div id="rinkuWord" data-word="" data-word-slug=""></div>
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
        wordContainer = document.getElementById('rinkuWord');
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

        // Instantiate a fresh RinkuGraph for each test
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
            json: () => Promise.resolve(relatedWordsResponse)
        });
        await rinkuGraph.expansionManager.handleKanjiClick({ currentTarget: kanjiSpan });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('context menu should appear on right-click of a node and trigger collapse', async () => {
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

    test('context menu should show expand option for a collapsed node and trigger expand', async () => {
        const targetNode = nodesContainer.querySelector('[data-word-slug="休日"]');
        const expandNodeSpy = jest.spyOn(rinkuGraph.nodeCollapseExpandManager, 'expandNode');

        // 1. Manually collapse the node first
        rinkuGraph.nodeCollapseExpandManager.collapseNode(targetNode);
        expect(targetNode.dataset.collapsed).toBe('true');

        // 2. Simulate right-click on the now-collapsed node
        const contextMenuEvent = new MouseEvent('contextmenu', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
            cancelable: true,
        });
        targetNode.dispatchEvent(contextMenuEvent);

        // 3. Verify the correct menu items are displayed
        expect(nodeContextMenu.style.display).toBe('block');
        expect(nodeContextMenu.querySelector('[data-action="collapse"]').style.display).toBe('none');
        expect(nodeContextMenu.querySelector('[data-action="expand"]').style.display).toBe('block');

        // 4. Simulate clicking the expand menu item
        const expandMenuItem = nodeContextMenu.querySelector('[data-action="expand"]');
        expandMenuItem.click();

        expect(expandNodeSpy).toHaveBeenCalledWith(targetNode);
    });

    test('context menu should appear on right-click of a kanji span and trigger filter', async () => {
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

    test('context menu should hide on document click outside menu', async () => {
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

    test('context menu should trigger rerandomize action and update nodes', async () => {
        // This test has complex state. Clear the containers to ensure no leakage from beforeEach.
        // Spy on the prototype BEFORE the instance is created.
        // This ensures that when RinkuGraph creates its GraphExpansionManager, the spy is already on the prototype.
        const rerandomizeSpy = jest.spyOn(GraphExpansionManager.prototype, 'rerandomizeNode');

        nodesContainer.innerHTML = '';
        wordContainer.innerHTML = '';
        wordContainer.dataset.word = '日本語'; // Set the word for the initializer

        const rinkuGraph = new RinkuGraph(
            viewport, canvas, wordContainer, svgLayer, nodesContainer,
            parentKanjiSidebar, parentKanjiSearchInput, parentKanjiListContainer, panZoomInstance
        );
        const kanjiSpan = Array.from(wordContainer.querySelectorAll('.kanji-char')).find(s => s.textContent === '日');

        // 1. Mock initial expansion with >3 words to enable the randomize option
        const initialExpansionResponse = {
            data: [
                { slug: '休日', meaning: 'holiday' },
                { slug: '毎日', meaning: 'every day' },
                { slug: '日曜日', meaning: 'sunday' },
                { slug: '本日', meaning: 'today' } // 4th word
            ]
        };
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(initialExpansionResponse),
        });

        // 2. Expand the node
        await rinkuGraph.expansionManager.handleKanjiClick({ currentTarget: kanjiSpan }); // This is correct, it's on the manager
        expect(nodesContainer.querySelectorAll('.expanded-node').length).toBe(3); // MAX_WORDS_TO_DISPLAY is 3
        expect(kanjiSpan.dataset.hasMoreWords).toBe('true');

        // 3. Right-click the source kanji to show the context menu
        const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true });
        kanjiSpan.dispatchEvent(contextMenuEvent);

        // 4. Mock the fetch call for the rerandomize action
        const rerandomizeResponse = {
            data: [
                { slug: '日本', meaning: 'japan' },
                { slug: '平日', meaning: 'weekday' },
            ]
        };
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(rerandomizeResponse),
        });

        // 5. Find and click the "Randomize Children" menu item
        const randomizeMenuItem = nodeContextMenu.querySelector('[data-action="randomize"]');
        expect(randomizeMenuItem).not.toBeNull();
        expect(randomizeMenuItem.style.display).toBe('block');
 
        // 6. Click the "Randomize Children" menu item and wait for the async operation
        randomizeMenuItem.click();
        // Wait for the spied function to be called and its promise to resolve.
        await waitFor(() => {
            // Ensure the spy was called
            expect(rerandomizeSpy).toHaveBeenCalled();
        });
        // Now, await the promise that the spy call returned
        await rerandomizeSpy.mock.results[0].value;

        // 7. Assert that the DOM has been updated with the new nodes
        // The original nodes should be removed as they were unexpanded
        expect(nodesContainer.querySelector('[data-word-slug="休日"]')).toBeNull();
        expect(nodesContainer.querySelector('[data-word-slug="毎日"]')).toBeNull();
        expect(nodesContainer.querySelector('[data-word-slug="日曜日"]')).toBeNull();
        // The new 2 nodes from the rerandomize response should be present
        expect(nodesContainer.querySelector('[data-word-slug="日本"]')).not.toBeNull();
        expect(nodesContainer.querySelector('[data-word-slug="平日"]')).not.toBeNull();
        expect(nodesContainer.querySelectorAll('.expanded-node').length).toBe(2); // We expect 2 new nodes
        rerandomizeSpy.mockRestore();
    });

    test('should show context menu on tap-and-hold on a node', async () => {
        jest.useFakeTimers();
        const targetNode = nodesContainer.querySelector('[data-word-slug="休日"]');
        expect(targetNode).not.toBeNull(); // Add an assertion to ensure setup is correct

        targetNode.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [{ clientX: 100, clientY: 100 }] }));
        jest.advanceTimersByTime(500); // Advance time to trigger the long-press timeout

        // The menu should be visible now, before the touchend event
        expect(nodeContextMenu.style.display).toBe('block');

        targetNode.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
        jest.useRealTimers();
    });
});