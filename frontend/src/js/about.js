function setChangelogError(container) {
    container.innerHTML = '<p>Could not load changelog.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
    const changelogContainer = document.getElementById('changelog-container');

    if (changelogContainer) {
        fetch('/api/changelog')
            .then(response => response.json())
            .then(data => {
                if (data.changelog) {
                    const changelogMarkdown = data.changelog;
                    const entries = parseChangelog(changelogMarkdown);

                    if (entries.length > 0) {
                        renderChangelog(entries, changelogContainer);
                    } else {
                        changelogContainer.innerHTML = '<p>No changelog entries found.</p>';
                    }
                } else {
                    setChangelogError(changelogContainer);
                }
            })
            .catch(error => {
                console.error('Error fetching changelog:', error);
                setChangelogError(changelogContainer);
            });
    }
});

function parseChangelog(markdown) {
    const entries = [];
    // Split by '## ' to get individual version sections
    const sections = markdown.split(/(?=^## )/m); // Lookahead to keep the '## ' in the split result

    // The first section is usually the main title, skip it
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (section.startsWith('## ')) {
            const lines = section.split('\n');
            const titleLine = lines[0];
            const versionMatch = titleLine.match(/^##\s*(.+)/);
            if (versionMatch) {
                const versionTitle = versionMatch[1].trim();
                const content = lines.slice(1).join('\n').trim();
                entries.push({ title: versionTitle, markdown: content });
            }
        }
    }
    return entries;
}

function renderChangelog(entries, container) {
    // Create select element for versions
    const selectElement = document.createElement('select');
    selectElement.id = 'changelog-version-select';
    selectElement.classList.add('changelog-version-select'); // Add a class for styling

    entries.forEach((entry, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = entry.title;
        selectElement.appendChild(option);
    });

    // Display area for the changelog content
    const contentDisplay = document.createElement('div');
    contentDisplay.id = 'changelog-content-display';
    contentDisplay.classList.add('changelog-content-display'); // Add a class for styling

    // Pre-select the latest version (first in the array if sorted by latest first)
    selectElement.value = 0;
    contentDisplay.innerHTML = marked.parse(entries[0].markdown);

    // Add event listener for selection change
    selectElement.addEventListener('change', (event) => {
        // Re-fetch the content display element inside the handler to be more robust.
        const contentDisplay = document.getElementById('changelog-content-display');
        if (!contentDisplay) return; // Guard clause if the element is missing.

        const selectedIndex = parseInt(event.target.value);
        contentDisplay.innerHTML = marked.parse(entries[selectedIndex].markdown);
    });

    // Clear existing content and append new elements
    container.innerHTML = '';
    container.appendChild(selectElement);
    container.appendChild(contentDisplay);
}
