import localStorageCacheService from '../services/localStorageCacheService.js';
import { searchWord } from '../../services/api.js';

export class MeaningDisplayManager {
    constructor(meaningBarElement) {
        this.meaningBar = meaningBarElement;
        if (!this.meaningBar) {
            console.error("Meaning bar element not found!");
        }
    }

    async showMeaning(wordSlug, consolidatedData = null) {
        if (!this.meaningBar || !wordSlug) {
            return;
        }

        this.meaningBar.classList.add('visible');

        if (consolidatedData && consolidatedData.is_consolidated) {
            this.displayConsolidatedMeaning(wordSlug, consolidatedData);
            return;
        }

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

    displayConsolidatedMeaning(word, consolidatedData) {
        const MAX_MEANINGS_TO_DISPLAY = 3;
        const members = consolidatedData.consolidated_members;
        const membersToDisplay = members.slice(0, MAX_MEANINGS_TO_DISPLAY);

        const meaningButtons = membersToDisplay.map((_, index) => {
            const activeClass = index === 0 ? ' active' : '';
            return `<button class="meaning-button${activeClass}" data-member-index="${index}">${index + 1}</button>`;
        }).join('');

        let moreButton = '';
        if (members.length > MAX_MEANINGS_TO_DISPLAY) {
            moreButton = `<a href="https://jisho.org/search/${encodeURIComponent(word)}" target="_blank" rel="noopener noreferrer" class="meaning-button">...</a>`;
        }

        // Initial display based on the first member
        const firstMember = members[0];
        const initialReadings = [...new Set(firstMember.japanese.map(jp => jp.reading).filter(Boolean))].join('<br>');
        const initialMeanings = firstMember.senses.slice(0, 3).map(sense => '• ' + sense.english_definitions.join(', ')).join('<br>');
        this.meaningBar.classList.add('visible');

        this.meaningBar.innerHTML = `
            <div class="meaning-content">
                <div class="meaning-buttons">${meaningButtons}${moreButton}</div>
                <span class="meaning-word">${word}</span>
                <span class="meaning-reading">${initialReadings}</span>
                <span class="meaning-definition">${initialMeanings}</span>
            </div>
        `;

        const allMeaningButtons = this.meaningBar.querySelectorAll('.meaning-button[data-member-index]');
        allMeaningButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const clickedButton = e.target;
                const memberIndex = clickedButton.dataset.memberIndex;
                if (memberIndex) {
                    // Remove 'active' from all buttons and add it to the clicked one
                    allMeaningButtons.forEach(btn => btn.classList.remove('active'));
                    clickedButton.classList.add('active');

                    // Update the content
                    const selectedMember = members[parseInt(memberIndex, 10)];
                    const readings = [...new Set(selectedMember.japanese.map(jp => jp.reading).filter(Boolean))].join('<br>');
                    const meanings = selectedMember.senses.slice(0, 3).map(sense => '• ' + sense.english_definitions.join(', ')).join('<br>');

                    this.meaningBar.querySelector('.meaning-reading').innerHTML = readings;
                    this.meaningBar.querySelector('.meaning-definition').innerHTML = meanings;
                }
            });
        });
    }

    hideMeaning() {
        if (!this.meaningBar) return;
        this.meaningBar.classList.remove('visible');
    }
}