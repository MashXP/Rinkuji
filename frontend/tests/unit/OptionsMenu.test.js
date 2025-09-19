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
        const showSpy = jest.spyOn(optionsMenu, 'show');
        openButtonElement.click();
        expect(showSpy).toHaveBeenCalled();
        showSpy.mockRestore();
    });

    test('close button click should hide the modal', () => {
        const hideSpy = jest.spyOn(optionsMenu, 'hide');
        closeButtonElement.click();
        expect(hideSpy).toHaveBeenCalled();
        hideSpy.mockRestore();
    });

    test('clicking outside the modal should hide it', () => {
        const hideSpy = jest.spyOn(optionsMenu, 'hide');
        modalElement.classList.add('visible');
        modalElement.click(); // Simulate click on modal background
        expect(hideSpy).toHaveBeenCalled();
        hideSpy.mockRestore();
    });

    test('pressing Escape key should hide the modal if visible', () => {
        const hideSpy = jest.spyOn(optionsMenu, 'hide');
        modalElement.classList.add('visible');

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(hideSpy).toHaveBeenCalled();

        hideSpy.mockRestore();
    });

    test('_clearCache should call localStorageCacheService.clear and show alert', () => {
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        optionsMenu._clearCache();
        expect(localStorageCacheService.clear).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('Cache cleared successfully!');
        alertSpy.mockRestore();
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
        expect(setCustomUIStateSpy).toHaveBeenCalledTimes(2); // Called twice

        applyColorSpy.mockRestore();
        setCustomUIStateSpy.mockRestore();
    });

    test('_loadSettings should apply saved settings or default preset', () => {
        const applyColorSpy = jest.spyOn(optionsMenu, '_applyColor');
        const applyPresetSpy = jest.spyOn(optionsMenu, '_applyPreset');
        const setActivePresetSpy = jest.spyOn(optionsMenu, '_setActivePreset');

        // Test with no saved settings (should apply default preset)
        localStorageMock.clear();
        optionsMenu._loadSettings();
        expect(applyPresetSpy).toHaveBeenCalledWith(optionsMenu.PRESETS[0], 0);

        // Test with saved preset
        localStorageMock.setItem(optionsMenu.CSS_VAR_BG, '#savedBg');
        localStorageMock.setItem(optionsMenu.CSS_VAR_HIGHLIGHT, '#savedHighlight');
        localStorageMock.setItem(optionsMenu.CSS_VAR_TEXT, '#savedText');
        localStorageMock.setItem('activePresetIndex', '1'); // Abyss preset

        optionsMenu._loadSettings();
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_BG, '#savedBg');
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_HIGHLIGHT, '#savedHighlight');
        expect(applyColorSpy).toHaveBeenCalledWith(optionsMenu.CSS_VAR_TEXT, '#savedText');
        expect(setActivePresetSpy).toHaveBeenCalledWith(1);
        expect(colorInputContainer.classList.contains('active')).toBe(false);

        // Test with saved custom colors
        localStorageMock.clear();
        localStorageMock.setItem(optionsMenu.CSS_VAR_BG, '#customSavedBg');
        localStorageMock.setItem(optionsMenu.CSS_VAR_HIGHLIGHT, '#customSavedHighlight');
        localStorageMock.setItem(optionsMenu.CSS_VAR_TEXT, '#customSavedText');
        localStorageMock.setItem('activePresetIndex', 'custom');

        optionsMenu._loadSettings();
        expect(setActivePresetSpy).toHaveBeenCalledWith(null); // Custom is active
        expect(colorInputContainer.classList.contains('active')).toBe(true);

        applyColorSpy.mockRestore();
        applyPresetSpy.mockRestore();
        setActivePresetSpy.mockRestore();
    });
});