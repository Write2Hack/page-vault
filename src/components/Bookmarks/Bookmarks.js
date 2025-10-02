import { supabase } from '../../lib/supabase.js';

const template = document.createElement('template');
template.innerHTML = `
<div id="bookmarks-container" class="bookmarks-container">
    <div class="header">
        <h2>My Bookmarks</h2>
        <button id="signOutBtn" class="btn btn-outline-secondary">Sign Out</button>
    </div>
    <div class="add-bookmark">
        <input type="text" id="bookmarkTitle" placeholder="Title">
        <input type="url" id="bookmarkUrl" placeholder="URL">
        <button id="addBookmarkBtn" class="btn btn-outline-success">Add Bookmark</button>
    </div>
    <div id="bookmarksList" class="bookmarks-list">
        <!-- Bookmarks will be inserted here -->
    </div>
</div>
`;

class BookmarksComponent extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.attachTemplate();
        this.initializeComponent();
    }

    attachTemplate() {
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }
        this.appendChild(template.content.cloneNode(true));
    }

    initializeComponent() {
        this.addBookmarkBtn = this.querySelector('#addBookmarkBtn');
        this.signOutBtn = this.querySelector('#signOutBtn');
        this.bookmarkTitleInput = this.querySelector('#bookmarkTitle');
        this.bookmarkUrlInput = this.querySelector('#bookmarkUrl');
        this.bookmarksList = this.querySelector('#bookmarksList');

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
