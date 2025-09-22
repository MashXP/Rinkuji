import { NodeDuplicator } from '../../src/js/utils/NodeDuplicator';

describe('NodeDuplicator', () => {
    let nodeDuplicator;
    let mockWordContainer;
    let mockKanjiRegex;
    let mockKanjiSidebar;
    let mockNodeCreator;
    let mockLineCreator;
    let mockPanZoom;
    let mockAddKanjiEventListeners;
    let mockFocusKanjiCallback;
    let mockHandleKanjiClickCallback;

    beforeEach(() => {
        mockWordContainer = {
            dataset: { word: 'originalWord' },
            querySelector: jest.fn(() => null),
            querySelectorAll: jest.fn(() => []),
        };
        mockKanjiRegex = /./;
        mockKanjiSidebar = {};
        mockNodeCreator = {
            createWordNode: jest.fn(() => ({ style: {}, querySelectorAll: jest.fn(() => []) })),
            positionAndAppendNode: jest.fn(),
            fadeInElements: jest.fn(),
        };
        mockLineCreator = {
            createExpansionLine: jest.fn(() => ({ classList: { remove: jest.fn(), add: jest.fn() } })),
        };
        mockPanZoom = {
            canvas: { getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0 })) },
            getScale: jest.fn(() => 1),
        };
        mockAddKanjiEventListeners = jest.fn();
        mockFocusKanjiCallback = jest.fn();
        mockHandleKanjiClickCallback = jest.fn();

        nodeDuplicator = new NodeDuplicator(
            mockWordContainer,
            mockKanjiRegex,
            mockKanjiSidebar,
            mockNodeCreator,
            mockLineCreator,
            mockPanZoom,
            mockAddKanjiEventListeners,
            mockFocusKanjiCallback,
            mockHandleKanjiClickCallback
        );
    });

    test('constructor should initialize properties', () => {
        expect(nodeDuplicator.wordContainer).toBe(mockWordContainer);
        expect(nodeDuplicator.kanjiRegex).toBe(mockKanjiRegex);
        expect(nodeDuplicator.kanjiSidebar).toBe(mockKanjiSidebar);
        expect(nodeDuplicator.nodeCreator).toBe(mockNodeCreator);
        expect(nodeDuplicator.lineCreator).toBe(mockLineCreator);
        expect(nodeDuplicator.panZoom).toBe(mockPanZoom);
        expect(nodeDuplicator.addKanjiEventListeners).toBe(mockAddKanjiEventListeners);
        expect(nodeDuplicator.focusKanjiCallback).toBe(mockFocusKanjiCallback);
        expect(nodeDuplicator.handleKanjiClickCallback).toBe(mockHandleKanjiClickCallback);
    });

    describe('duplicateAndExpandNode', () => {
        let originalNode;
        let clickedKanjiElement;

        beforeEach(() => {
            originalNode = {
                dataset: { wordSlug: 'originalWordSlug' },
                querySelector: jest.fn(() => null),
                querySelectorAll: jest.fn(() => []),
            };
            clickedKanjiElement = {
                textContent: '日',
                dataset: { hasMoreWords: 'true' },
                classList: { contains: jest.fn(() => true) },
            };

            // Mock _getUnscaledElementCenter to return predictable values
            nodeDuplicator._getUnscaledElementCenter = jest.fn(() => ({ ux: 100, uy: 100 }));
        });

        test('should duplicate node and expand kanji', async () => {
            const mockCreatedNode = { style: {}, querySelectorAll: jest.fn(() => [clickedKanjiElement]) };
            mockNodeCreator.createWordNode.mockReturnValue(mockCreatedNode);

            await nodeDuplicator.duplicateAndExpandNode(originalNode, clickedKanjiElement);

            expect(nodeDuplicator._getUnscaledElementCenter).toHaveBeenCalledWith(originalNode);
            expect(mockNodeCreator.createWordNode).toHaveBeenCalledWith('originalWordSlug', '日', null);
            expect(mockNodeCreator.positionAndAppendNode).toHaveBeenCalledWith(mockCreatedNode, originalNode, { ux: 100, uy: 300 });
            expect(mockCreatedNode.style.opacity).toBe(0);
            expect(mockLineCreator.createExpansionLine).toHaveBeenCalled();
            expect(mockNodeCreator.fadeInElements).toHaveBeenCalledWith(mockCreatedNode, expect.any(Object));
            expect(mockHandleKanjiClickCallback).toHaveBeenCalledWith({ currentTarget: clickedKanjiElement }, true);
        });

        test('should handle originalNode without wordSlug', async () => {
            originalNode.dataset.wordSlug = undefined;
            mockWordContainer.dataset.word = 'fallbackWord';
            const mockCreatedNode = { style: {}, querySelectorAll: jest.fn(() => [clickedKanjiElement]) };
            mockNodeCreator.createWordNode.mockReturnValue(mockCreatedNode);

            await nodeDuplicator.duplicateAndExpandNode(originalNode, clickedKanjiElement);

            expect(mockNodeCreator.createWordNode).toHaveBeenCalledWith('fallbackWord', '日', null);
        });

        test('should not call handleKanjiClickCallback if targetKanjiSpanInNewNode is null', async () => {
            const mockCreatedNode = { style: {}, querySelectorAll: jest.fn(() => []) }; // No matching kanji
            mockNodeCreator.createWordNode.mockReturnValue(mockCreatedNode);

            await nodeDuplicator.duplicateAndExpandNode(originalNode, clickedKanjiElement);

            expect(mockHandleKanjiClickCallback).not.toHaveBeenCalled();
        });

        test('should handle originalActiveSourceKanji correctly', async () => {
            const originalActiveSourceKanji = { textContent: '旧', classList: { remove: jest.fn(), add: jest.fn() } };
            originalNode.querySelector.mockReturnValue(originalActiveSourceKanji);
            originalNode.querySelectorAll.mockReturnValue([originalActiveSourceKanji, { textContent: '他', classList: { remove: jest.fn(), add: jest.fn() } }]);

            const mockCreatedNode = { style: {}, querySelectorAll: jest.fn(() => [clickedKanjiElement]) };
            mockNodeCreator.createWordNode.mockReturnValue(mockCreatedNode);

            await nodeDuplicator.duplicateAndExpandNode(originalNode, clickedKanjiElement);

            expect(originalActiveSourceKanji.classList.remove).not.toHaveBeenCalledWith('kanji-char', 'active-source-kanji', 'expanded-parent-kanji');
            expect(originalActiveSourceKanji.classList.add).not.toHaveBeenCalledWith('inactive-kanji');
            expect(originalNode.querySelectorAll()[1].classList.remove).toHaveBeenCalledWith('kanji-char', 'active-source-kanji', 'expanded-parent-kanji');
            expect(originalNode.querySelectorAll()[1].classList.add).toHaveBeenCalledWith('inactive-kanji');
        });

        test('should correctly identify targetKanjiSpanInNewNode with active-source-kanji', async () => {
            const mockKanjiSpan = {
                textContent: '日',
                classList: { contains: (cls) => cls === 'active-source-kanji' }, // Simplified mock
            };
            const mockCreatedNode = {
                style: {}, 
                querySelectorAll: jest.fn(() => [mockKanjiSpan]),
            };
            mockNodeCreator.createWordNode.mockReturnValue(mockCreatedNode);

            await nodeDuplicator.duplicateAndExpandNode(originalNode, clickedKanjiElement);

            // Assert that the logic within the if block is executed
            expect(mockHandleKanjiClickCallback).toHaveBeenCalledWith({ currentTarget: mockKanjiSpan }, true);
        });

        test('should correctly identify targetKanjiSpanInNewNode with kanji-char', async () => {
            const mockKanjiSpan = {
                textContent: '日',
                classList: { contains: (cls) => cls === 'kanji-char' },
            };
            const mockCreatedNode = {
                style: {},
                querySelectorAll: jest.fn(() => [mockKanjiSpan]),
            };
            mockNodeCreator.createWordNode.mockReturnValue(mockCreatedNode);

            await nodeDuplicator.duplicateAndExpandNode(originalNode, clickedKanjiElement);

            // Assert that the logic within the if block is executed
            expect(mockHandleKanjiClickCallback).toHaveBeenCalledWith({ currentTarget: mockKanjiSpan }, true);
        });

        test('should initialize _linkingLinesFromThisNode if undefined', async () => {
            originalNode._linkingLinesFromThisNode = undefined; // Ensure it's undefined
            const mockCreatedNode = { style: {}, querySelectorAll: jest.fn(() => []) };
            mockNodeCreator.createWordNode.mockReturnValue(mockCreatedNode);

            await nodeDuplicator.duplicateAndExpandNode(originalNode, clickedKanjiElement);

            expect(originalNode._linkingLinesFromThisNode).toEqual([expect.any(Object)]); // Should be initialized and contain the linking line
        });

        test('should add to existing _linkingLinesFromThisNode array', async () => {
            const existingLine = { id: 'line1' };
            originalNode._linkingLinesFromThisNode = [existingLine];
            const mockCreatedNode = { style: {}, querySelectorAll: jest.fn(() => []) };
            mockNodeCreator.createWordNode.mockReturnValue(mockCreatedNode);

            await nodeDuplicator.duplicateAndExpandNode(originalNode, clickedKanjiElement);

            expect(originalNode._linkingLinesFromThisNode.length).toBe(2);
            expect(originalNode._linkingLinesFromThisNode[0]).toBe(existingLine);
            expect(originalNode._linkingLinesFromThisNode[1]).not.toBe(existingLine);
        });
    });

    describe('_getUnscaledElementCenter', () => {
        test('should return correct unscaled coordinates', () => {
            const mockElement = { getBoundingClientRect: jest.fn(() => ({ left: 10, top: 10, width: 20, height: 20 })) };
            mockPanZoom.canvas.getBoundingClientRect.mockReturnValue({ left: 0, top: 0 });
            mockPanZoom.getScale.mockReturnValue(2);

            const center = nodeDuplicator._getUnscaledElementCenter(mockElement);

            expect(center.ux).toBe(10);
            expect(center.uy).toBe(10);
        });
    });
});