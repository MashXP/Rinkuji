import { RinkuGraph } from '../../src/js/components/RinkuGraph.js';
import { PanZoom } from '../../src/js/utils/PanZoom.js';

// Mock fetch, which is what RinkuGraph actually uses for expansion
global.fetch = jest.fn();

describe('Integration: Word Input and Graph Generation Flow', () => {
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
        // Clear and reset mocks
        jest.clearAllMocks();
        document.body.innerHTML = `
            <div id="viewport"></div>
            <canvas id="canvas"></canvas>
            <div id="wordContainer" data-word="日本語" data-word-slug="日本語"></div>
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

        // Mock getBoundingClientRect for canvas
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
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should initialize graph with root word and its kanji', () => {
        // The GraphInitializer is called in the RinkuGraph constructor.
        // We just need to check the result of its synchronous work.
        expect(wordContainer.children.length).toBe(3); // 3 kanji spans
        const kanjiSpans = wordContainer.querySelectorAll('.kanji-char');
        expect(kanjiSpans.length).toBe(3);
        expect(kanjiSpans[0].textContent).toBe('日');
        expect(kanjiSpans[1].textContent).toBe('本');
        expect(kanjiSpans[2].textContent).toBe('語');
    });

    test('should expand a kanji node and draw related words', async () => {
        // Find the kanji span to click, which was created by the initializer.
        const clickedKanjiSpan = Array.from(wordContainer.querySelectorAll('.kanji-char')).find(s => s.textContent === '日');
        expect(clickedKanjiSpan).not.toBeNull();

        // Mock the fetch call for expansion
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

        // Trigger the click event
        await rinkuGraph.handleKanjiClick({ currentTarget: clickedKanjiSpan });

        // Assertions
        expect(global.fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5');
        expect(clickedKanjiSpan.classList.contains('active-source-kanji')).toBe(true);

        // Expect new nodes and lines to be created
        expect(nodesContainer.children.length).toBe(2); // Two new word nodes
        expect(nodesContainer.querySelector('[data-word-slug="休日"]')).not.toBeNull();
        expect(nodesContainer.querySelector('[data-word-slug="毎日"]')).not.toBeNull();
        expect(svgLayer.querySelectorAll('line').length).toBe(2); // Two new lines
    });

    test('should handle no related words found for a kanji click', async () => {
        const clickedKanjiSpan = Array.from(wordContainer.querySelectorAll('.kanji-char')).find(s => s.textContent === '日');
        expect(clickedKanjiSpan).not.toBeNull();

        // Mock fetch to return no words
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
        });

        await rinkuGraph.handleKanjiClick({ currentTarget: clickedKanjiSpan });

        expect(global.fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5');
        expect(clickedKanjiSpan.classList.contains('expanded-parent-kanji')).toBe(true);
        expect(nodesContainer.children.length).toBe(0);
        expect(svgLayer.children.length).toBe(0);
    });

    test('should handle API errors during kanji expansion', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const clickedKanjiSpan = Array.from(wordContainer.querySelectorAll('.kanji-char')).find(s => s.textContent === '日');

        global.fetch.mockResolvedValue({ ok: false, status: 500 });

        await rinkuGraph.handleKanjiClick({ currentTarget: clickedKanjiSpan });

        expect(global.fetch).toHaveBeenCalledWith('/search_by_kanji?kanji=%E6%97%A5');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to expand kanji:', expect.any(Error));
        expect(nodesContainer.children.length).toBe(0);

        consoleErrorSpy.mockRestore();
    });
});