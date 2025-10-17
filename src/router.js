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

const routes = {
  '/share-target': async () => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url');
    const sharedTitle = params.get('title');
    
    if (sharedUrl) {
      // Navigate to bookmarks and trigger save
      window.location.href = '/#/bookmarks?share=' + encodeURIComponent(JSON.stringify({
        url: sharedUrl,
        title: sharedTitle || sharedUrl
      }));
    }
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
