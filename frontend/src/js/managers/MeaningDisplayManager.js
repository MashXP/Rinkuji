import localStorageCacheService from '../services/localStorageCacheService.js';
import { searchWord } from '../../services/api.js';

export class MeaningDisplayManager {
    constructor(meaningBarElement) {
        this.meaningBar = meaningBarElement;
        if (!this.meaningBar) {
            console.error("Meaning bar element not found!");
        }
    }

    async showMeaning(wordSlug) {
        if (!this.meaningBar || !wordSlug) {
            return;
        }

        this.meaningBar.classList.add('visible');
        this.meaningBar.innerHTML = `<p>Loading definition for ${wordSlug}...</p>`;

        try {
            // 1. Check cache first
            const cachedData = localStorageCacheService.get(wordSlug);
            if (cachedData) {
                this.displayResult(cachedData);
                return; // Exit if data found in cache
            }

            // Use apiService.searchWord instead of fetch
            const result = await searchWord(wordSlug);

            if (result) {
                // 2. Store data in cache after successful API call
                localStorageCacheService.set(wordSlug, result);
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

        const readingsArray = result.japanese.map(jp => jp.reading).filter(Boolean);
        const uniqueReadings = [...new Set(readingsArray)];
        const readings = uniqueReadings.join('<br>');

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