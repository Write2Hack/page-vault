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
                        <div class="col-12 col-md-8">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <input type="text" id="bookmarkTitle" class="form-control" placeholder="Title">
                                </div>
                                <div class="col-md-6">
                                    <input type="url" id="bookmarkUrl" class="form-control" placeholder="URL">
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-md-4 d-flex align-items-start justify-content-end">
                            <button id="addBookmarkBtn" class="btn btn-success">Add Bookmark</button>
                        </div>
                        <div class="col-12">
                            <div id="tagButtons" class="d-flex gap-2 flex-wrap">
                                <!-- Tag buttons will be inserted here -->
                            </div>
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
        this.selectedTags = new Set();
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
        this.tagButtonsContainer = this.querySelector('#tagButtons');
        this.bookmarksList = this.querySelector('#bookmarksList');

        if (!this.addBookmarkBtn || !this.signOutBtn || 
            !this.bookmarkTitleInput || !this.bookmarkUrlInput || 
            !this.tagButtonsContainer || !this.bookmarksList) {
            console.error('Required elements not found in bookmarks component');
            return;
        }

        this.addBookmarkBtn.addEventListener('click', () => this.addBookmark());
        this.signOutBtn.addEventListener('click', () => this.signOut());

        this.loadTags();
        this.loadBookmarks();

        // Handle shared content
        const params = new URLSearchParams(window.location.search);
        const sharedData = params.get('share');
        
        if (sharedData) {
            try {
                const { url, title } = JSON.parse(decodeURIComponent(sharedData));
                // Add the shared bookmark
                this.addBookmark({ url, title });
                // Clear the URL
                window.history.replaceState({}, '', '/#/bookmarks');
            } catch (error) {
                console.error('Failed to parse shared data:', error);
            }
        }
    }

    async loadTags() {
        const { data: tags, error } = await supabase
            .from('tags')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error loading tags:', error);
            return;
        }

        this.tagButtonsContainer.innerHTML = tags.map(tag => `
            <button class="btn btn-outline-secondary btn-sm tag-button mb-1" data-tag-id="${tag.id}">
                ${tag.name}
            </button>
        `).join('');

        this.tagButtonsContainer.querySelectorAll('.tag-button').forEach(button => {
            button.addEventListener('click', () => this.toggleTag(button));
        });
    }

    toggleTag(button) {
        const tagId = button.dataset.tagId;
        if (this.selectedTags.has(tagId)) {
            this.selectedTags.delete(tagId);
            button.classList.remove('btn-secondary');
            button.classList.add('btn-outline-secondary');
        } else {
            this.selectedTags.add(tagId);
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-secondary');
        }
    }

    async addBookmark() {
        const title = this.bookmarkTitleInput.value.trim();
        const url = this.bookmarkUrlInput.value.trim();

        if (!title || !url) {
            alert('Please enter both title and URL');
            return;
        }

        // Insert the bookmark
        const { data: bookmarkData, error: bookmarkError } = await supabase
            .from('bookmarks')
            .insert([{ title, url }])
            .select();

        if (bookmarkError) {
            alert('Error adding bookmark: ' + bookmarkError.message);
            return;
        }

        const bookmarkId = bookmarkData[0].id;

        // Create folder relationships for selected tags
        for (const tagId of this.selectedTags) {
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

        // Clear inputs and selection
        this.bookmarkTitleInput.value = '';
        this.bookmarkUrlInput.value = '';
        this.selectedTags.clear();
        this.tagButtonsContainer.querySelectorAll('.tag-button').forEach(button => {
            button.classList.remove('btn-secondary');
            button.classList.add('btn-outline-secondary');
        });
        
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

// React component to handle shared bookmarks
function Bookmarks() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('share') === 'true') {
      const sharedData = JSON.parse(localStorage.getItem('shared_bookmark'));
      if (sharedData) {
        handleAddBookmark(sharedData);
        localStorage.removeItem('shared_bookmark');
        window.history.replaceState({}, '', '/#/bookmarks');
      }
    }
  }, []);

  return (
    `<bookmarks-component></bookmarks-component>`
  );
}

customElements.define('bookmarks-react', Bookmarks);
