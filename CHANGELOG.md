# Changelog

## [1.0.4] - 2025-09-24
#### Added
- **Consolidated Kanji View**: Implemented a consolidated view for kanjis with multiple entries from Jisho.
- **Meaning Buttons**: Added toggleable number buttons to the meaning bar for consolidated kanjis, allowing users to switch between different readings.
#### Changed
- **Jisho Service**: Modified the backend `JishoService` to correctly consolidate kanji entries based on base slugs and include all readings and meanings.
- **Graph Display**: Updated the frontend `RinkuGraph` component to correctly identify and display consolidated kanji nodes.
- **Meaning Display**: Enhanced the `MeaningDisplayManager` to display readings and handle the new button-based meaning selection for consolidated kanjis.

## [1.0.3] - 2025-09-22
#### Changed
- **Search**: Enhanced suggestion retrieval to be case-insensitive and to search across more data fields for more comprehensive results.
- **Search**: Improved Jisho API fetching to filter for relevant Japanese words containing Kanji.
- **UI**: Integrated the new logo on the About page and favicon on the main page.
#### Added
- **Changelog**: Implemented a dynamic changelog page that fetches and displays version history from GitHub via a new API endpoint.
- **UI**: The latest version number is now displayed on the main page and links to the changelog.
- **Branding**: Added application logo and favicon.
- **UI**: Added a styled "No results found" message to the search suggestions list for better user feedback.
- **Tests**: Added frontend tests for the new changelog functionality.

## [1.0.2] - 2025-09-22
#### Changed
- **Test Coverage**: Increased backend and frontend test coverage.

## [1.0.1] - 2025-09-22
#### Added
- **Mobile Responsiveness**: Make the application usable on mobile devices.

## [1.0.0 - RELEASE] - 2025-09-19
#### Added
- **Frontend Tests**: Implemented comprehensive unit and integration tests for frontend components (main.js, UITogglingManager.js, api.js, etc.).
#### Changed
- **README Update**: Updated README.md with instructions for running frontend and backend tests.
- **Backend Deployment Prep**: Added gunicorn to backend requirements, created Procfile, and moved data.json for Render.com deployment.

### 2025-09-18
#### Added
- **Cache Feature**: Implemented local storage caching for meaning retrieval and added clear cache functionality.
- **Suggestion Handling Enhancements**: Enhanced suggestion handling with keyboard navigation and selection highlighting.
- **Search Suggestions API and Frontend Handling**: Added search suggestions API and implemented frontend suggestions handling.
- **Automatic Search Modal Display**: Implemented automatic display of the search modal if no word is specified.
- **About Page Sections**: Added acknowledgements and future enhancements sections to the About page.
- **Initial Backend and Frontend Scaffold**: Scaffolded backend and frontend for core features.
- **Color Customization Options**: Added color customization options to OptionsMenu, including color presets and input fields for background, highlight, and text colors.
#### Changed
- **About Page Updates**: Revised usage instructions and enhanced data source attribution on the About page.
- **Backend Refactoring and Tests**: Refactored backend and implemented tests.
- **Project Structure Refactoring**: Refactored the structure of the project for more professional settings.
- **Packing Conda Environment Dependencies**: Packed conda environment dependencies.

### 2025-07-08
#### Added
- **Rerandomize Functionality**: Added rerandomize functionality to context menu and updated related components; limited displayed senses and enhanced randomization logic.

### 2025-07-07
#### Added
- **Rinku Visualization Refactor**: Refactored main page to serve Rinku visualization; implemented New Search modal and updated styles.
- **Footer Enhancements**: Enhanced footer layout and added scroll-to-top functionality; updated About and Index pages with Font Awesome icons.

### 2025-06-28
#### Added
- **UI Toggling Centralization**: Centralized UI Toggling along with Modal placeholder.
- **About Page UI**: Implemented About page, changed index html, and added hidable new search and about button.
#### Changed
- **Styling Refactoring**: Split and categorized `style.css`.
- **Hide Styling**: Styled the hide functionality.

### 2025-06-27
#### Added
- **Sidebar Logic Fix**: Fixed sidebar logic.
- **Jisho Search Link**: Added Jisho search link.
- **Meaning Bar**: Implemented Meaning Bar functionality.
- **Node Perfecting and Sidebar**: Perfected nodes and added sidebar.
- **Nodes Implementation**: Implemented nodes functionality.

### 2025-06-26
#### Added
- **Interactive Zoom**: Implemented interactive zoom.
- **Init Commit - Jisho API Test**: Initial commit with Jisho API test.