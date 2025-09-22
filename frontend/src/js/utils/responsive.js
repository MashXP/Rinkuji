
export function initializeResponsiveLayout() {
    const checkViewport = () => {
        if (window.innerWidth < 768) {
            document.body.classList.add('mobile-layout');
        } else {
            document.body.classList.remove('mobile-layout');
        }
    };

    window.addEventListener('resize', checkViewport);
    // Initial check
    checkViewport();
}
