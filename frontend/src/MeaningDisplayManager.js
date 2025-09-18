// d:/Rinkuji/static/MeaningDisplayManager.js
export class MeaningDisplayManager {
    constructor(meaningBarElement) {
        this.meaningBar = meaningBarElement;
        if (!this.meaningBar) {
            console.error("Meaning bar element not found!");
        }
    }

    async showMeaning(wordSlug) {
        if (!this.meaningBar || !wordSlug) return;

        this.meaningBar.classList.add('visible');
        this.meaningBar.innerHTML = `<p>Loading definition for ${wordSlug}...</p>`;

        try {
            const response = await fetch(`/search_words?query=${encodeURIComponent(wordSlug)}`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const data = await response.json();
            const result = data.data.find(item => item.slug === wordSlug);

            if (result) {
                this.displayResult(result);
            } else {
                this.meaningBar.innerHTML = `<p>No definition found for ${wordSlug}.</p>`;
            }
        } catch (error) {
            console.error('Failed to fetch meaning:', error);
            this.meaningBar.innerHTML = `<p>Error loading definition for ${wordSlug}.</p>`;
        }
    }

    displayResult(result) {
        const MAX_SENSES_TO_DISPLAY = 3;
        const word = result.slug;

        // Get unique readings and join with a line break
        const readingsArray = result.japanese.map(jp => jp.reading).filter(Boolean);
        const uniqueReadings = [...new Set(readingsArray)];
        const readings = uniqueReadings.join('<br>');

        // Get up to 3 senses, prepend a bullet, and join with a line break
        const sensesToDisplay = result.senses.slice(0, MAX_SENSES_TO_DISPLAY);
        const meanings = sensesToDisplay.map(sense => '&bull; ' + sense.english_definitions.join(', ')).join('<br>');

        this.meaningBar.innerHTML = `
            <div class="meaning-content">
                <a href="https://jisho.org/search/${encodeURIComponent(word)}" target="_blank" rel="noopener noreferrer" class="meaning-word jisho-link">${word}</a>
                <span class="meaning-reading">${readings}</span>
                <span class="meaning-definition">${meanings}</span>
            </div>
        `;
    }

    hideMeaning() {
        if (!this.meaningBar) return;
        this.meaningBar.classList.remove('visible');
    }
}