import { KanjiSidebar } from '../../src/js/components/KanjiSidebar.js';

// Mock NodeCollapseExpandManager and its dependency NodeFilterManager
class MockNodeFilterManager {
    constructor() {
        this.applyChildFilterRecursively = jest.fn();
    }
}

class MockNodeCollapseExpandManager {
    constructor() {
        this.nodeFilterManager = new MockNodeFilterManager();
        this.showNode = jest.fn();
        this.expandNode = jest.fn();
        this.hideNode = jest.fn();
    }
}

describe('KanjiSidebar', () => {
    let sidebarElement;
    let searchInput;
    let kanjiListContainer;
    let focusKanjiCallback;
    let centerViewCallback;
    let nodeCollapseExpandManager;
    let kanjiSidebar;

    beforeEach(() => {
        // Mock DOM elements
        sidebarElement = document.createElement('div');
        searchInput = document.createElement('input');
        kanjiListContainer = document.createElement('div');
        document.body.appendChild(sidebarElement);
        sidebarElement.appendChild(searchInput);
        sidebarElement.appendChild(kanjiListContainer);

        // Mock callbacks
        focusKanjiCallback = jest.fn();
        centerViewCallback = jest.fn();

        // Mock manager
        nodeCollapseExpandManager = new MockNodeCollapseExpandManager();

        // Initialize KanjiSidebar
        kanjiSidebar = new KanjiSidebar(
            sidebarElement,
            searchInput,
            kanjiListContainer,
            focusKanjiCallback,
            centerViewCallback,
            nodeCollapseExpandManager
        );
    });

    afterEach(() => {
        // Clear document body after each test
        document.body.innerHTML = '';
    });

    test('constructor should initialize properties and setup event listeners', () => {
        expect(kanjiSidebar.sidebarElement).toBe(sidebarElement);
        expect(kanjiSidebar.searchInput).toBe(searchInput);
        expect(kanjiSidebar.kanjiListContainer).toBe(kanjiListContainer);
        expect(kanjiSidebar.focusKanjiCallback).toBe(focusKanjiCallback);
        expect(kanjiSidebar.centerViewCallback).toBe(centerViewCallback);
        expect(kanjiSidebar.nodeCollapseExpandManager).toBe(nodeCollapseExpandManager);
        expect(kanjiSidebar.parentKanjiMap).toBeInstanceOf(Map);
        expect(kanjiSidebar.parentKanjiMap.size).toBe(0);
        expect(kanjiSidebar.activeSidebarNode).toBeNull();

        // Check if context menu is created and appended to body
        expect(document.body.querySelector('#sidebarContextMenu')).not.toBeNull();
    });

    test('addKanji should add kanji to map and update list', () => {
        const mockNode = document.createElement('div');
        kanjiSidebar.addKanji('日', mockNode);
        expect(kanjiSidebar.parentKanjiMap.has('日')).toBe(true);
        expect(kanjiSidebar.parentKanjiMap.get('日')).toBe(mockNode);
        expect(kanjiListContainer.children.length).toBe(1);
        expect(kanjiListContainer.children[0].textContent).toBe('日');

        // Adding same kanji should not change map size
        kanjiSidebar.addKanji('日', mockNode);
        expect(kanjiSidebar.parentKanjiMap.size).toBe(1);
    });

    test('hasParentKanji should return true if kanji exists', () => {
        kanjiSidebar.addKanji('本', document.createElement('div'));
        expect(kanjiSidebar.hasParentKanji('本')).toBe(true);
        expect(kanjiSidebar.hasParentKanji('語')).toBe(false);
    });

    test('_updateList should render kanji items correctly', () => {
        const node1 = document.createElement('div');
        const node2 = document.createElement('div');
        kanjiSidebar.addKanji('猫', node1);
        kanjiSidebar.addKanji('犬', node2);

        expect(kanjiListContainer.children.length).toBe(2);
        expect(kanjiListContainer.children[0].textContent).toBe('犬'); // Sorted alphabetically
        expect(kanjiListContainer.children[1].textContent).toBe('猫');
    });

    test('_updateList should filter kanji items based on search input', () => {
        const node1 = document.createElement('div');
        const node2 = document.createElement('div');
        kanjiSidebar.addKanji('猫', node1);
        kanjiSidebar.addKanji('犬', node2);

        searchInput.value = '犬';
        searchInput.dispatchEvent(new Event('input'));

        expect(kanjiListContainer.children.length).toBe(1);
        expect(kanjiListContainer.children[0].textContent).toBe('犬');
    });

    test('_updateList should filter case-insensitively', () => {
        const node1 = document.createElement('div');
        const node2 = document.createElement('div');
        kanjiSidebar.addKanji('A', node1);
        kanjiSidebar.addKanji('b', node2);

        searchInput.value = 'a'; // lowercase search
        kanjiSidebar._updateList();

        expect(kanjiListContainer.children.length).toBe(1);
        expect(kanjiListContainer.children[0].textContent).toBe('A');
    });

    test('_updateList should dim items if node is hidden or filtered', () => {
        const node1 = document.createElement('div');
        node1.dataset.hidden = 'true';
        const node2 = document.createElement('div');
        node2.classList.add('node-hidden-by-filter');
        const node3 = document.createElement('div');

        kanjiSidebar.addKanji('隠', node1);
        kanjiSidebar.addKanji('濾', node2);
        kanjiSidebar.addKanji('普', node3);

        kanjiSidebar._updateList();

        const items = kanjiListContainer.children;
        expect(items[0].textContent).toBe('普'); // Sorted
        expect(items[0].classList.contains('dimmed')).toBe(false);
        expect(items[1].textContent).toBe('濾');
        expect(items[1].classList.contains('dimmed')).toBe(true);
        expect(items[2].textContent).toBe('隠');
        expect(items[2].classList.contains('dimmed')).toBe(true);
    });

    test('recalculateDimmingState should update dimming correctly', () => {
        const node1 = document.createElement('div');
        const node2 = document.createElement('div');
        kanjiSidebar.addKanji('A', node1);
        kanjiSidebar.addKanji('B', node2);

        kanjiSidebar._updateList();
        expect(kanjiListContainer.querySelector('[data-kanji="A"]').classList.contains('dimmed')).toBe(false);

        node1.dataset.hidden = 'true';
        kanjiSidebar.recalculateDimmingState();
        expect(kanjiListContainer.querySelector('[data-kanji="A"]').classList.contains('dimmed')).toBe(true);

        node1.dataset.hidden = 'false';
        kanjiSidebar.recalculateDimmingState();
        expect(kanjiListContainer.querySelector('[data-kanji="A"]').classList.contains('dimmed')).toBe(false);
    });

    test('clicking a list item should call focusKanjiCallback and centerViewCallback', () => {
        const mockNode = document.createElement('div');
        const mockSpan = document.createElement('span');
        mockSpan.textContent = '日';
        mockSpan.classList.add('active-source-kanji');
        mockNode.appendChild(mockSpan);

        kanjiSidebar.addKanji('日', mockNode);
        kanjiSidebar._updateList();

        const listItem = kanjiListContainer.querySelector('.parent-kanji-list-item');
        listItem.click();

        expect(focusKanjiCallback).toHaveBeenCalledWith(mockSpan);
        expect(centerViewCallback).toHaveBeenCalledWith(mockNode);
    });

    test('clicking a list item should find kanji span with expanded-parent-kanji class', () => {
        const mockNode = document.createElement('div');
        const mockSpan = document.createElement('span');
        mockSpan.textContent = '日';
        mockSpan.classList.add('expanded-parent-kanji'); // Test the other class
        mockNode.appendChild(mockSpan);

        kanjiSidebar.addKanji('日', mockNode);
        kanjiSidebar._updateList();

        const listItem = kanjiListContainer.querySelector('.parent-kanji-list-item');
        listItem.click();

        expect(focusKanjiCallback).toHaveBeenCalledWith(mockSpan);
        expect(centerViewCallback).toHaveBeenCalledWith(mockNode);
    });

    test('clicking a list item should still center view if no matching kanji span is found', () => {
        const mockNode = document.createElement('div'); // No child spans

        kanjiSidebar.addKanji('日', mockNode);
        kanjiSidebar._updateList();

        const listItem = kanjiListContainer.querySelector('.parent-kanji-list-item');
        listItem.click();

        expect(focusKanjiCallback).not.toHaveBeenCalled();
        expect(centerViewCallback).toHaveBeenCalledWith(mockNode); // Should still center on the parent node
    });

    test('clicking a dimmed list item should not call callbacks', () => {
        const mockNode = document.createElement('div');
        mockNode.dataset.hidden = 'true';
        kanjiSidebar.addKanji('日', mockNode);
        kanjiSidebar._updateList();

        const listItem = kanjiListContainer.querySelector('.parent-kanji-list-item');
        listItem.click();

        expect(focusKanjiCallback).not.toHaveBeenCalled();
        expect(centerViewCallback).not.toHaveBeenCalled();
    });

    test('context menu should appear on right click and hide on document click', () => {
        const mockNode = document.createElement('div');
        kanjiSidebar.addKanji('日', mockNode);
        kanjiSidebar._updateList();

        const listItem = kanjiListContainer.querySelector('.parent-kanji-list-item');
        const contextMenuEvent = new MouseEvent('contextmenu', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
            cancelable: true,
        });
        listItem.dispatchEvent(contextMenuEvent);

        const contextMenu = document.body.querySelector('#sidebarContextMenu');
        expect(contextMenu.style.display).toBe('block');
        expect(kanjiSidebar.activeSidebarNode).toBe(mockNode);

        // Simulate click outside context menu
        document.body.click();
        expect(contextMenu.style.display).toBe('none');
        expect(kanjiSidebar.activeSidebarNode).toBeNull();
    });

    test('clicking inside context menu should not hide it', () => {
        const mockNode = document.createElement('div');
        kanjiSidebar.addKanji('日', mockNode);
        kanjiSidebar._updateList();

        const listItem = kanjiListContainer.querySelector('.parent-kanji-list-item');
        const contextMenuEvent = new MouseEvent('contextmenu', {
            bubbles: true,
        });
        listItem.dispatchEvent(contextMenuEvent);

        const contextMenu = document.body.querySelector('#sidebarContextMenu');
        expect(contextMenu.style.display).toBe('block');

        // Simulate a click on the context menu itself
        contextMenu.click();

        expect(contextMenu.style.display).toBe('block'); // Should remain visible
    });

    test('context menu item click should trigger correct manager methods', () => {
        const mockNode = document.createElement('div');
        kanjiSidebar.addKanji('日', mockNode);
        kanjiSidebar._updateList();

        const listItem = kanjiListContainer.querySelector('.parent-kanji-list-item');
        const contextMenuEvent = new MouseEvent('contextmenu', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
            cancelable: true,
        });
        listItem.dispatchEvent(contextMenuEvent);

        const showNodeItem = kanjiSidebar.sidebarContextMenu.querySelector('[data-action="show-node"]');
        showNodeItem.click();

        expect(nodeCollapseExpandManager.showNode).toHaveBeenCalledWith(mockNode);
        expect(nodeCollapseExpandManager.expandNode).toHaveBeenCalledWith(mockNode);
        expect(nodeCollapseExpandManager.nodeFilterManager.applyChildFilterRecursively).toHaveBeenCalledWith(mockNode);
        expect(kanjiSidebar.sidebarContextMenu.style.display).toBe('none');

        // Reset mocks for hide-node test
        jest.clearAllMocks();
        listItem.dispatchEvent(contextMenuEvent);
        const hideNodeItem = kanjiSidebar.sidebarContextMenu.querySelector('[data-action="hide-node"]');
        hideNodeItem.click();
        expect(nodeCollapseExpandManager.hideNode).toHaveBeenCalledWith(mockNode);
        expect(kanjiSidebar.sidebarContextMenu.style.display).toBe('none');
    });

    test('context menu item click should do nothing if no active node', () => {
        kanjiSidebar.activeSidebarNode = null; // Ensure no active node
        const showNodeItem = kanjiSidebar.sidebarContextMenu.querySelector('[data-action="show-node"]');
        const event = { target: showNodeItem, stopPropagation: jest.fn() };
        kanjiSidebar._handleContextMenuItemClick(event);
        expect(nodeCollapseExpandManager.showNode).not.toHaveBeenCalled();
    });

    test('clicking a list item on mobile layout should hide the sidebar', () => {
        document.body.classList.add('mobile-layout');
        kanjiSidebar.sidebarElement.classList.add('visible'); // Ensure sidebar is visible

        const mockNode = document.createElement('div');
        const mockSpan = document.createElement('span');
        mockSpan.textContent = '日';
        mockSpan.classList.add('active-source-kanji');
        mockNode.appendChild(mockSpan);

        kanjiSidebar.addKanji('日', mockNode);
        kanjiSidebar._updateList();

        const listItem = kanjiListContainer.querySelector('.parent-kanji-list-item');
        listItem.click();

        expect(kanjiSidebar.sidebarElement.classList.contains('visible')).toBe(false);
        document.body.classList.remove('mobile-layout'); // Clean up
    });
});