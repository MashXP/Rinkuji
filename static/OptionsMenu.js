export class OptionsMenu {
    /**
     * Manages the options modal dialog.
     * @param {HTMLElement} modalElement The main modal container element.
     * @param {HTMLElement} openButtonElement The button that opens the modal.
     * @param {HTMLElement} closeButtonElement The button that closes the modal.
     */
    constructor(modalElement, openButtonElement, closeButtonElement) {
        if (!modalElement || !openButtonElement || !closeButtonElement) {
            console.error("OptionsMenu: Missing required elements for initialization.");
            return;
        }
        this.modal = modalElement;
        this.openBtn = openButtonElement;
        this.closeBtn = closeButtonElement;

        // --- New properties for color options ---
        this.bgColorPicker = document.getElementById('bgColorPicker');
        this.highlightColorPicker = document.getElementById('highlightColorPicker');
        this.textColorPicker = document.getElementById('textColorPicker');
        this.presetsContainer = document.getElementById('colorPresets');
        this.customColorPresetBtn = document.getElementById('customColorPresetBtn'); // New: Custom color button
        this.colorInputContainer = document.getElementById('colorInputContainer'); // New: Reference to the container
        this.customColorPreview = null; // Will hold the 'あ' span for the custom button

        this.CSS_VAR_BG = '--canvas-bg-color';
        this.CSS_VAR_HIGHLIGHT = '--highlight-color';
        this.CSS_VAR_TEXT = '--text-color';

        this.PRESETS = [
            { name: 'Default', bg: '#2c3e50', highlight: '#f39c12', text: '#ecf0f1' },
            { name: 'Abyss', bg: '#2d3436', highlight: '#00b894', text: '#dfe6e9' },
            { name: 'Paper', bg: '#fdfaf1', highlight: '#d63031', text: '#2d3436' },
            { name: 'Blueprint', bg: '#0984e3', highlight: '#ffffff', text: '#ecf0f1' }
        ];

        this.init();
    }

    /**
     * Initializes event listeners for the modal.
     */
    init() {
        this.openBtn.addEventListener('click', () => this.show());
        this.closeBtn.addEventListener('click', () => this.hide());

        // Close the modal if the backdrop is clicked
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });

        // Close the modal with the Escape key for better accessibility
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.classList.contains('visible')) {
                this.hide();
            }
        });

        // --- New initializers for color options ---
        this._createPresetButtons();

        // Create and store the preview span for the custom button
        if (this.customColorPresetBtn) {
            const preview = document.createElement('span');
            preview.classList.add('color-picker-preview');
            preview.textContent = 'あ';
            this.customColorPresetBtn.appendChild(preview);
            this.customColorPreview = preview;
        }

        this._addOptionEventListeners();
        this._loadSettings(); // Load settings AFTER event listeners are added
    }

    /**
     * Creates and appends the color preset buttons to the DOM.
     */
    _createPresetButtons() {
        if (!this.presetsContainer) return;

        // Remove existing preset buttons to avoid duplication if init is called multiple times
        this.presetsContainer.querySelectorAll('.preset-button:not(.custom-preset-button)').forEach(btn => btn.remove());

        this.PRESETS.forEach((preset, index) => {
            const button = document.createElement('button');
            button.classList.add('preset-button');
            button.title = preset.name;
            button.dataset.presetIndex = index; // Store index to identify active preset
            button.style.backgroundColor = preset.bg;
            button.style.borderColor = preset.highlight;

            // Add the text color preview character
            const preview = document.createElement('span');
            preview.classList.add('color-picker-preview'); // Reuse existing class for styling
            preview.textContent = 'あ';
            preview.style.color = preset.text;
            button.appendChild(preview);

            button.addEventListener('click', () => this._applyPreset(preset, index));
            this.presetsContainer.insertBefore(button, this.customColorPresetBtn); // Insert before custom button
        });
    }

    /**
     * Adds event listeners to the color pickers and reset button.
     */
    _addOptionEventListeners() {
        if (this.bgColorPicker) {
            this.bgColorPicker.addEventListener('input', (e) => this._applyCustomColor(this.CSS_VAR_BG, e.target.value));
        }
        if (this.highlightColorPicker) {
            this.highlightColorPicker.addEventListener('input', (e) => this._applyCustomColor(this.CSS_VAR_HIGHLIGHT, e.target.value));
        }
        if (this.textColorPicker) {
            this.textColorPicker.addEventListener('input', (e) => this._applyCustomColor(this.CSS_VAR_TEXT, e.target.value));
        }
        if (this.customColorPresetBtn) {
            this.customColorPresetBtn.addEventListener('click', () => this._activateCustomColorPickers());
        }
    }

    /**
     * Applies a color to a CSS custom property and saves it to localStorage.
     * This method is used for both presets and custom colors.
     * It also updates the color picker values and active state.
     * @param {string} property - The CSS custom property name (e.g., '--canvas-bg-color').
     * @param {string} value - The color value (e.g., '#ffffff').
     * @param {boolean} isCustom - True if the color is applied from a custom picker.
     */
    _applyColor(property, value, isCustom = false) {
        document.documentElement.style.setProperty(property, value);
        localStorage.setItem(property, value);

        // Update the custom preset button's style and save its state
        // only when a custom color is being applied.
        if (isCustom && this.customColorPresetBtn) {
            if (property === this.CSS_VAR_BG) {
                this.customColorPresetBtn.style.backgroundColor = value;
                localStorage.setItem('custom-bg-color', value);
            }
            if (property === this.CSS_VAR_HIGHLIGHT) {
                this.customColorPresetBtn.style.borderColor = value;
                localStorage.setItem('custom-highlight-color', value);
            }
            if (property === this.CSS_VAR_TEXT) {
                localStorage.setItem('custom-text-color', value);
                if (this.customColorPreview) {
                    this.customColorPreview.style.color = value;
                }
            }
        }

        // Update the color picker's value if it's the right picker
        if (property === this.CSS_VAR_BG && this.bgColorPicker) {
            this.bgColorPicker.value = value;
        }
        if (property === this.CSS_VAR_HIGHLIGHT && this.highlightColorPicker) {
            this.highlightColorPicker.value = value;
        }
        if (property === this.CSS_VAR_TEXT && this.textColorPicker) {
            this.textColorPicker.value = value;
        }
    }

    /**
     * Applies a color preset.
     * @param {object} preset - The preset object containing bg and highlight colors.
     * @param {number} index - The index of the preset in the PRESETS array.
     */
    _applyPreset(preset, index) {
        this._applyColor(this.CSS_VAR_BG, preset.bg);
        this._applyColor(this.CSS_VAR_HIGHLIGHT, preset.highlight);
        this._applyColor(this.CSS_VAR_TEXT, preset.text);
        localStorage.setItem('activePresetIndex', index); // Save active preset index
        this._setActivePreset(index);
        this.colorInputContainer.classList.remove('active'); // Hide inputs when a preset is selected
    }

    /**
     * Applies a custom color chosen via the color picker.
     * @param {string} property - The CSS custom property name.
     * @param {string} value - The color value.
     */
    _applyCustomColor(property, value) {
        this._applyColor(property, value, true); // Apply the color and update button visuals
        this._setCustomUIState(); // Handle the overall UI state change
    }

    /**
     * Activates the custom color pickers, applies the last-used custom theme, and shows the input container.
     */
    _activateCustomColorPickers() {
        // Load the last-saved custom colors
        const customBg = localStorage.getItem('custom-bg-color');
        const customHighlight = localStorage.getItem('custom-highlight-color');
        const customText = localStorage.getItem('custom-text-color');

        // If custom colors are saved, apply them.
        // The _applyColor method (with isCustom=true) will handle updating the
        // theme, saving state, and setting the UI to the 'custom' mode.
        if (customBg && customHighlight && customText) {
            this._applyColor(this.CSS_VAR_BG, customBg, true);
            this._applyColor(this.CSS_VAR_HIGHLIGHT, customHighlight, true);
            this._applyColor(this.CSS_VAR_TEXT, customText, true);
            this._setCustomUIState();
        } else {
            // If no custom colors are saved yet (e.g., first time use),
            // just activate the custom color UI without changing the theme.
            // The color pickers will default to the currently active theme's colors.
            this._setCustomUIState();
        }
    }

    /**
     * Centralized method to set the UI to the "custom color" state.
     */
    _setCustomUIState() {
        localStorage.setItem('activePresetIndex', 'custom');
        this._setActivePreset(null); // This handles adding 'active' to the custom button
        this.colorInputContainer.classList.add('active');
    }

    /**
     * Sets the active state for the preset buttons.
     * @param {number|null} activeIndex The index of the active preset, or null for custom.
     */
    _setActivePreset(activeIndex) {
        this.presetsContainer.querySelectorAll('.preset-button').forEach(button => {
            button.classList.remove('active');
        });

        if (activeIndex !== null) {
            const presetButton = this.presetsContainer.querySelector(`[data-preset-index="${activeIndex}"]`);
            if (presetButton) {
                presetButton.classList.add('active');
            }
        } else {
            // If activeIndex is null, it means custom colors are active
            this.customColorPresetBtn.classList.add('active');
        }
    }

    /**
     * Loads saved color settings from localStorage on startup.
     */
    _loadSettings() {
        // Load and apply the custom button's last-saved colors, independent of the active theme.
        const customBg = localStorage.getItem('custom-bg-color');
        const customHighlight = localStorage.getItem('custom-highlight-color');
        const customText = localStorage.getItem('custom-text-color');
        if (this.customColorPresetBtn) {
            if (customBg) {
                this.customColorPresetBtn.style.backgroundColor = customBg;
            }
            if (customHighlight) {
                this.customColorPresetBtn.style.borderColor = customHighlight;
            }
        }
        // Update the custom button's preview character on load
        if (this.customColorPreview && customText) {
            this.customColorPreview.style.color = customText;
        }

        const savedBg = localStorage.getItem(this.CSS_VAR_BG);
        const savedHighlight = localStorage.getItem(this.CSS_VAR_HIGHLIGHT);
        const savedText = localStorage.getItem(this.CSS_VAR_TEXT);
        const activePresetIndex = localStorage.getItem('activePresetIndex');

        if (savedBg && savedHighlight && savedText) {
            this._applyColor(this.CSS_VAR_BG, savedBg);
            this._applyColor(this.CSS_VAR_HIGHLIGHT, savedHighlight);
            this._applyColor(this.CSS_VAR_TEXT, savedText);

            if (activePresetIndex === 'custom') {
                this._setActivePreset(null); // Custom is active
                this.colorInputContainer.classList.add('active'); // Show inputs if custom was active
            } else if (activePresetIndex !== null && this.PRESETS[parseInt(activePresetIndex)]) {
                this._setActivePreset(parseInt(activePresetIndex));
                this.colorInputContainer.classList.remove('active'); // Hide inputs if a preset was active
            } else {
                // Fallback if saved index is invalid, but colors exist. Treat as custom.
                this._setActivePreset(null);
                localStorage.setItem('activePresetIndex', 'custom');
                this.colorInputContainer.classList.add('active'); // Show inputs in fallback custom case
            }
        } else {
            // If no colors are saved, apply the default preset
            this._applyPreset(this.PRESETS[0], 0);
        }
    }

    /**
     * Displays the modal.
     */
    show() {
        this.modal.classList.add('visible');
    }

    /**
     * Hides the modal.
     */
    hide() {
        this.modal.classList.remove('visible');
    }
}