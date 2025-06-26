document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const searchForm = document.getElementById('searchForm');
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'suggestionsContainer';
    searchInput.parentNode.insertBefore(suggestionsContainer, searchInput.nextSibling);

    // Rinku Start elements
    const rinkuStartContainer = document.getElementById('rinkuStartContainer');
    const rinkuStartButton = document.getElementById('rinkuStartButton');
    let selectedWord = null;

    let debounceTimer;

    const fetchResults = async (queryOverride) => {
        const query = queryOverride || searchInput.value.trim();
        if (!query) {
            resultsContainer.innerHTML = '<p class="no-results-message">Please enter a word or Kanji to search.</p>';
            return;
        }

        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
        searchInput.value = query;

        resultsContainer.innerHTML = '<p class="no-results-message">Searching...</p>';

        try {
            // Make a request to our backend endpoint for general word search
            const response = await fetch(`/search_words?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            displayResults(data.data); // Jisho API returns results in a 'data' array

        } catch (error) {
            console.error('Error fetching dictionary data:', error);
            resultsContainer.innerHTML = '<p class="no-results-message" style="color: red;">Failed to fetch results. Please try again later.</p>';
        }
    };

    const displayResults = (results) => {
        resultsContainer.innerHTML = ''; // Clear previous results
        rinkuStartContainer.style.display = 'none'; // Hide Rinku button on new search
        selectedWord = null;

        if (results && results.length > 0) {
            results.forEach(item => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('result-item');
                resultItem.dataset.word = item.slug; // Store word in data attribute

                // Add click listener for selection
                resultItem.addEventListener('click', () => {
                    // Clear previous selection
                    const currentlySelected = resultsContainer.querySelector('.result-item.selected');
                    if (currentlySelected) {
                        currentlySelected.classList.remove('selected');
                    }
                    // Select new item
                    resultItem.classList.add('selected');
                    selectedWord = resultItem.dataset.word;
                    rinkuStartContainer.style.display = 'block';
                });

                // Display the main word/kanji
                const word = item.slug;
                const wordElement = document.createElement('h2');
                wordElement.textContent = word;
                resultItem.appendChild(wordElement);

                // Display readings (kana)
                if (item.japanese && item.japanese.length > 0) {
                    const readings = item.japanese.map(jp => {
                        if (jp.word && jp.reading) {
                            return `${jp.word} (${jp.reading})`;
                        } else if (jp.reading) {
                            return jp.reading;
                        } else if (jp.word) {
                            return jp.word;
                        }
                        return '';
                    }).filter(Boolean).join('; ');
                    const readingElement = document.createElement('p');
                    readingElement.classList.add('reading');
                    readingElement.textContent = `Readings: ${readings}`;
                    resultItem.appendChild(readingElement);
                }

                // Display meanings
                if (item.senses && item.senses.length > 0) {
                    const meanings = item.senses.map(sense => sense.english_definitions.join(', ')).join('; ');
                    const meaningElement = document.createElement('p');
                    meaningElement.classList.add('meaning');
                    meaningElement.textContent = `Meanings: ${meanings}`;
                    resultItem.appendChild(meaningElement);
                }

                resultsContainer.appendChild(resultItem);
            });
        } else {
            resultsContainer.innerHTML = '<p class="no-results-message">No results found for your search.</p>';
        }
    };

    const fetchSuggestions = async () => {
        const query = searchInput.value.trim();
        if (query.length < 1) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/search_words?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                console.error(`Suggestion fetch failed: ${response.status}`);
                return;
            }
            const data = await response.json();
            displaySuggestions(data.data);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    };

    const displaySuggestions = (results) => {
        suggestionsContainer.innerHTML = '';
        if (results && results.length > 0) {
            results.slice(0, 5).forEach(item => {
                const suggestionItem = document.createElement('div');
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.textContent = item.slug;
                suggestionItem.addEventListener('click', () => {
                    fetchResults(item.slug);
                });
                suggestionsContainer.appendChild(suggestionItem);
            });
            suggestionsContainer.style.display = 'block';

            // Dynamically set width and position to align with the search input
            const inputRect = searchInput.getBoundingClientRect();
            const searchBarRect = searchInput.parentNode.getBoundingClientRect(); // Get rect of .search-bar

            suggestionsContainer.style.width = `${inputRect.width}px`;
            // Calculate top and left relative to the *positioned parent* (.search-bar)
            const topOffset = (inputRect.top - searchBarRect.top) + inputRect.height + 5; // Input's top + Input's height + small gap
            const leftOffset = inputRect.left - searchBarRect.left; // Input's left relative to search-bar's left

            suggestionsContainer.style.top = `${topOffset}px`;
            suggestionsContainer.style.left = `${leftOffset}px`;
        } else {
            suggestionsContainer.style.display = 'none';
        }
    };

    // Event Listeners
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent page reload on form submission
        fetchResults();
    });

    rinkuStartButton.addEventListener('click', () => {
        if (selectedWord) {
            window.location.href = `/rinku?word=${encodeURIComponent(selectedWord)}`;
        }
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchSuggestions, 300);
    });

    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });
});