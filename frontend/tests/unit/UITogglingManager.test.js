import { UITogglingManager } from '../../src/js/managers/UITogglingManager.js';

describe('UITogglingManager', () => {
    let mockElements;
    let mockElement1;
    let mockElement2;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();

        mockElement1 = document.createElement('div');
        mockElement2 = document.createElement('div');
        mockElements = [mockElement1, mockElement2];

        // Mock classList methods
        mockElements.forEach(el => {
            el.classList.add = jest.fn();
            el.classList.remove = jest.fn();
            el.classList.toggle = jest.fn();
        });

        // Mock matches for :hover pseudo-class
        mockElement1.matches = jest.fn(() => false);
        mockElement2.matches = jest.fn(() => false);

        // Spy on global event listeners
        jest.spyOn(document.body, 'addEventListener');
        jest.spyOn(mockElement1, 'addEventListener');
        jest.spyOn(mockElement2, 'addEventListener');

        // Spy on setTimeout and clearTimeout
        jest.spyOn(global, 'setTimeout');
        jest.spyOn(global, 'clearTimeout');
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('constructor should initialize properties and filter null elements', () => {
        const manager = new UITogglingManager([mockElement1, null, mockElement2], 5000);
        expect(manager.elements).toEqual([mockElement1, mockElement2]);
        expect(manager.idleTimeout).toBe(5000);
        expect(manager.idleTimer).toBeNull();
        expect(manager.isManuallyHidden).toBe(false);
    });

    describe('initAutoHide', () => {
        test('should add event listeners and call showElements', () => {
            const manager = new UITogglingManager(mockElements);
            // Spy on the instance method after creation, before initAutoHide is called
            const showElementsSpy = jest.spyOn(manager, 'showElements');

            manager.initAutoHide();

            expect(document.body.addEventListener).toHaveBeenCalledWith('mousemove', manager.showElements, { passive: true });
            expect(document.body.addEventListener).toHaveBeenCalledWith('touchstart', manager.showElements, { passive: true });
            expect(mockElement1.addEventListener).toHaveBeenCalledWith('mouseenter', manager.showElements);
            expect(mockElement1.addEventListener).toHaveBeenCalledWith('mouseleave', manager.showElements);
            expect(mockElement2.addEventListener).toHaveBeenCalledWith('mouseenter', manager.showElements);
            expect(mockElement2.addEventListener).toHaveBeenCalledWith('mouseleave', manager.showElements);
            expect(showElementsSpy).toHaveBeenCalledTimes(1);
        });

        test('should do nothing if no elements are managed', () => {
            const manager = new UITogglingManager([]);
            manager.showElements = jest.fn();

            manager.initAutoHide();

            expect(document.body.addEventListener).not.toHaveBeenCalled();
            expect(mockElement1.addEventListener).not.toHaveBeenCalled();
            expect(manager.showElements).not.toHaveBeenCalled();
        });
    });

    describe('showElements', () => {
        test('should add visible class, clear and set timeout', () => {
            const manager = new UITogglingManager(mockElements);
            // Ensure hideElements is bound for setTimeout
            manager.hideElements = manager.hideElements.bind(manager);
            manager.showElements();

            expect(mockElement1.classList.add).toHaveBeenCalledWith('visible');
            expect(mockElement2.classList.add).toHaveBeenCalledWith('visible');
            expect(clearTimeout).toHaveBeenCalledWith(null); // Initial call
            expect(setTimeout).toHaveBeenCalledWith(manager.hideElements, manager.idleTimeout);
        });

        test('should not show elements if manually hidden', () => {
            const manager = new UITogglingManager(mockElements);
            manager.isManuallyHidden = true;
            manager.showElements();

            expect(mockElement1.classList.add).not.toHaveBeenCalled();
            expect(clearTimeout).not.toHaveBeenCalled();
            expect(setTimeout).not.toHaveBeenCalled();
        });
    });

    describe('hideElements', () => {
        test('should remove visible class if not hovering', () => {
            const manager = new UITogglingManager(mockElements);
            manager.hideElements();

            expect(mockElement1.classList.remove).toHaveBeenCalledWith('visible');
            expect(mockElement2.classList.remove).toHaveBeenCalledWith('visible');
        });

        test('should not hide elements if manually hidden', () => {
            const manager = new UITogglingManager(mockElements);
            manager.isManuallyHidden = true;
            manager.hideElements();

            expect(mockElement1.classList.remove).not.toHaveBeenCalled();
        });

        test('should not hide elements if hovering', () => {
            mockElement1.matches.mockImplementation(() => true); // Simulate hovering
            const manager = new UITogglingManager(mockElements);
            manager.hideElements();

            expect(mockElement1.classList.remove).not.toHaveBeenCalled();
            expect(mockElement2.classList.remove).not.toHaveBeenCalled();
        });
    });

    describe('manualToggle', () => {
        test('should toggle isManuallyHidden and hide elements if becoming hidden', () => {
            const manager = new UITogglingManager(mockElements);
            manager.showElements = jest.fn(); // Prevent auto-show on manualToggle

            // Toggle to hidden
            const isHidden = manager.manualToggle();
            expect(isHidden).toBe(true);
            expect(manager.isManuallyHidden).toBe(true);
            expect(clearTimeout).toHaveBeenCalled();
            expect(mockElement1.classList.remove).toHaveBeenCalledWith('visible');

            // Toggle to shown
            jest.clearAllMocks();
            const isShown = manager.manualToggle();
            expect(isShown).toBe(false);
            expect(manager.isManuallyHidden).toBe(false);
            expect(manager.showElements).toHaveBeenCalledTimes(1);
        });
    });

    describe('manualToggleClass', () => {
        test('should toggle class on all elements and return state of first element', () => {
            const manager = new UITogglingManager(mockElements);
            mockElement1.classList.toggle.mockReturnValueOnce(true); // First toggle
            mockElement2.classList.toggle.mockReturnValueOnce(false);

            let isToggled = manager.manualToggleClass('test-class');
            expect(mockElement1.classList.toggle).toHaveBeenCalledWith('test-class'); // Removed undefined
            expect(mockElement2.classList.toggle).toHaveBeenCalledWith('test-class'); // Removed undefined
            expect(isToggled).toBe(true);

            jest.clearAllMocks();
            mockElement1.classList.toggle.mockReturnValueOnce(false); // Second toggle
            mockElement2.classList.toggle.mockReturnValueOnce(true);

            isToggled = manager.manualToggleClass('test-class');
            expect(isToggled).toBe(false);
        });
    });

    describe('static setupToggle', () => {
        let button;
        let target;
        let onState;
        let offState;

        beforeEach(() => {
            button = document.createElement('button');
            target = document.createElement('div');
            onState = { html: 'ON', title: 'On State' };
            offState = { html: 'OFF', title: 'Off State' };

            // Mock classList methods for button and target
            button.classList.toggle = jest.fn();
            target.classList.toggle = jest.fn();
        });

        test('should set initial button state', () => {
            UITogglingManager.setupToggle({ button, target, toggleClass: 'test-class', onState, offState });
            expect(button.innerHTML).toBe('OFF');
            expect(button.title).toBe('Off State');
        });

        test('should toggle class on target and update button on click', () => {
            UITogglingManager.setupToggle({ button, target, toggleClass: 'test-class', onState, offState });

            target.classList.toggle.mockReturnValueOnce(true); // Simulate toggling ON
            button.click();
            expect(target.classList.toggle).toHaveBeenCalledWith('test-class');
            expect(button.innerHTML).toBe('ON');
            expect(button.title).toBe('On State');

            target.classList.toggle.mockReturnValueOnce(false); // Simulate toggling OFF
            button.click();
            expect(target.classList.toggle).toHaveBeenCalledWith('test-class');
            expect(button.innerHTML).toBe('OFF');
            expect(button.title).toBe('Off State');
        });

        test('should toggle buttonToggleClass if provided', () => {
            UITogglingManager.setupToggle({ button, target, toggleClass: 'test-class', buttonToggleClass: 'btn-active', onState, offState });

            target.classList.toggle.mockReturnValueOnce(true); // Simulate toggling ON
            button.click();
            expect(button.classList.toggle).toHaveBeenCalledWith('btn-active', true);

            target.classList.toggle.mockReturnValueOnce(false); // Simulate toggling OFF
            button.click();
            expect(button.classList.toggle).toHaveBeenCalledWith('btn-active', false);
        });

        test('should return early if button or target is missing', () => {
            const spy = jest.spyOn(button, 'addEventListener');
            UITogglingManager.setupToggle({ button: null, target, toggleClass: 'test-class', onState, offState });
            expect(spy).not.toHaveBeenCalled();

            spy.mockRestore();
        });
    });
});