import { fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
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
        apiService.getSuggestions.mockResolvedValue([]); // Default mock
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        document.body.innerHTML = '';
    });

    test('modal should open when open button is clicked and focus input', () => {
        fireEvent.click(openButtonElement);
        expect(modalElement).toHaveClass('visible');
        jest.advanceTimersByTime(50); // Wait for setTimeout in show()
        expect(inputElement).toHaveFocus();
    });

    test('modal should close when close button is clicked', () => {
        fireEvent.click(openButtonElement);
        expect(modalElement).toHaveClass('visible');
        fireEvent.click(closeButtonElement);
        expect(modalElement).not.toHaveClass('visible');
    });

    test('modal should close when clicking outside the modal content', () => {
        fireEvent.click(openButtonElement);
        expect(modalElement).toHaveClass('visible');
        fireEvent.click(modalElement); // Click on the modal overlay itself
        expect(modalElement).not.toHaveClass('visible');
    });

    test('modal should close when Escape key is pressed', () => {
        fireEvent.click(openButtonElement);
        expect(modalElement).toHaveClass('visible');
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(modalElement).not.toHaveClass('visible');
    });

    test('search input should trigger getSuggestions after debounce', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2']);

        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'test' } });
            expect(apiService.getSuggestions).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Flush promises
        });

        expect(apiService.getSuggestions).toHaveBeenCalledWith('test');
        expect(suggestionsListElement).toHaveTextContent('suggestion1');
        expect(suggestionsListElement).toHaveTextContent('suggestion2');
        expect(jishoLoadingIndicatorElement).not.toBeVisible();
    });

    test('loading indicator should be shown and hidden during suggestion fetch', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        apiService.getSuggestions.mockReturnValue(promise);

        fireEvent.click(openButtonElement);

        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'test' } });
            jest.advanceTimersByTime(1000); // Trigger debounce to call handleInput
        });

        // The indicator should now be visible as handleInput is awaiting the promise
        expect(jishoLoadingIndicatorElement).toBeVisible();

        await act(async () => {
            resolvePromise(['suggestion']); // Manually resolve the promise
            await promise; // Wait for the promise to resolve and for the .finally() block to run
        });

        expect(jishoLoadingIndicatorElement).not.toBeVisible();
    });

    test('"No results found" should be displayed for empty suggestion list with a query', async () => {
        apiService.getSuggestions.mockResolvedValueOnce([]);

        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'noresults' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(apiService.getSuggestions).toHaveBeenCalledWith('noresults');
        expect(suggestionsListElement).toHaveTextContent('No results found');
    });

    test('selecting a suggestion should update input, clear suggestions, and dispatch events', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2']);

        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'test' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        const firstSuggestion = suggestionsListElement.children[0];
        const changeSpy = jest.spyOn(inputElement, 'dispatchEvent');
        const keydownSpy = jest.spyOn(inputElement, 'dispatchEvent');

        fireEvent.click(firstSuggestion);

        expect(inputElement).toHaveValue('suggestion1');
        expect(suggestionsListElement).toBeEmptyDOMElement();
        expect(changeSpy).toHaveBeenCalledWith(expect.any(Event));
        expect(keydownSpy).toHaveBeenCalledWith(expect.any(KeyboardEvent));
    });

    test('keyboard navigation (ArrowDown) should highlight suggestions and update input', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2', 'suggestion3']);

        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'test' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        // Arrow Down 1
        fireEvent.keyDown(inputElement, { key: 'ArrowDown' });
        expect(suggestionsListElement.children[0]).toHaveClass('selected');
        expect(inputElement).toHaveValue('suggestion1');

        // Arrow Down 2
        fireEvent.keyDown(inputElement, { key: 'ArrowDown' });
        expect(suggestionsListElement.children[1]).toHaveClass('selected');
        expect(inputElement).toHaveValue('suggestion2');

        // Arrow Down 3 (wrap around)
        fireEvent.keyDown(inputElement, { key: 'ArrowDown' });
        expect(suggestionsListElement.children[2]).toHaveClass('selected');
        expect(inputElement).toHaveValue('suggestion3');

        // Arrow Down 4 (wrap around to first)
        fireEvent.keyDown(inputElement, { key: 'ArrowDown' });
        expect(suggestionsListElement.children[0]).toHaveClass('selected');
        expect(inputElement).toHaveValue('suggestion1');
    });

    test('keyboard navigation (ArrowUp) should highlight suggestions and update input', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2', 'suggestion3']);

        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'test' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        // Arrow Up 1 (wrap around to last)
        fireEvent.keyDown(inputElement, { key: 'ArrowUp' });
        expect(suggestionsListElement.children[2]).toHaveClass('selected');
        expect(inputElement).toHaveValue('suggestion3');

        // Arrow Up 2
        fireEvent.keyDown(inputElement, { key: 'ArrowUp' });
        expect(suggestionsListElement.children[1]).toHaveClass('selected');
        expect(inputElement).toHaveValue('suggestion2');
    });

    test('pressing Enter on a selected suggestion should trigger its click behavior', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1', 'suggestion2']);

        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'test' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        const firstSuggestion = suggestionsListElement.children[0];
        const clickSpy = jest.spyOn(firstSuggestion, 'click');

        fireEvent.keyDown(inputElement, { key: 'ArrowDown' }); // Select first suggestion
        fireEvent.keyDown(inputElement, { key: 'Enter' });

        expect(clickSpy).toHaveBeenCalled();
        expect(inputElement).toHaveValue('suggestion1');
        expect(suggestionsListElement).toBeEmptyDOMElement();

        clickSpy.mockRestore();
    });

    test('pressing Enter without a selected suggestion should not trigger click behavior', async () => {
        apiService.getSuggestions.mockResolvedValueOnce(['suggestion1']);

        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'test' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        const firstSuggestion = suggestionsListElement.children[0];
        const clickSpy = jest.spyOn(firstSuggestion, 'click');

        fireEvent.keyDown(inputElement, { key: 'Enter' }); // No suggestion selected

        expect(clickSpy).not.toHaveBeenCalled();
        expect(inputElement).toHaveValue('test'); // Input value should remain 'test'
        expect(suggestionsListElement.children.length).toBe(1); // Suggestions should still be there

        clickSpy.mockRestore();
    });

    test('clearing input should clear suggestions and hide loading indicator', async () => {
        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'test' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        await act(async () => {
            fireEvent.input(inputElement, { target: { value: '' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(suggestionsListElement).toBeEmptyDOMElement();
        expect(jishoLoadingIndicatorElement).not.toBeVisible();
    });

    test('error fetching suggestions should log error and hide loading indicator', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        apiService.getSuggestions.mockRejectedValueOnce(new Error('API Error'));

        fireEvent.click(openButtonElement);
        await act(async () => {
            fireEvent.input(inputElement, { target: { value: 'error_test' } });
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(apiService.getSuggestions).toHaveBeenCalledWith('error_test');
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching suggestions:", expect.any(Error));
        expect(jishoLoadingIndicatorElement).not.toBeVisible();
        expect(suggestionsListElement).toBeEmptyDOMElement();

        consoleErrorSpy.mockRestore();
    });
});
