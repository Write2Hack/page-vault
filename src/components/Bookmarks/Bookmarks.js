import { supabase } from '../../lib/supabase.js';

const template = document.createElement('template');
let templateLoaded = false;
let pendingComponents = [];

fetch('src/components/Bookmarks/Bookmarks.html')
    .then(response => response.text())
    .then(html => {
        template.innerHTML = html;
        templateLoaded = true;
        pendingComponents.forEach(component => component.initializeComponent());
        pendingComponents = [];
    })
    .catch(error => {
        console.error('Error loading bookmarks component template:', error);
    });

class BookmarksComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        if (templateLoaded) {
            this.attachTemplate();
            this.initializeComponent();
        } else {
            pendingComponents.push(this);
        }
    }

    attachTemplate() {
        while (this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    initializeComponent() {
        this.addBookmarkBtn = this.shadowRoot.querySelector('#addBookmarkBtn');
        this.signOutBtn = this.shadowRoot.querySelector('#signOutBtn');
        this.bookmarkTitleInput = this.shadowRoot.querySelector('#bookmarkTitle');
        this.bookmarkUrlInput = this.shadowRoot.querySelector('#bookmarkUrl');
        this.bookmarksList = this.shadowRoot.querySelector('#bookmarksList');

        if (!this.addBookmarkBtn || !this.signOutBtn || 
            !this.bookmarkTitleInput || !this.bookmarkUrlInput || 
            !this.bookmarksList) {
            console.error('Required elements not found in bookmarks component');
            return;
        }

        this.addBookmarkBtn.addEventListener('click', () => this.addBookmark());
        this.signOutBtn.addEventListener('click', () => this.signOut());

        this.loadBookmarks();
    }

    async addBookmark() {
        const title = this.bookmarkTitleInput.value.trim();
        const url = this.bookmarkUrlInput.value.trim();

        if (!title || !url) {
            alert('Please enter both title and URL');
            return;
        }

        const { data, error } = await supabase
            .from('bookmarks')
            .insert([{ title, url }]);

        if (error) {
            alert('Error adding bookmark: ' + error.message);
        } else {
            this.bookmarkTitleInput.value = '';
            this.bookmarkUrlInput.value = '';
            this.loadBookmarks();
        }
    }

    async loadBookmarks() {
        const { data, error } = await supabase
            .from('bookmarks')
            .select('*');

        if (error) {
            alert('Error loading bookmarks: ' + error.message);
            return;
        }

        this.bookmarksList.innerHTML = '';
        data.forEach(bookmark => {
            const bookmarkElement = document.createElement('div');
            bookmarkElement.className = 'bookmark-item';
            
            const favicon = document.createElement('img');
            favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=128`;
            favicon.className = 'favicon';
            favicon.alt = '';
            
            const link = document.createElement('a');
            link.href = bookmark.url;
            link.target = '_blank';
            link.textContent = bookmark.title;
            link.addEventListener('click', () => this.incrementVisits(bookmark.id));
            
            bookmarkElement.appendChild(favicon);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => this.deleteBookmark(bookmark.id));
            
            bookmarkElement.appendChild(link);
            bookmarkElement.appendChild(deleteBtn);
            this.bookmarksList.appendChild(bookmarkElement);
        });
    }

    async deleteBookmark(id) {
        const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error deleting bookmark: ' + error.message);
        } else {
            this.loadBookmarks();
        }
    }

    async incrementVisits(id) {
        const { error } = await supabase.rpc('increment_visits', { bookmark_id: id });

        if (error) {
            console.error('Error incrementing visits:', error.message);
        }
    }

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            alert('Error signing out: ' + error.message);
        } else {
            // Successful sign-out, dispatch an event
            this.dispatchEvent(new CustomEvent('signout-success', { bubbles: true, composed: true }));
        }
    }
}

customElements.define('bookmarks-component', BookmarksComponent);
