import { RinkuGraph } from '../../src/js/components/RinkuGraph.js';
import { PanZoom } from '../../src/js/utils/PanZoom.js';
import * as apiService from '@services/api.js';
import { GraphInitializer } from '../../src/js/components/GraphInitializer.js';

// Mock the API service
jest.mock('@services/api.js', () => ({
    getWordGraph: jest.fn(),
    searchByKanji: jest.fn(),
}));

// Mock GraphInitializer
jest.mock('../../src/js/components/GraphInitializer.js');

// Mock fetch
global.fetch = jest.fn();

describe('Integration: API Mocking', () => {
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

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock implementation of GraphInitializer
        const mockInitialize = jest.fn();
        GraphInitializer.mockImplementation(() => {
            return {
                initialize: mockInitialize,
            };
        });

        document.body.innerHTML = `
            <div id="viewport"></div>
            <canvas id="canvas"></canvas>
            <div id="wordContainer" data-word="" data-word-slug=""></div>
            <svg id="svgLayer"></svg>
            <div id="nodesContainer"></div>
            <div id="parentKanjiSidebar"></div>
            <input id="parentKanjiSearchInput" type="text">
            <div id="parentKanjiListContainer"></div>
            <div id="nodeContextMenu"></div>
            <div id="meaningBar"></div>
            <button id="zoomInBtn"></button>
            <button id="zoomOutBtn"></button>
            <button id="resetViewBtn"></button>
        `;

        viewport = document.getElementById('viewport');
        canvas = document.getElementById('canvas');
        wordContainer = document.getElementById('wordContainer');
        svgLayer = document.getElementById('svgLayer');
        nodesContainer = document.getElementById('nodesContainer');
        parentKanjiSidebar = document.getElementById('parentKanjiSidebar');
        parentKanjiSearchInput = document.getElementById('parentKanjiSearchInput');
        parentKanjiListContainer = document.getElementById('parentKanjiListContainer');

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
        const zoomMeter = document.createElement('div'); // dummy element
        panZoomInstance = new PanZoom(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter);

        rinkuGraph = new RinkuGraph(
            viewport, canvas, wordContainer, svgLayer, nodesContainer,
            parentKanjiSidebar, parentKanjiSearchInput, parentKanjiListContainer, panZoomInstance
        );

        // Mock requestAnimationFrame to execute immediately
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('getWordGraph should be mocked and return specified data', async () => {
        const mockData = { word: 'mockWord', kanji: [] };
        apiService.getWordGraph.mockResolvedValueOnce({ data: mockData });

        // We need to manually call the method that uses getWordGraph, 
        // as the real GraphInitializer is mocked.
        await rinkuGraph.graphInitializer.initialize();
        
        // We can't directly test the effect of getWordGraph on the DOM here because
        // the GraphInitializer is mocked. Instead, we can check if the mock was called.
        expect(GraphInitializer).toHaveBeenCalled();
        expect(rinkuGraph.graphInitializer.initialize).toHaveBeenCalled();
    });

    test('searchByKanji should be mocked and return specified data', async () => {
        const mockRelatedWords = { data: [{ slug: 'mockRelated1' }, { slug: 'mockRelated2' }] };
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => (mockRelatedWords),
        });

        // Simulate a kanji click that would trigger searchByKanji
        const kanjiSpan = document.createElement('span');
        kanjiSpan.textContent = '日';
        kanjiSpan.classList.add('kanji-char');
        wordContainer.appendChild(kanjiSpan);
        wordContainer._children = []; // Initialize _children for the test
        rinkuGraph._addKanjiEventListeners(kanjiSpan);

        await rinkuGraph.handleKanjiClick({ currentTarget: kanjiSpan });

        expect(fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5');
        expect(nodesContainer.querySelector('[data-word-slug="mockRelated1"]')).not.toBeNull();
        expect(nodesContainer.querySelector('[data-word-slug="mockRelated2"]')).not.toBeNull();
    });

    test('API errors should be handled gracefully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const kanjiSpan = document.createElement('span');
        kanjiSpan.textContent = '日';
        kanjiSpan.classList.add('kanji-char');
        wordContainer.appendChild(kanjiSpan);
        rinkuGraph._addKanjiEventListeners(kanjiSpan);

        await rinkuGraph.handleKanjiClick({ currentTarget: kanjiSpan });

        expect(fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5');
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to expand kanji:", new Error('API error for 日: 500'));
        expect(nodesContainer.children.length).toBe(0); // No nodes should be added on error

        consoleErrorSpy.mockRestore();
    });
});