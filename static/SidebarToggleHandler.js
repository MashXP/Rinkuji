export class SidebarToggleHandler {
    /**
     * @param {HTMLElement} sidebarToggleBtn - The button that toggles the sidebar.
     * @param {HTMLElement} parentKanjiSidebar - The sidebar element itself.
     */
    constructor(sidebarToggleBtn, parentKanjiSidebar) {
        this.sidebarToggleBtn = sidebarToggleBtn;
        this.parentKanjiSidebar = parentKanjiSidebar;

        this.addEventListeners();
    }

    addEventListeners() {
        this.sidebarToggleBtn.addEventListener('click', () => {
            this.parentKanjiSidebar.classList.toggle('visible');
            this.sidebarToggleBtn.classList.toggle('active');

            // Change icon and title based on active state for better UX
            if (this.sidebarToggleBtn.classList.contains('active')) {
                this.sidebarToggleBtn.textContent = '✕';
                this.sidebarToggleBtn.title = 'Close Kanji List';
            } else {
                this.sidebarToggleBtn.textContent = '☰';
                this.sidebarToggleBtn.title = 'Toggle Kanji List';
            }
        });
    }
}