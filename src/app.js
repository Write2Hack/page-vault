import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const SUPABASE_URL = 'https://vabdpfalswqxhlvwigky.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmRwZmFsc3dxeGhsdndpZ2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDExNTEsImV4cCI6MjA3NDcxNzE1MX0.LVTj_nY514cpEPG3v3Qqtrpxe1eupGFZW6LwiHfbx5M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const authContainer = document.getElementById('auth-container');
const bookmarksContainer = document.getElementById('bookmarks-container');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const addBookmarkBtn = document.getElementById('addBookmarkBtn');
const bookmarkTitleInput = document.getElementById('bookmarkTitle');
const bookmarkUrlInput = document.getElementById('bookmarkUrl');
const bookmarksList = document.getElementById('bookmarksList');

// Check for existing session
async function checkSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session) {
        showBookmarks();
        loadBookmarks();
    }
}

// Authentication functions
async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });

    if (error) {
        alert('Error signing in: ' + error.message);
    } else {
        showBookmarks();
        loadBookmarks();
    }
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('Error signing out: ' + error.message);
    } else {
        showAuth();
    }
}

// Bookmark functions
async function addBookmark() {
    const title = bookmarkTitleInput.value.trim();
    const url = bookmarkUrlInput.value.trim();

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
        bookmarkTitleInput.value = '';
        bookmarkUrlInput.value = '';
        loadBookmarks();
    }
}

async function loadBookmarks() {
    const { data, error } = await supabase
        .from('bookmarks')
        .select('*');

    if (error) {
        alert('Error loading bookmarks: ' + error.message);
        return;
    }

    bookmarksList.innerHTML = '';
    data.forEach(bookmark => {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.className = 'bookmark-item';
        
        const link = document.createElement('a');
        link.href = bookmark.url;
        link.target = '_blank';
        link.textContent = bookmark.title;
        link.addEventListener('click', () => incrementVisits(bookmark.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteBookmark(bookmark.id));
        
        bookmarkElement.appendChild(link);
        bookmarkElement.appendChild(deleteBtn);
        bookmarksList.appendChild(bookmarkElement);
    });
}

async function deleteBookmark(id) {
    const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting bookmark: ' + error.message);
    } else {
        loadBookmarks();
    }
}

async function incrementVisits(id) {
    const { error } = await supabase.rpc('increment_visits', { bookmark_id: id });

    if (error) {
        console.error('Error incrementing visits:', error.message);
    }
}

// UI helpers
function showAuth() {
    authContainer.classList.remove('hidden');
    bookmarksContainer.classList.add('hidden');
}

function showBookmarks() {
    authContainer.classList.add('hidden');
    bookmarksContainer.classList.remove('hidden');
}

// Event listeners
signInBtn.addEventListener('click', signIn);
signOutBtn.addEventListener('click', signOut);
addBookmarkBtn.addEventListener('click', addBookmark);

// Check session on load
checkSession();