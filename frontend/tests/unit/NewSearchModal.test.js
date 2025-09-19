import { NewSearchModal } from '../../src/js/components/NewSearchModal.js';
import * as apiService from '@services/api.js';

// Mock the API service
jest.mock('@services/api.js', () => ({
    getSuggestions: jest.fn(),
}));

describe('NewSearchModal', () => {
    let modalElement;
    let openButtonElement;
    let closeButtonElement;
    let inputElement;
    let suggestionsListElement;
    let jishoLoadingIndicatorElement;
    let newSearchModal;

    beforeEach(() => {
        // Mock scrollIntoView
        window.HTMLElement.prototype.scrollIntoView = jest.fn();

        // Create mock DOM elements
        modalElement = document.createElement('div');
        modalElement.classList.add('modal');
        openButtonElement = document.createElement('button');
        closeButtonElement = document.createElement('button');
        inputElement = document.createElement('input');
        suggestionsListElement = document.createElement('div');
        jishoLoadingIndicatorElement = document.createElement('div');

        // Append to body for event listeners to work
        document.body.appendChild(modalElement);
        document.body.appendChild(openButtonElement);
        document.body.appendChild(closeButtonElement);
        modalElement.appendChild(inputElement);
        modalElement.appendChild(suggestionsListElement);
        modalElement.appendChild(jishoLoadingIndicatorElement);

        // Clear all mocks before each test
        jest.clearAllMocks();
        jest.useFakeTimers(); // Use fake timers for debouncing

        newSearchModal = new NewSearchModal(
            modalElement,
            openButtonElement,
            closeButtonElement,
            inputElement,
            suggestionsListElement,
            jishoLoadingIndicatorElement
        );
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers(); // Restore real timers
        document.body.innerHTML = ''; // Clean up DOM
    });

    test('constructor should initialize properties and call init', () => {
        expect(newSearchModal.modal).toBe(modalElement);
        expect(newSearchModal.openBtn).toBe(openButtonElement);
        expect(newSearchModal.closeBtn).toBe(closeButtonElement);
        expect(newSearchModal.input).toBe(inputElement);
        expect(newSearchModal.suggestionsList).toBe(suggestionsListElement);
        expect(newSearchModal.jishoLoadingIndicator).toBe(jishoLoadingIndicatorElement);
        expect(newSearchModal.debounceTimeout).toBeNull();
        expect(newSearchModal.selectedSuggestionIndex).toBe(-1);
    });

    test('show should add visible class and focus input', () => {
        const focusSpy = jest.spyOn(inputElement, 'focus');
        const selectSpy = jest.spyOn(inputElement, 'select');

        newSearchModal.show();
        expect(modalElement.classList.contains('visible')).toBe(true);

        jest.advanceTimersByTime(50);
        expect(focusSpy).toHaveBeenCalled();
        expect(selectSpy).toHaveBeenCalled();

        focusSpy.mockRestore();
        selectSpy.mockRestore();
    });

    test('hide should remove visible class, clear suggestions and hide loading indicator', () => {
        const clearSuggestionsSpy = jest.spyOn(newSearchModal, 'clearSuggestions');
        const hideLoadingIndicatorSpy = jest.spyOn(newSearchModal, 'hideLoadingIndicator');

        modalElement.classList.add('visible');
        newSearchModal.hide();

        expect(modalElement.classList.contains('visible')).toBe(false);
        expect(clearSuggestionsSpy).toHaveBeenCalled();
        expect(hideLoadingIndicatorSpy).toHaveBeenCalled();

        clearSuggestionsSpy.mockRestore();
        hideLoadingIndicatorSpy.mockRestore();
    });

    test('open button click should show the modal', () => {
        const showSpy = jest.spyOn(newSearchModal, 'show');
        openButtonElement.click();
        expect(showSpy).toHaveBeenCalled();
        showSpy.mockRestore();
    });

    test('close button click should hide the modal', () => {
        const hideSpy = jest.spyOn(newSearchModal, 'hide');
        closeButtonElement.click();
        expect(hideSpy).toHaveBeenCalled();
        hideSpy.mockRestore();
    });

    test('clicking outside the modal should hide it', () => {
        const hideSpy = jest.spyOn(newSearchModal, 'hide');
        modalElement.classList.add('visible');
        modalElement.click(); // Simulate click on modal background
        expect(hideSpy).toHaveBeenCalled();
        hideSpy.mockRestore();
    });

    test('pressing Escape key should hide the modal if visible', () => {
        const hideSpy = jest.spyOn(newSearchModal, 'hide');
        modalElement.classList.add('visible');

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(hideSpy).toHaveBeenCalled();

        hideSpy.mockRestore();
    });

    test('handleInput should debounce and call getSuggestions', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2']);
        const renderSuggestionsSpy = jest.spyOn(newSearchModal, 'renderSuggestions');
        const showLoadingIndicatorSpy = jest.spyOn(newSearchModal, 'showLoadingIndicator');
        const hideLoadingIndicatorSpy = jest.spyOn(newSearchModal, 'hideLoadingIndicator');

        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));

        // The loading indicator should show up immediately after the debounce timeout starts
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // Allow promise to resolve

        expect(showLoadingIndicatorSpy).toHaveBeenCalled();
        expect(apiService.getSuggestions).toHaveBeenCalledWith('test');
        expect(renderSuggestionsSpy).toHaveBeenCalledWith(['suggestion1', 'suggestion2']);
        expect(hideLoadingIndicatorSpy).toHaveBeenCalled();

        renderSuggestionsSpy.mockRestore();
        showLoadingIndicatorSpy.mockRestore();
        hideLoadingIndicatorSpy.mockRestore();
    });

    test('handleInput should clear suggestions and hide loading if query is empty', async () => {
        const clearSuggestionsSpy = jest.spyOn(newSearchModal, 'clearSuggestions');
        const hideLoadingIndicatorSpy = jest.spyOn(newSearchModal, 'hideLoadingIndicator');

        inputElement.value = '';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(clearSuggestionsSpy).toHaveBeenCalled();
        expect(hideLoadingIndicatorSpy).toHaveBeenCalled();
        expect(apiService.getSuggestions).not.toHaveBeenCalled();

        clearSuggestionsSpy.mockRestore();
        hideLoadingIndicatorSpy.mockRestore();
    });

    test('renderSuggestions should display suggestions and attach click handlers', () => {
        const suggestions = ['apple', 'banana'];
        newSearchModal.renderSuggestions(suggestions);

        expect(suggestionsListElement.style.display).toBe('block');
        expect(suggestionsListElement.children.length).toBe(2);
        expect(suggestionsListElement.children[0].textContent).toBe('apple');
        expect(suggestionsListElement.children[1].textContent).toBe('banana');

        const itemClickSpy = jest.spyOn(newSearchModal, 'clearSuggestions');
        suggestionsListElement.children[0].click();
        expect(inputElement.value).toBe('apple');
        expect(itemClickSpy).toHaveBeenCalled();
        itemClickSpy.mockRestore();
    });

    test('clearSuggestions should empty the list and hide it', () => {
        suggestionsListElement.innerHTML = '<div class="suggestion-item">test</div>';
        suggestionsListElement.style.display = 'block';

        newSearchModal.clearSuggestions();

        expect(suggestionsListElement.innerHTML).toBe('');
        expect(suggestionsListElement.style.display).toBe('none');
    });

    test('handleKeyDown with ArrowDown should navigate and highlight suggestions', () => {
        newSearchModal.renderSuggestions(['a', 'b', 'c']);
        const highlightSpy = jest.spyOn(newSearchModal, 'highlightSuggestion');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(newSearchModal.selectedSuggestionIndex).toBe(0);
        expect(highlightSpy).toHaveBeenCalled();
        expect(inputElement.value).toBe('a');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(newSearchModal.selectedSuggestionIndex).toBe(1);
        expect(inputElement.value).toBe('b');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(newSearchModal.selectedSuggestionIndex).toBe(2);
        expect(inputElement.value).toBe('c');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(newSearchModal.selectedSuggestionIndex).toBe(0); // Wraps around
        expect(inputElement.value).toBe('a');

        highlightSpy.mockRestore();
    });

    test('handleKeyDown with ArrowUp should navigate and highlight suggestions', () => {
        newSearchModal.renderSuggestions(['a', 'b', 'c']);
        const highlightSpy = jest.spyOn(newSearchModal, 'highlightSuggestion');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        expect(newSearchModal.selectedSuggestionIndex).toBe(2); // Wraps around
        expect(highlightSpy).toHaveBeenCalled();
        expect(inputElement.value).toBe('c');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        expect(newSearchModal.selectedSuggestionIndex).toBe(1);
        expect(inputElement.value).toBe('b');

        highlightSpy.mockRestore();
    });

    test('handleKeyDown with Enter should click selected suggestion', () => {
        newSearchModal.renderSuggestions(['a', 'b']);
        const suggestionClickSpy = jest.spyOn(suggestionsListElement.children[0], 'click');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); // Select 'a'
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(suggestionClickSpy).toHaveBeenCalled();
        suggestionClickSpy.mockRestore();
    });

    test('highlightSuggestion should add/remove selected class and scroll into view', () => {
        newSearchModal.renderSuggestions(['item1', 'item2']);
        const suggestions = Array.from(suggestionsListElement.children);

        newSearchModal.selectedSuggestionIndex = 0;
        newSearchModal.highlightSuggestion(suggestions);

        expect(suggestions[0].classList.contains('selected')).toBe(true);
        expect(suggestions[1].classList.contains('selected')).toBe(false);
        expect(inputElement.value).toBe('item1');
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    });
});