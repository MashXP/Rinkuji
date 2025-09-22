import { OptionsMenu } from '../../src/js/components/OptionsMenu.js';
import localStorageCacheService from '@services/localStorageCacheService.js';

// Mock localStorageCacheService
jest.mock('@services/localStorageCacheService.js', () => ({
    clear: jest.fn(),
}));

describe('OptionsMenu', () => {
    let modalElement;
    let openButtonElement;
    let closeButtonElement;
    let bgColorPicker;
    let highlightColorPicker;
    let textColorPicker;
    let presetsContainer;
    let customColorPresetBtn;
    let colorInputContainer;
    let clearCacheBtn;
    let optionsMenu;

    // Mock localStorage
    const localStorageMock = (() => {
        let store = {};
        return {
            getItem: jest.fn((key) => store[key] || null),
            setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
            clear: jest.fn(() => { store = {}; }),
            removeItem: jest.fn((key) => { delete store[key]; }),
            getStore: () => store // Helper to get the store
        };
    })();

    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    beforeEach(() => {
        // Reset DOM before each test
        document.body.innerHTML = `
            <div id="optionsModal" class="modal"></div>
            <button id="openOptionsBtn"></button>
            <button id="closeOptionsBtn"></button>
            <input type="color" id="bgColorPicker" value="#000000">
            <input type="color" id="highlightColorPicker" value="#000000">
            <input type="color" id="textColorPicker" value="#000000">
            <div id="colorPresets"></div>
            <button id="customColorPresetBtn"></button>
            <div id="colorInputContainer"></div>
            <button id="clearCacheButton"></button>
        `;

        modalElement = document.getElementById('optionsModal');
        openButtonElement = document.getElementById('openOptionsBtn');
        closeButtonElement = document.getElementById('closeOptionsBtn');
        bgColorPicker = document.getElementById('bgColorPicker');
        highlightColorPicker = document.getElementById('highlightColorPicker');
        textColorPicker = document.getElementById('textColorPicker');
        presetsContainer = document.getElementById('colorPresets');
        customColorPresetBtn = document.getElementById('customColorPresetBtn');
        colorInputContainer = document.getElementById('colorInputContainer');
        clearCacheBtn = document.getElementById('clearCacheButton');

        presetsContainer.appendChild(customColorPresetBtn);

        // Clear all mocks and localStorage before each test
        jest.clearAllMocks();
        localStorageMock.clear();

        // Spy on document.documentElement.style.setProperty
        jest.spyOn(document.documentElement.style, 'setProperty');

        optionsMenu = new OptionsMenu(
            modalElement,
            openButtonElement,
            closeButtonElement
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
        document.body.innerHTML = '';
    });

    test('constructor should initialize properties and call init', () => {
        expect(optionsMenu.modal).toBe(modalElement);
        expect(optionsMenu.openBtn).toBe(openButtonElement);
        expect(optionsMenu.closeBtn).toBe(closeButtonElement);
        expect(optionsMenu.bgColorPicker).toBe(bgColorPicker);
        expect(optionsMenu.highlightColorPicker).toBe(highlightColorPicker);
        expect(optionsMenu.textColorPicker).toBe(textColorPicker);
        expect(optionsMenu.presetsContainer).toBe(presetsContainer);
        expect(optionsMenu.customColorPresetBtn).toBe(customColorPresetBtn);
        expect(optionsMenu.colorInputContainer).toBe(colorInputContainer);
        expect(optionsMenu.clearCacheBtn).toBe(clearCacheBtn);
        expect(presetsContainer.children.length).toBeGreaterThan(0); // Presets should be created
        expect(customColorPresetBtn.querySelector('.color-picker-preview')).not.toBeNull();
    });

    test('constructor should log error and return if required elements are missing', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const incompleteOptionsMenu = new OptionsMenu(
            null, // Missing modalElement
            openButtonElement,
            closeButtonElement
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith("OptionsMenu: Missing required elements for initialization.");
        expect(incompleteOptionsMenu.modal).toBeUndefined(); // Should not set properties if constructor returns early

        consoleErrorSpy.mockRestore();
    });

    test('should not create customColorPreview if customColorPresetBtn is null', () => {
        document.body.innerHTML = `
            <div id="optionsModal" class="modal"></div>
            <button id="openOptionsBtn"></button>
            <button id="closeOptionsBtn"></button>
            <input type="color" id="bgColorPicker" value="#000000">
            <input type="color" id="highlightColorPicker" value="#000000">
            <input type="color" id="textColorPicker" value="#000000">
            <div id="colorPresets"></div>
            <div id="colorInputContainer"></div>
            <button id="clearCacheButton"></button>
        `;

        const newOptionsMenu = new OptionsMenu(
            document.getElementById('optionsModal'),
            document.getElementById('openOptionsBtn'),
            document.getElementById('closeOptionsBtn')
        );

        expect(newOptionsMenu.customColorPresetBtn).toBeNull();
        expect(newOptionsMenu.customColorPreview).toBeNull();
    });

    test('show should add visible class to modal', () => {
        optionsMenu.show();
        expect(modalElement.classList.contains('visible')).toBe(true);
    });

    test('hide should remove visible class from modal', () => {
        modalElement.classList.add('visible');
        optionsMenu.hide();
        expect(modalElement.classList.contains('visible')).toBe(false);
    });

    test('open button click should show the modal', () => {
        openButtonElement.click();
        expect(modalElement.classList.contains('visible')).toBe(true);
    });

    test('close button click should hide the modal', () => {
        modalElement.classList.add('visible'); // Make it visible first
        closeButtonElement.click();
        expect(modalElement.classList.contains('visible')).toBe(false);
    });

    test('clicking outside the modal should hide it', () => {
        modalElement.classList.add('visible');
        modalElement.click(); // Simulate click on modal background
        expect(modalElement.classList.contains('visible')).toBe(false);
    });

    test('pressing Escape key should hide the modal if visible', () => {
        modalElement.classList.add('visible');

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(modalElement.classList.contains('visible')).toBe(false);
    });

    test('_clearCache should call localStorageCacheService.clear and show alert', () => {
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        optionsMenu._clearCache();
        expect(localStorageCacheService.clear).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('Cache cleared successfully!');
        alertSpy.mockRestore();
    });

    test('_createPresetButtons should do nothing if container is missing', () => {
        optionsMenu.presetsContainer = null;
        // This is a private method, but we test its guard clause.
        // It shouldn't throw an error.
        expect(() => optionsMenu._createPresetButtons()).not.toThrow();
    });

    test('color picker inputs should apply custom colors', () => {
        const applyCustomColorSpy = jest.spyOn(optionsMenu, '_applyCustomColor');

        bgColorPicker.value = '#000000';
        bgColorPicker.dispatchEvent(new Event('input'));
        expect(applyCustomColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_BG, '#000000');

        highlightColorPicker.value = '#FF0000';
        highlightColorPicker.dispatchEvent(new Event('input'));
        expect(applyCustomColorSpy).toHaveBeenLastCalledWith(optionsMenu.CSS_VAR_HIGHLIGHT, '#ff0000');

        applyCustomColorSpy.mockRestore();
    });

    test('_createPresetButtons should create buttons for each preset', () => {
        // Already called in constructor, so check initial state
        expect(presetsContainer.children.length).toBe(optionsMenu.PRESETS.length + 1); // +1 for custom button
        expect(presetsContainer.querySelector('[title="Default"]')).not.toBeNull();
        expect(presetsContainer.querySelector('[title="Abyss"]')).not.toBeNull();
    });

    test('_applyColor should set CSS property and localStorage', () => {
        optionsMenu._applyColor(optionsMenu.CSS_VAR_BG, '#123456');
        expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(optionsMenu.CSS_VAR_BG, '#123456');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(optionsMenu.CSS_VAR_BG, '#123456');
        expect(bgColorPicker.value).toBe('#123456');
    });

    test('_applyPreset should apply colors and set active preset', () => {
        const setActivePresetSpy = jest.spyOn(optionsMenu, '_setActivePreset');
        const preset = optionsMenu.PRESETS[1]; // Abyss

        optionsMenu._applyPreset(preset, 1);

        expect(localStorageMock.getStore()['activePresetIndex']).toBe('1');
        expect(setActivePresetSpy).toHaveBeenCalledWith(1);
        expect(colorInputContainer.classList.contains('active')).toBe(false);

        setActivePresetSpy.mockRestore();
    });

    test('_activateCustomColorPickers should apply saved custom colors or set custom UI state', () => {
        const applyColorSpy = jest.spyOn(optionsMenu, '_applyColor');
        const setCustomUIStateSpy = jest.spyOn(optionsMenu, '_setCustomUIState');

        // Test with no saved custom colors
        optionsMenu._activateCustomColorPickers();
        expect(applyColorSpy).not.toHaveBeenCalled();
        expect(setCustomUIStateSpy).toHaveBeenCalled();

        // Test with saved custom colors
        localStorageMock.setItem('custom-bg-color', '#customBg');
        localStorageMock.setItem('custom-highlight-color', '#customHighlight');
        localStorageMock.setItem('custom-text-color', '#customText');

        optionsMenu._activateCustomColorPickers();
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_BG, '#customBg', true);
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_HIGHLIGHT, '#customHighlight', true);
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_TEXT, '#customText', true);
        expect(setCustomUIStateSpy).toHaveBeenCalledTimes(2);

        applyColorSpy.mockRestore();
        setCustomUIStateSpy.mockRestore();
    });

    test('_setActivePreset should not add active class for invalid index', () => {
        optionsMenu._setActivePreset(999); // Invalid index
        const activeButtons = presetsContainer.querySelectorAll('.active');
        expect(activeButtons.length).toBe(0);
    });

    test('_applyColor should handle custom color updates correctly', () => {
        optionsMenu._applyColor(optionsMenu.CSS_VAR_BG, '#112233', true);
        expect(customColorPresetBtn.style.backgroundColor).toBe('rgb(17, 34, 51)');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('custom-bg-color', '#112233');

        optionsMenu._applyColor(optionsMenu.CSS_VAR_HIGHLIGHT, '#445566', true);
        expect(customColorPresetBtn.style.borderColor).toBe('#445566');
    });

    test('_loadSettings should apply default preset if no settings are saved', () => {
        const applyPresetSpy = jest.spyOn(optionsMenu, '_applyPreset');
        localStorageMock.clear(); // Ensure no saved settings
        optionsMenu._loadSettings();
        expect(applyPresetSpy).toHaveBeenCalledWith(optionsMenu.PRESETS[0], 0);
        applyPresetSpy.mockRestore();
    });

    test('_loadSettings should apply saved preset if settings are available', () => {
        const applyPresetSpy = jest.spyOn(optionsMenu, '_applyPreset');
        localStorageMock.setItem('activePresetIndex', '1'); // Abyss preset

        optionsMenu._loadSettings();
        expect(applyPresetSpy).toHaveBeenCalledWith(optionsMenu.PRESETS[1], 1);

        applyPresetSpy.mockRestore();
    });

    test('_loadSettings should apply saved custom colors if custom is active', () => {
        const applyColorSpy = jest.spyOn(optionsMenu, '_applyColor');
        const setCustomUIStateSpy = jest.spyOn(optionsMenu, '_setCustomUIState');

        localStorageMock.setItem('activePresetIndex', 'custom');
        localStorageMock.setItem('custom-bg-color', '#111');
        localStorageMock.setItem('custom-highlight-color', '#222');
        localStorageMock.setItem('custom-text-color', '#333');

        optionsMenu._loadSettings();
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_BG, '#111', true);
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_HIGHLIGHT, '#222', true);
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_TEXT, '#333', true);
        expect(setCustomUIStateSpy).toHaveBeenCalled();

        applyColorSpy.mockRestore();
        setCustomUIStateSpy.mockRestore();
    });

    test('_loadSettings should handle partially saved theme by treating as custom', () => {
        // The constructor will have run _loadSettings and set a default preset.
        // We need to override that for this specific test case.
        localStorageMock.setItem(optionsMenu.CSS_VAR_BG, '#fallbackBg');
        localStorageMock.setItem(optionsMenu.CSS_VAR_HIGHLIGHT, '#fallbackHighlight');
        localStorageMock.setItem(optionsMenu.CSS_VAR_TEXT, '#fallbackText');
        localStorageMock.removeItem('activePresetIndex'); // Ensure no preset is active

        const setCustomUIStateSpy = jest.spyOn(optionsMenu, '_setCustomUIState');

        optionsMenu._loadSettings();

        expect(setCustomUIStateSpy).toHaveBeenCalled();
        expect(colorInputContainer.classList.contains('active')).toBe(true);
        setCustomUIStateSpy.mockRestore();
    });

    test('_addOptionEventListeners should not add listeners if elements are null', () => {
        document.body.innerHTML = `
            <div id="optionsModal" class="modal"></div>
            <button id="openOptionsBtn"></button>
            <button id="closeOptionsBtn"></button>
            <div id="colorPresets"></div>
            <div id="colorInputContainer"></div>
        `;

        const newOptionsMenu = new OptionsMenu(
            document.getElementById('optionsModal'),
            document.getElementById('openOptionsBtn'),
            document.getElementById('closeOptionsBtn')
        );

        // These should be null in this setup
        expect(newOptionsMenu.bgColorPicker).toBeNull();
        expect(newOptionsMenu.highlightColorPicker).toBeNull();
        expect(newOptionsMenu.textColorPicker).toBeNull();
        expect(newOptionsMenu.clearCacheBtn).toBeNull();

        // No direct way to assert event listeners were NOT added, but we can check coverage after this.
        // The main point is that it doesn't throw an error.
        expect(() => newOptionsMenu.init()).not.toThrow();
    });
});