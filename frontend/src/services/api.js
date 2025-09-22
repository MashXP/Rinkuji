// This service will communicate with the backend API.

// Function to fetch suggestions from our backend (which queries data.json)
export async function getLocalSuggestions(query) {
    if (!query) {
        return [];
    }
    try {
        const response = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch local suggestions:", error);
        return [];
    }
}

// Function to search words via Jisho proxy
export async function searchJishoWords(query) {
    if (!query) {
        return [];
    }
    try {
        const response = await fetch(`/search_words?query=${encodeURIComponent(query.toLowerCase())}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Extract relevant terms for suggestions
        return data.data ? data.data.map(item => item.slug) : [];
    } catch (error) {
        console.error("Failed to fetch Jisho words:", error);
        return [];
    }
}

// Function to search kanji via Jisho proxy
export async function searchJishoKanji(query) {
    if (!query) {
        return [];
    }
    try {
        const response = await fetch(`/search_by_kanji?kanji=${encodeURIComponent(query.toLowerCase())}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Extract relevant terms for suggestions
        return data.data ? data.data.map(item => item.character) : [];
    } catch (error) {
        console.error("Failed to fetch Jisho kanji:", error);
        return [];
    }
}

// Unified function to get all suggestions (local and Jisho)
export async function getSuggestions(query) {
    if (!query) {
        return [];
    }

    const allSuggestions = new Set();

    // Get suggestions from local data.json
    const local = await getLocalSuggestions(query);
    local.forEach(s => allSuggestions.add(s));

    // Get suggestions from Jisho words
    const jishoWords = await searchJishoWords(query);
    jishoWords.forEach(s => allSuggestions.add(s));

    // Conditionally get suggestions from Jisho kanji if the query is a single character
    if (query.length === 1) {
        const jishoKanji = await searchJishoKanji(query);
        jishoKanji.forEach(s => allSuggestions.add(s));
    }

    return Array.from(allSuggestions);
}

export async function getGraphData(word) {
    if (!word) {
        console.error("getGraphData: 'word' parameter is required.");
        return null;
    }
    try {
        const response = await fetch(`/api/graph?word=${encodeURIComponent(word)}`);
        if (!response.ok) {
            // If the word is not found, the server should return a 404.
            if (response.status === 404) {
                console.warn(`Word "${word}" not found in the database.`);
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch graph data:", error);
        return null;
    }
}

export async function searchWord(wordSlug) {
    if (!wordSlug) {
        return null;
    }
    try {
        const response = await fetch(`/search_words?query=${encodeURIComponent(wordSlug)}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        // Find the exact match for the slug
        const result = data.data ? data.data.find(item => item.slug === wordSlug) : null;
        return result;
    } catch (error) {
        console.error(`Failed to fetch word '${wordSlug}':`, error);
        return null;
    }
}