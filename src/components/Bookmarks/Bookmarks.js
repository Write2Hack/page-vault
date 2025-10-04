import { supabase } from '../../lib/supabase.js';

const template = document.createElement('template');
template.innerHTML = `
<div id="bookmarks-container" class="container py-4">
    <div class="row mb-4">
        <div class="col d-flex justify-content-between align-items-center">
            <h2>My Bookmarks</h2>
            <button id="signOutBtn" class="btn btn-outline-secondary">Sign Out</button>
        </div>
    </div>
    
    <div class="row mb-4">
        <div class="col">
            <div class="card">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <input type="text" id="bookmarkTitle" class="form-control" placeholder="Title">
                        </div>
                        <div class="col-md-4">
                            <input type="url" id="bookmarkUrl" class="form-control" placeholder="URL">
                        </div>
                        <div class="col-md-3">
                            <input type="text" id="bookmarkTags" class="form-control" placeholder="Tags (comma separated)">
                        </div>
                        <div class="col-md-1">
                            <button id="addBookmarkBtn" class="btn btn-success w-100">Add</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="bookmarksList" class="row row-cols-1 row-cols-md-2 g-4">
        <!-- Tag groups will be inserted here -->
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
        this.bookmarkTagsInput = this.querySelector('#bookmarkTags');
        this.bookmarksList = this.querySelector('#bookmarksList');

        if (!this.addBookmarkBtn || !this.signOutBtn || 
            !this.bookmarkTitleInput || !this.bookmarkUrlInput || 
            !this.bookmarkTagsInput || !this.bookmarksList) {
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
        const tagNames = this.bookmarkTagsInput.value
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag);

        if (!title || !url) {
            alert('Please enter both title and URL');
            return;
        }

        // First, insert the bookmark
        const { data: bookmarkData, error: bookmarkError } = await supabase
            .from('bookmarks')
            .insert([{ title, url }])
            .select();

        if (bookmarkError) {
            alert('Error adding bookmark: ' + bookmarkError.message);
            return;
        }

        const bookmarkId = bookmarkData[0].id;

        // Handle tags and relationships
        for (const tagName of tagNames) {
            // Check if tag exists or create it
            let { data: existingTags } = await supabase
                .from('tags')
                .select('id')
                .eq('name', tagName);

            let tagId;
            if (!existingTags || existingTags.length === 0) {
                const { data: newTag, error: tagError } = await supabase
                    .from('tags')
                    .insert([{ name: tagName }])
                    .select();

                if (tagError) {
                    console.error('Error creating tag:', tagError);
                    continue;
                }
                tagId = newTag[0].id;
            } else {
                tagId = existingTags[0].id;
            }

            // Create relationship in folders table
            const { error: folderError } = await supabase
                .from('folders')
                .insert([{
                    bookmark_id: bookmarkId,
                    tag_id: tagId
                }]);

            if (folderError) {
                console.error('Error creating folder relationship:', folderError);
            }
        }

        // Clear inputs and reload
        this.bookmarkTitleInput.value = '';
        this.bookmarkUrlInput.value = '';
        this.bookmarkTagsInput.value = '';
        this.loadBookmarks();
    }

    async loadBookmarks() {
        // Get bookmarks with their tags
        const { data, error } = await supabase
            .from('bookmarks')
            .select(`
                *,
                folders:folders(
                    tags:tags(id, name)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            alert('Error loading bookmarks: ' + error.message);
            return;
        }

        // Group bookmarks by tags
        const bookmarksByTag = {};
        data.forEach(bookmark => {
            const tags = bookmark.folders
                .map(folder => folder.tags.name)
                .filter(tag => tag);

            // If no tags, put in untagged
            if (tags.length === 0) {
                if (!bookmarksByTag['untagged']) {
                    bookmarksByTag['untagged'] = [];
                }
                bookmarksByTag['untagged'].push(bookmark);
            } else {
                // Add bookmark to each of its tag groups
                tags.forEach(tag => {
                    if (!bookmarksByTag[tag]) {
                        bookmarksByTag[tag] = [];
                    }
                    bookmarksByTag[tag].push(bookmark);
                });
            }
        });

        this.bookmarksList.innerHTML = '';
        Object.entries(bookmarksByTag).forEach(([tag, bookmarks]) => {
            const tagCard = document.createElement('div');
            tagCard.className = 'col';
            tagCard.innerHTML = `
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0 text-capitalize">${tag}</h5>
                        <button class="btn btn-link btn-sm view-all-btn">View All</button>
                    </div>
                    <div class="card-body">
                        <div class="bookmark-list"></div>
                    </div>
                </div>
            `;

            const bookmarkList = tagCard.querySelector('.bookmark-list');
            const displayedBookmarks = bookmarks.slice(0, 5);
            
            displayedBookmarks.forEach(bookmark => {
                const bookmarkItem = document.createElement('div');
                bookmarkItem.className = 'd-flex align-items-center mb-2';
                bookmarkItem.innerHTML = `
                    <img src="https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=128" 
                         class="favicon me-2" alt="">
                    <a href="${bookmark.url}" class="flex-grow-1 text-truncate" target="_blank">${bookmark.title}</a>
                    <button class="btn btn-outline-danger btn-sm ms-2 delete-btn">×</button>
                `;

                const link = bookmarkItem.querySelector('a');
                link.addEventListener('click', () => this.incrementVisits(bookmark.id));

                const deleteBtn = bookmarkItem.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', () => this.deleteBookmark(bookmark.id));

                bookmarkList.appendChild(bookmarkItem);
            });

            const viewAllBtn = tagCard.querySelector('.view-all-btn');
            viewAllBtn.addEventListener('click', () => this.showAllBookmarks(tag, bookmarks));

            this.bookmarksList.appendChild(tagCard);
        });
    }

    showAllBookmarks(tag, bookmarks) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title text-capitalize">${tag}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="list-group">
                            ${bookmarks.map(bookmark => `
                                <div class="list-group-item d-flex align-items-center">
                                    <img src="https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=128" 
                                         class="favicon me-2" alt="">
                                    <a href="${bookmark.url}" class="flex-grow-1" target="_blank">${bookmark.title}</a>
                                    <button class="btn btn-outline-danger btn-sm ms-2 delete-btn">Delete</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        const deleteButtons = modal.querySelectorAll('.delete-btn');
        deleteButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.deleteBookmark(bookmarks[index].id);
                modalInstance.hide();
            });
        });

        const links = modal.querySelectorAll('a');
        links.forEach((link, index) => {
            link.addEventListener('click', () => this.incrementVisits(bookmarks[index].id));
        });
    }

    async deleteBookmark(id) {
        // First delete folder relationships
        const { error: folderError } = await supabase
            .from('folders')
            .delete()
            .eq('bookmark_id', id);

        if (folderError) {
            console.error('Error deleting folder relationships:', folderError);
        }

        // Then delete the bookmark
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
