import { NewSearchModal } from '../../src/js/components/NewSearchModal.js';
import * as apiService from '@services/api.js';

jest.mock('@services/api.js', () => ({
    getSuggestions: jest.fn(),
}));

describe('Integration: NewSearchModal', () => {
    let modalElement;
    let openButtonElement;
    let closeButtonElement;
    let inputElement;
    let suggestionsListElement;
    let jishoLoadingIndicatorElement;
    let newSearchModal;

    beforeEach(() => {
        // Mock scrollIntoView as it's not implemented in JSDOM
        window.HTMLElement.prototype.scrollIntoView = jest.fn();

        document.body.innerHTML = `
            <div id="newSearchModal" class="modal">
                <div class="modal-content">
                    <span class="close-button" id="closeSearchModalBtn">&times;</span>
                    <input type="text" id="newSearchInput" placeholder="Search...">
                    <div id="newSearchSuggestions" class="suggestions-list"></div>
                    <div id="jishoLoadingIndicator" style="display: none;">Loading...</div>
                </div>
            </div>
            <button id="openSearchModalBtn">Open Search</button>
        `;

        modalElement = document.getElementById('newSearchModal');
        openButtonElement = document.getElementById('openSearchModalBtn');
        closeButtonElement = document.getElementById('closeSearchModalBtn');
        inputElement = document.getElementById('newSearchInput');
        suggestionsListElement = document.getElementById('newSearchSuggestions');
        jishoLoadingIndicatorElement = document.getElementById('jishoLoadingIndicator');

        newSearchModal = new NewSearchModal(
            modalElement,
            openButtonElement,
            closeButtonElement,
            inputElement,
            suggestionsListElement,
            jishoLoadingIndicatorElement
        );

        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('modal should open when open button is clicked', () => {
        openButtonElement.click();
        expect(modalElement.classList.contains('visible')).toBe(true);
        jest.advanceTimersByTime(50); // Wait for setTimeout in show()
        expect(document.activeElement).toBe(inputElement);
    });

    test('modal should close when close button is clicked', () => {
        openButtonElement.click();
        expect(modalElement.classList.contains('visible')).toBe(true);

        closeButtonElement.click();
        expect(modalElement.classList.contains('visible')).toBe(false);
    });

    test('modal should close when clicking outside the modal content', () => {
        openButtonElement.click();
        expect(modalElement.classList.contains('visible')).toBe(true);

        modalElement.click(); // Click on the modal overlay itself
        expect(modalElement.classList.contains('visible')).toBe(false);
    });

    test('modal should close when Escape key is pressed', () => {
        openButtonElement.click();
        expect(modalElement.classList.contains('visible')).toBe(true);

        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        window.dispatchEvent(escapeEvent);
        expect(modalElement.classList.contains('visible')).toBe(false);
    });

    test('search input should trigger getSuggestions after debounce', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2']);

        openButtonElement.click();
        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));

        expect(apiService.getSuggestions).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1000);

        // Allow promises to resolve after timers have been advanced
        await Promise.resolve();

        expect(apiService.getSuggestions).toHaveBeenCalledWith('test');
        expect(suggestionsListElement.children.length).toBe(2);
        expect(suggestionsListElement.children[0].textContent).toBe('suggestion1');
        expect(suggestionsListElement.children[1].textContent).toBe('suggestion2');
        expect(jishoLoadingIndicatorElement.style.display).toBe('none');
    });

    test('loading indicator should be shown and hidden during suggestion fetch', async () => {
        apiService.getSuggestions.mockImplementation(() => {
            return new Promise(resolve => setTimeout(() => resolve(['suggestion']), 500));
        });

        openButtonElement.click();
        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));

        jest.advanceTimersByTime(100); // Before debounce
        expect(jishoLoadingIndicatorElement.style.display).toBe('none');

        jest.advanceTimersByTime(900); // After debounce, before API call resolves
        expect(jishoLoadingIndicatorElement.style.display).toBe('block');

        jest.advanceTimersByTime(500); // After API call resolves
        // Allow the finally block's microtask to run
        await Promise.resolve();

        expect(jishoLoadingIndicatorElement.style.display).toBe('none');
    });

    test('selecting a suggestion should update input and clear suggestions', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2']);

        openButtonElement.click();
        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // Allow promises to resolve

        const firstSuggestion = suggestionsListElement.children[0];
        firstSuggestion.click();

        expect(inputElement.value).toBe('suggestion1');
        expect(suggestionsListElement.children.length).toBe(0);
        expect(suggestionsListElement.style.display).toBe('none');
    });

    test('keyboard navigation (ArrowDown) should highlight suggestions and update input', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2', 'suggestion3']);

        openButtonElement.click();
        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        // Arrow Down 1
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(suggestionsListElement.children[0].classList.contains('selected')).toBe(true);
        expect(inputElement.value).toBe('suggestion1');

        // Arrow Down 2
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(suggestionsListElement.children[1].classList.contains('selected')).toBe(true);
        expect(inputElement.value).toBe('suggestion2');

        // Arrow Down 3 (wrap around)
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(suggestionsListElement.children[2].classList.contains('selected')).toBe(true);
        expect(inputElement.value).toBe('suggestion3');

        // Arrow Down 4 (wrap around to first)
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(suggestionsListElement.children[0].classList.contains('selected')).toBe(true);
        expect(inputElement.value).toBe('suggestion1');
    });

    test('keyboard navigation (ArrowUp) should highlight suggestions and update input', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2', 'suggestion3']);

        openButtonElement.click();
        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        // Arrow Up 1 (wrap around to last)
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        expect(suggestionsListElement.children[2].classList.contains('selected')).toBe(true);
        expect(inputElement.value).toBe('suggestion3');

        // Arrow Up 2
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        expect(suggestionsListElement.children[1].classList.contains('selected')).toBe(true);
        expect(inputElement.value).toBe('suggestion2');
    });

    test('pressing Enter on a selected suggestion should trigger its click behavior', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2']);

        openButtonElement.click();
        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        const firstSuggestion = suggestionsListElement.children[0];
        const clickSpy = jest.spyOn(firstSuggestion, 'click');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); // Select first suggestion
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(clickSpy).toHaveBeenCalled();
        expect(inputElement.value).toBe('suggestion1');
        expect(suggestionsListElement.children.length).toBe(0);

        clickSpy.mockRestore();
    });

    test('pressing Enter without a selected suggestion should not trigger click behavior', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1']);

        openButtonElement.click();
        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        const firstSuggestion = suggestionsListElement.children[0];
        const clickSpy = jest.spyOn(firstSuggestion, 'click');

        inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); // No suggestion selected

        expect(clickSpy).not.toHaveBeenCalled();
        expect(inputElement.value).toBe('test'); // Input value should remain 'test'
        expect(suggestionsListElement.children.length).toBe(1); // Suggestions should still be there

        clickSpy.mockRestore();
    });

    test('clearing input should clear suggestions and hide loading indicator', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1']);

        openButtonElement.click();
        inputElement.value = 'test';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(suggestionsListElement.children.length).toBe(1);
        expect(jishoLoadingIndicatorElement.style.display).toBe('none');

        inputElement.value = '';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(suggestionsListElement.children.length).toBe(0);
        expect(suggestionsListElement.style.display).toBe('none');
        expect(jishoLoadingIndicatorElement.style.display).toBe('none');
    });

    test('error fetching suggestions should log error and hide loading indicator', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        apiService.getSuggestions.mockRejectedValueOnce(new Error('API Error'));

        openButtonElement.click();
        inputElement.value = 'error_test';
        inputElement.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(apiService.getSuggestions).toHaveBeenCalledWith('error_test');
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching suggestions:", expect.any(Error));
        expect(jishoLoadingIndicatorElement.style.display).toBe('none');
        expect(suggestionsListElement.children.length).toBe(0);

        consoleErrorSpy.mockRestore();
    });
});
