import { supabase } from './lib/supabase.js';
import { router } from './router.js';
import './components/Auth/Auth.js';
import './components/Bookmarks/Bookmarks.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initial call to handle the location on page load
    router.handleLocation();

    // Handle sign-in success
    document.addEventListener('signin-success', () => {
        router.go('bookmarks');
    });

    // Handle sign-out success
    document.addEventListener('signout-success', () => {
        router.go('');
    });

    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            router.go('bookmarks');
        } else {
            router.go('');
        }
    });

    // Handle auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            router.go('bookmarks');
        } else {
            router.go('');
        }
    });
});
