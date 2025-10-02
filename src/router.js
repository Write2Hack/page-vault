export const router = {
    handleLocation: () => {
        const hash = window.location.hash || '#/';
        const path = hash.slice(1); // Remove the # symbol
        const appContainer = document.getElementById('app');

        // Clear the container
        appContainer.innerHTML = '';

        if (path === 'bookmarks') {
            const bookmarksComponent = document.createElement('bookmarks-component');
            appContainer.appendChild(bookmarksComponent);
        } else {
            const authComponent = document.createElement('auth-component');
            appContainer.appendChild(authComponent);
        }
    },

    go: (path) => {
        window.location.hash = path;
    }
};

// Handle initial load
window.addEventListener('load', () => {
    router.handleLocation();
});

// Handle browser back/forward navigation
window.addEventListener('hashchange', () => {
    router.handleLocation();
});
