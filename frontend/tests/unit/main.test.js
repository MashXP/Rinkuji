// Mock all external dependencies at the top level
jest.mock('../../src/js/utils/PanZoom.js');
jest.mock('../../src/js/components/RinkuGraph.js');
jest.mock('../../src/js/components/OptionsMenu.js');
jest.mock('../../src/js/components/NewSearchModal.js');
jest.mock('../../src/js/managers/UITogglingManager.js');

describe('main.js initialization', () => {
    let mockViewport;
    let mockCanvas;
    let mockWordContainer;
    let mockSvgLayer;
    let mockNodesContainer;
    let mockZoomInBtn;
    let mockZoomOutBtn;
    let mockResetViewBtn;
    let mockZoomMeter;
    let mockZoomControls;
    let mockParentKanjiSidebar;
    let mockParentKanjiSearchInput;
    let mockParentKanjiListContainer;
    let mockSidebarToggleBtn;
    let mockRinkuFooter;
    let mockHideUiBtn;
    let mockOptionsModal;
    let mockOptionsBtn;
    let mockModalCloseBtn;
    let mockNewSearchModal;
    let mockNewSearchBtn;
    let mockNewSearchModalCloseBtn;
    let mockNewSearchInput;
    let mockSuggestionsList;
    let mockJishoLoadingIndicator;

    beforeEach(() => {
        jest.resetModules(); // Reset module registry before each test
        jest.clearAllMocks(); // Clear all mocks, including their call counts and instances

        // Reset the DOM before each test
        document.body.innerHTML = `
            <div id="rinkuViewport"></div>
            <canvas id="rinkuCanvas"></canvas>
            <div id="rinkuWord"></div>
            <svg id="rinkuSvgLayer"></svg>
            <div id="rinkuNodesContainer"></div>
            <button id="zoomInBtn"></button>
            <button id="zoomOutBtn"></button>
            <button id="resetViewBtn"></button>
            <div id="zoomMeter"></div>
            <div class="zoom-controls"></div>
            <div id="parentKanjiSidebar"></div>
            <input id="parentKanjiSearch" type="text">
            <div id="parentKanjiList"></div>
            <button id="sidebarToggleBtn"></button>
            <footer class="footer-rinku"></footer>
            <button id="hideUiBtn"></button>
            <div id="optionsModal"></div>
            <button id="optionsBtn"></button>
            <button id="modalCloseBtn"></button>
            <div id="newSearchModal"></div>
            <button id="newSearchBtn"></button>
            <button id="newSearchModalCloseBtn"></button>
            <input id="newSearchInput" type="text">
            <div id="suggestionsList"></div>
            <div id="jishoLoadingIndicator"></div>
        `;

        // Assign mock elements
        mockViewport = document.getElementById('rinkuViewport');
        mockCanvas = document.getElementById('rinkuCanvas');
        mockWordContainer = document.getElementById('rinkuWord');
        mockSvgLayer = document.getElementById('rinkuSvgLayer');
        mockNodesContainer = document.getElementById('rinkuNodesContainer');
        mockZoomInBtn = document.getElementById('zoomInBtn');
        mockZoomOutBtn = document.getElementById('zoomOutBtn');
        mockResetViewBtn = document.getElementById('resetViewBtn');
        mockZoomMeter = document.getElementById('zoomMeter');
        mockZoomControls = document.querySelector('.zoom-controls');
        mockParentKanjiSidebar = document.getElementById('parentKanjiSidebar');
        mockParentKanjiSearchInput = document.getElementById('parentKanjiSearch');
        mockParentKanjiListContainer = document.getElementById('parentKanjiList');
        mockSidebarToggleBtn = document.getElementById('sidebarToggleBtn');
        mockRinkuFooter = document.querySelector('.footer-rinku');
        mockHideUiBtn = document.getElementById('hideUiBtn');
        mockOptionsModal = document.getElementById('optionsModal');
        mockOptionsBtn = document.getElementById('optionsBtn');
        mockModalCloseBtn = document.getElementById('modalCloseBtn');
        mockNewSearchModal = document.getElementById('newSearchModal');
        mockNewSearchBtn = document.getElementById('newSearchBtn');
        mockNewSearchModalCloseBtn = document.getElementById('newSearchModalCloseBtn');
        mockNewSearchInput = document.getElementById('newSearchInput');
        mockSuggestionsList = document.getElementById('suggestionsList');
        mockJishoLoadingIndicator = document.getElementById('jishoLoadingIndicator');
    });

    // Helper to trigger DOMContentLoaded
    const triggerDOMContentLoaded = () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
    };

    test('should initialize PanZoom with correct elements', () => {
        require('../../src/js/main.js'); // Load main.js to attach the listener
        triggerDOMContentLoaded();

        // Require the mock *after* main.js has been loaded to get the correct instance
        const { PanZoom } = require('../../src/js/utils/PanZoom.js');

        expect(PanZoom).toHaveBeenCalledTimes(1);
        expect(PanZoom).toHaveBeenCalledWith(
            mockViewport,
            mockCanvas,
            mockZoomInBtn,
            mockZoomOutBtn,
            mockResetViewBtn,
            mockZoomMeter
        );
    });

    test('should initialize RinkuGraph with correct elements and PanZoom instance', () => {
        require('../../src/js/main.js');
        triggerDOMContentLoaded();

        // Require mocks after main.js is loaded
        const { PanZoom } = require('../../src/js/utils/PanZoom.js');
        const { RinkuGraph } = require('../../src/js/components/RinkuGraph.js');

        const mockPanZoomInstance = PanZoom.mock.instances[0];
        expect(RinkuGraph).toHaveBeenCalledTimes(1);
        expect(RinkuGraph).toHaveBeenCalledWith(
            mockViewport,
            mockCanvas,
            mockWordContainer,
            mockSvgLayer,
            mockNodesContainer,
            mockParentKanjiSidebar,
            mockParentKanjiSearchInput,
            mockParentKanjiListContainer,
            mockPanZoomInstance
        );
    });

    test('should setup hideUiBtn toggle with UITogglingManager', () => {
        require('../../src/js/main.js');
        triggerDOMContentLoaded();

        const { UITogglingManager } = require('../../src/js/managers/UITogglingManager.js');

        expect(UITogglingManager.setupToggle).toHaveBeenCalledWith({
            button: mockHideUiBtn,
            target: mockRinkuFooter,
            toggleClass: 'is-manually-hidden',
            buttonToggleClass: 'active',
            onState: { // State when UI is hidden
                html: '<i class="fas fa-caret-left"></i>',
                title: 'Show Controls'
            },
            offState: {
                html: '<i class="fas fa-caret-right"></i>',
                title: 'Hide Controls'
            }
        });
    });

    test('should setup sidebarToggleBtn toggle with UITogglingManager', () => {
        require('../../src/js/main.js');
        triggerDOMContentLoaded();

        const { UITogglingManager } = require('../../src/js/managers/UITogglingManager.js');

        expect(UITogglingManager.setupToggle).toHaveBeenCalledWith({
            button: mockSidebarToggleBtn,
            target: mockParentKanjiSidebar,
            toggleClass: 'visible',
            buttonToggleClass: 'active',
            onState: {
                html: '<i class="fas fa-times"></i>',
                title: 'Close Kanji List'
            },
            offState: {
                html: '<i class="fas fa-bars"></i>',
                title: 'Toggle Kanji List'
            }
        });
    });

    test('should initialize OptionsMenu with correct elements', () => {
        require('../../src/js/main.js');
        triggerDOMContentLoaded();

        const { OptionsMenu } = require('../../src/js/components/OptionsMenu.js');

        expect(OptionsMenu).toHaveBeenCalledTimes(1);
        expect(OptionsMenu).toHaveBeenCalledWith(
            mockOptionsModal,
            mockOptionsBtn,
            mockModalCloseBtn
        );
    });

    test('should initialize NewSearchModal with correct elements', () => {
        require('../../src/js/main.js');
        triggerDOMContentLoaded();

        const { NewSearchModal } = require('../../src/js/components/NewSearchModal.js');

        expect(NewSearchModal).toHaveBeenCalledTimes(1);
        expect(NewSearchModal).toHaveBeenCalledWith(
            mockNewSearchModal,
            mockNewSearchBtn,
            mockNewSearchModalCloseBtn,
            mockNewSearchInput,
            mockSuggestionsList,
            mockJishoLoadingIndicator
        );
    });

    test('should show NewSearchModal if no word parameter in URL', () => {
        // Mock URLSearchParams to return no 'word' parameter
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
            },
            writable: true,
        });

        // Create a mock function that we can hold a reference to.
        const mockShowFn = jest.fn();
        const { NewSearchModal } = require('../../src/js/components/NewSearchModal.js');
        NewSearchModal.mockImplementation(() => ({
            show: mockShowFn,
        }));

        require('../../src/js/main.js');
        triggerDOMContentLoaded();

        // Assert that the mock function we created was called.
        expect(mockShowFn).toHaveBeenCalledTimes(1);
    });

    test('should not show NewSearchModal if word parameter exists in URL', () => {
        // Mock URLSearchParams to return a 'word' parameter
        Object.defineProperty(window, 'location', {
            value: {
                search: '?word=test',
            },
            writable: true,
        });

        const mockShowFn = jest.fn();
        const { NewSearchModal } = require('../../src/js/components/NewSearchModal.js');
        NewSearchModal.mockImplementation(() => ({
            show: mockShowFn,
        }));

        require('../../src/js/main.js');
        triggerDOMContentLoaded();

        expect(mockShowFn).not.toHaveBeenCalled();
    });

    test('should not initialize components if their respective DOM elements are missing', () => {
        // Clear the DOM to simulate missing elements
        document.body.innerHTML = '';

        require('../../src/js/main.js');
        triggerDOMContentLoaded();

        const { PanZoom } = require('../../src/js/utils/PanZoom.js');
        const { RinkuGraph } = require('../../src/js/components/RinkuGraph.js');
        const { UITogglingManager } = require('../../src/js/managers/UITogglingManager.js');
        const { OptionsMenu } = require('../../src/js/components/OptionsMenu.js');
        const { NewSearchModal } = require('../../src/js/components/NewSearchModal.js');

        expect(PanZoom).not.toHaveBeenCalled();
        expect(RinkuGraph).not.toHaveBeenCalled();
        expect(UITogglingManager.setupToggle).not.toHaveBeenCalled();
        expect(OptionsMenu).not.toHaveBeenCalled();
        expect(NewSearchModal).not.toHaveBeenCalled();
    });
});