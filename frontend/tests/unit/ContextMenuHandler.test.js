import { ContextMenuHandler } from '../../src/js/managers/ContextMenuHandler.js';

// JSDOM doesn't have TouchEvent, so we create a simple mock
class MockTouch {
    constructor(properties) {
        Object.assign(this, properties);
    }
}
global.TouchEvent = class MockTouchEvent extends Event {
    constructor(type, options = {}) {
        super(type, options);
        this.touches = (options.touches || []).map(t => new MockTouch(t));
    }
};

describe('ContextMenuHandler', () => {
  let handler;
  let contextMenuElement;
  let collapseCallback, expandCallback, filterCallback, rerandomizeCallback, optimizeCallback;
  let kanjiRegex;

  beforeEach(() => {
    document.body.innerHTML = `
        <div id="context-menu" style="display: none;">
            <div data-action="collapse"></div>
            <div data-action="expand"></div>
            <div data-action="filter-all"></div>
            <div data-action="filter-kanji"></div>
            <div data-action="filter-start-kanji"></div>
            <div data-action="randomize"></div>
            <div data-action="optimize"></div>
        </div>
    `;
    contextMenuElement = document.getElementById('context-menu');
    collapseCallback = jest.fn();
    expandCallback = jest.fn();
    filterCallback = jest.fn();
    rerandomizeCallback = jest.fn();
    optimizeCallback = jest.fn();
    kanjiRegex = /[\u4e00-\u9faf]/;

    handler = new ContextMenuHandler(
      contextMenuElement,
      kanjiRegex,
      collapseCallback,
      expandCallback,
      filterCallback,
      rerandomizeCallback,
      optimizeCallback
    );
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('handleContextMenu', () => {
    let targetNode;

    beforeEach(() => {
        targetNode = document.createElement('div');
        targetNode.classList.add('expanded-node');
        document.body.appendChild(targetNode);
        // The handler's contextmenu event is normally attached by RinkuGraph. We simulate it here.
        document.body.addEventListener('contextmenu', (e) => handler.handleContextMenu(e));
    });

    test('should show context menu on right-click', () => {
        const event = new MouseEvent('contextmenu', { clientX: 50, clientY: 60, bubbles: true });
        targetNode.dispatchEvent(event);

        expect(contextMenuElement.style.display).toBe('block');
        expect(contextMenuElement.style.left).toBe('50px');
        expect(contextMenuElement.style.top).toBe('60px');
        expect(handler.activeContextMenuNode).toBe(targetNode);
    });

    test('should show expand and hide collapse button for collapsed node', () => {
        targetNode.dataset.collapsed = 'true';
        const event = new MouseEvent('contextmenu', { bubbles: true });
        targetNode.dispatchEvent(event);

        expect(contextMenuElement.querySelector('[data-action="collapse"]').style.display).toBe('none');
        expect(contextMenuElement.querySelector('[data-action="expand"]').style.display).toBe('block');
    });

    test('should show "Start from Clicked Kanji" for kanji span', () => {
        const kanjiSpan = document.createElement('span');
        kanjiSpan.textContent = '日';
        targetNode.appendChild(kanjiSpan);

        const event = new MouseEvent('contextmenu', { bubbles: true });
        kanjiSpan.dispatchEvent(event);

        expect(handler.activeContextMenuKanji).toBe(kanjiSpan);
        expect(contextMenuElement.querySelector('[data-action="filter-start-kanji"]').style.display).toBe('block');
    });

    test('should show randomize button if right-clicked kanji is eligible', () => {
        const kanjiSpan = document.createElement('span');
        kanjiSpan.textContent = '日';
        kanjiSpan.dataset.hasMoreWords = 'true';
        targetNode.appendChild(kanjiSpan);

        const event = new MouseEvent('contextmenu', { bubbles: true });
        kanjiSpan.dispatchEvent(event);

        const randomizeBtn = contextMenuElement.querySelector('[data-action="randomize"]');
        expect(randomizeBtn.style.display).toBe('block');
        expect(randomizeBtn._targetKanji).toBe(kanjiSpan);
    });

    test('should show randomize button if node has one eligible kanji', () => {
        const kanjiSpan = document.createElement('span');
        kanjiSpan.classList.add('active-source-kanji');
        kanjiSpan.dataset.hasMoreWords = 'true';
        targetNode.appendChild(kanjiSpan);

        const event = new MouseEvent('contextmenu', { bubbles: true });
        targetNode.dispatchEvent(event); // Right-click node background

        const randomizeBtn = contextMenuElement.querySelector('[data-action="randomize"]');
        expect(randomizeBtn.style.display).toBe('block');
        expect(randomizeBtn._targetKanji).toBe(kanjiSpan);
    });

    test('should hide optimize button if right-click is not on a node', () => {
        // Simulate right-clicking on the document body, not on a node
        const mockEvent = { // Use a mock event to directly control e.target
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
            target: document.body,
            clientX: 10,
            clientY: 20,
        };

        handler.handleContextMenu(mockEvent);

        // The context menu itself should NOT be displayed
        expect(contextMenuElement.style.display).toBe('none');

        // activeContextMenuNode should be null
        expect(handler.activeContextMenuNode).toBeNull();

        // The optimize button should be hidden (this line is covered by the else branch)
        const optimizeBtn = contextMenuElement.querySelector('[data-action="optimize"]');
        expect(optimizeBtn.style.display).toBe('none');
    });
  });

  describe('handleContextMenuItemClick', () => {
    let targetNode;
    let kanjiSpan;

    beforeEach(() => {
        targetNode = document.createElement('div');
        kanjiSpan = document.createElement('span');
        kanjiSpan.textContent = '日';
        targetNode.appendChild(kanjiSpan);
        handler.activeContextMenuNode = targetNode;
        handler.activeContextMenuKanji = kanjiSpan;
    });

    test('should call collapse callback', () => {
        const event = { target: { dataset: { action: 'collapse' } }, stopPropagation: jest.fn() };
        handler.handleContextMenuItemClick(event);
        expect(collapseCallback).toHaveBeenCalledWith(targetNode);
        expect(handler.nodeContextMenu.style.display).toBe('none');
    });

    test('should call expand callback', () => {
        const event = { target: { dataset: { action: 'expand' } }, stopPropagation: jest.fn() };
        handler.handleContextMenuItemClick(event);
        expect(expandCallback).toHaveBeenCalledWith(targetNode);
    });

    test('should call filter-all callback', () => {
        const event = { target: { dataset: { action: 'filter-all' } }, stopPropagation: jest.fn() };
        handler.handleContextMenuItemClick(event);
        expect(filterCallback).toHaveBeenCalledWith(targetNode, 'all');
    });

    test('should call filter-kanji callback', () => {
        const event = { target: { dataset: { action: 'filter-kanji' } }, stopPropagation: jest.fn() };
        handler.handleContextMenuItemClick(event);
        expect(filterCallback).toHaveBeenCalledWith(targetNode, 'kanji');
    });

    test('should call filter-start-kanji callback', () => {
        const event = { target: { dataset: { action: 'filter-start-kanji' } }, stopPropagation: jest.fn() };
        handler.handleContextMenuItemClick(event);
        expect(filterCallback).toHaveBeenCalledWith(targetNode, 'start-kanji', '日');
    });

    test('should call rerandomize callback', () => {
        const randomizeBtn = contextMenuElement.querySelector('[data-action="randomize"]');
        randomizeBtn._targetKanji = kanjiSpan;
        const event = { target: randomizeBtn, stopPropagation: jest.fn() };
        handler.handleContextMenuItemClick(event);
        expect(rerandomizeCallback).toHaveBeenCalledWith(kanjiSpan);
    });

    test('should do nothing if action is missing', () => {
        const event = { target: { dataset: {} }, stopPropagation: jest.fn() };
        // Spy on hideContextMenu to ensure it's not called because the function should return early.
        const hideSpy = jest.spyOn(handler, 'hideContextMenu');
        handler.handleContextMenuItemClick(event);
        expect(collapseCallback).not.toHaveBeenCalled();
        expect(hideSpy).not.toHaveBeenCalled();
    });

    test('should do nothing if active node is missing', () => {
        handler.activeContextMenuNode = null;
        const event = { target: { dataset: { action: 'collapse' } }, stopPropagation: jest.fn() };
        handler.handleContextMenuItemClick(event);
        expect(collapseCallback).not.toHaveBeenCalled();
    });

    test('should do nothing for filter-start-kanji if active kanji is missing', () => {
        handler.activeContextMenuKanji = null;
        const event = { target: { dataset: { action: 'filter-start-kanji' } }, stopPropagation: jest.fn() };
        handler.handleContextMenuItemClick(event);
        expect(filterCallback).not.toHaveBeenCalled();
        // hideContextMenu is still called at the end
        expect(handler.nodeContextMenu.style.display).toBe('none');
    });
  });

  describe('Touch Events (Long Press)', () => {
    let targetNode;

    beforeEach(() => {
        targetNode = document.createElement('div');
        targetNode.classList.add('expanded-node');
        document.body.appendChild(targetNode);
        jest.spyOn(handler, 'handleContextMenu'); // Spy on handleContextMenu
        // Spy on the global clearTimeout function, which is mocked by jest.useFakeTimers()
        jest.spyOn(global, 'clearTimeout');
    });

    test('should trigger context menu on long press', () => {
        const touchEvent = new TouchEvent('touchstart', { bubbles: true, touches: [{ clientX: 10, clientY: 20 }] });
        // Dispatch on the target node so e.target is a valid element with .closest()
        targetNode.dispatchEvent(touchEvent);

        expect(handler.longPressTimer).not.toBeNull();
        jest.advanceTimersByTime(500); // Trigger timeout

        expect(handler.handleContextMenu).toHaveBeenCalledWith(touchEvent);
    });

    test('should not trigger context menu on short press', () => {
        const touchStartEvent = new TouchEvent('touchstart', { bubbles: true, touches: [{ clientX: 10, clientY: 20 }] });
        targetNode.dispatchEvent(touchStartEvent);

        jest.advanceTimersByTime(300); // Not long enough

        const touchEndEvent = new TouchEvent('touchend', { bubbles: true });
        document.dispatchEvent(touchEndEvent);

        expect(clearTimeout).toHaveBeenCalledWith(handler.longPressTimer);
        expect(handler.handleContextMenu).not.toHaveBeenCalled();
    });

    test('should cancel long press on touchmove', () => {
        const touchStartEvent = new TouchEvent('touchstart', { bubbles: true, touches: [{ clientX: 10, clientY: 20 }] });
        targetNode.dispatchEvent(touchStartEvent);

        jest.advanceTimersByTime(300);

        const touchMoveEvent = new TouchEvent('touchmove', { bubbles: true });
        document.dispatchEvent(touchMoveEvent);

        expect(clearTimeout).toHaveBeenCalledWith(handler.longPressTimer);
        jest.advanceTimersByTime(200); // Pass the 500ms mark
        expect(handler.handleContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('hideContextMenu', () => {
    test('should hide menu and clean up properties', () => {
        const randomizeBtn = contextMenuElement.querySelector('[data-action="randomize"]');
        randomizeBtn._targetKanji = document.createElement('span');
        handler.activeContextMenuNode = document.createElement('div');
        handler.activeContextMenuKanji = document.createElement('span');
        contextMenuElement.style.display = 'block';

        handler.hideContextMenu();

        expect(contextMenuElement.style.display).toBe('none');
        expect(handler.activeContextMenuNode).toBeNull();
        expect(handler.activeContextMenuKanji).toBeNull();
        expect(randomizeBtn._targetKanji).toBeUndefined();
    });
  });
});