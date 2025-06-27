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
        const word = result.slug;

        // Get unique readings and join with a line break
        const readingsArray = result.japanese.map(jp => jp.reading).filter(Boolean);
        const uniqueReadings = [...new Set(readingsArray)];
        const readings = uniqueReadings.join('<br>');

        // Get all senses, prepend a bullet, and join with a line break
        const meanings = result.senses.map(sense => '&bull; ' + sense.english_definitions.join(', ')).join('<br>');

        this.meaningBar.innerHTML = `
            <div class="meaning-content">
                <span class="meaning-word">${word}</span>
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