const createNoteBtn = document.getElementById('create-note');
const deleteAllBtn = document.getElementById('delete-all');
const notesContainer = document.getElementById('notes-container');
const searchToggle = document.getElementById('search-toggle');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

let allNotes = [];
let isSearching = false;


function setupDarkMode() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Listen for changes in system theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (e.matches) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    });
}

function updateNoteLink(noteElement) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentUrl = tabs[0].url;
        const currentTitle = new URL(currentUrl).hostname;
        updateNoteLinkData(noteElement, currentUrl, currentTitle);
    });
}

function updateNoteLinkData(noteElement, url, urlTitle) {
    const urlDisplay = noteElement.querySelector('.note-url');
    const updateBtn = noteElement.querySelector('.update-link-btn');
    
    urlDisplay.href = url;
   // urlDisplay.setAttribute('href', url);  // store the raw URL
    urlDisplay.textContent = urlTitle;
    //urlDisplay.setAttribute('textContent', urlTitle);
    
    // Visual feedback
    updateBtn.className = 'update-link-btn iconoir-check icon'
    setTimeout(() => {
    updateBtn.className = 'update-link-btn iconoir-refresh-double icon'
    }, 500);

    setTimeout(() => {
        saveNotes();
    }, 500);
}

// Load notes from chrome.storage.sync for persistent storage
function loadNotes() {
    chrome.storage.sync.get(['notes'], (result) => {
    allNotes = result.notes || [];
    displayNotes(allNotes);
    });
}

function displayNotes(notes) {
    notesContainer.innerHTML = '';
    
    if (notes.length === 0) {
        if (isSearching) {
            notesContainer.innerHTML = '<div class="no-results">No notes found matching your search.</div>';
        }
        return;
    }

    notes.reverse().forEach((note, index) => {
    createNoteElement(note.title, note.body, note.placeholder, note.url, note.urlTitle, note.date, note.textAreaHeight, index, note.id);
    });
}

// Auto-resizing textarea
function textAreaAdjust(element) {
    if (element) {
    element.style.height = "1px";
    element.style.height = (element.scrollHeight + 10) + "px";
    }
}

// Create a new note element
function createNoteElement(title = '', body = '', placeholder = 'Type here', url = '', urlTitle = '', date = '', textAreaHeight = 80, index = null, noteId = null) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note';
    noteDiv.dataset.noteId = noteId;

    // Note header with title and copy button
    const headerDiv = document.createElement('div');
    headerDiv.className = 'note-header';

    const titleInput = document.createElement('input');
    titleInput.placeholder = 'Note Title';
    titleInput.value = title;
    titleInput.className = 'title-text';
    titleInput.addEventListener('input', () => saveNotes());

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    const copyIcon = document.createElement('i');
    copyIcon.className = 'iconoir-copy icon';
    copyBtn.appendChild(copyIcon);
    copyBtn.addEventListener('click', () => copyNoteContent(noteDiv));

    headerDiv.appendChild(titleInput);
    headerDiv.appendChild(copyBtn);

    // Body div (contentEditable for rich text)
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'body-text';
    bodyDiv.contentEditable = true;
    bodyDiv.placeholder = placeholder;
    bodyDiv.innerHTML = body || '';
    bodyDiv.style.minHeight = `${textAreaHeight}px`;
    
    bodyDiv.addEventListener('input', () => {
    saveNotes();
    });

    bodyDiv.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
    });

    // Footer with URL and delete button
    const footerDiv = document.createElement('div');
    footerDiv.className = 'note-footer';

    const urlSection = document.createElement('div');
    urlSection.className = 'url-section';

    const urlDisplay = document.createElement('a');
    urlDisplay.className = 'note-url';
    urlDisplay.textContent = urlTitle || 'No URL';
    urlDisplay.href = url || '#';
    if (url) {
    urlDisplay.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({url: urlDisplay.href});
    });
    }

    const updateLinkBtn = document.createElement('button');
    updateLinkBtn.className = 'update-link-btn iconoir-refresh-double icon';
    updateLinkBtn.title = 'Update to current page';
    updateLinkBtn.addEventListener('click', () => updateNoteLink(noteDiv));

    urlSection.appendChild(urlDisplay);
    urlSection.appendChild(updateLinkBtn);

    const dateDelDisplay = document.createElement('div');
    dateDelDisplay.className = 'date-del-display';

    const dateDisplay = document.createElement('p');
    dateDisplay.className = 'date';
    dateDisplay.textContent = date;

    const deleteIcon = document.createElement('button');
    deleteIcon.className = 'delete-icon iconoir-trash icon';
    deleteIcon.addEventListener('click', () => deleteNote(noteId));

    dateDelDisplay.appendChild(dateDisplay);
    dateDelDisplay.appendChild(deleteIcon);

    footerDiv.appendChild(urlSection);
    footerDiv.appendChild(dateDelDisplay);

    noteDiv.appendChild(headerDiv);
    noteDiv.appendChild(bodyDiv);
    noteDiv.appendChild(footerDiv);
    notesContainer.appendChild(noteDiv);
}

// Copy note content to clipboard
function copyNoteContent(noteElement) {
    const title = noteElement.querySelector('.title-text').value;
    const body = noteElement.querySelector('.body-text').innerText;
    const content = `${title}\n\n${body}`;
    
    navigator.clipboard.writeText(content).then(() => {
    const copyBtn = noteElement.querySelector('.iconoir-copy');
    copyBtn.className = 'iconoir-check icon';
    setTimeout(() => {
        copyBtn.className = 'iconoir-copy icon';
    }, 750);
    });
}

// Save all notes to chrome.storage.sync
function saveNotes() {
    const notes = [];

    //static node list
    const noteElements = document.querySelectorAll('.note');
    
    noteElements.forEach((noteElement) => {
    const title = noteElement.querySelector('.title-text').value;
    const body = noteElement.querySelector('.body-text').innerHTML;
    const placeholder = noteElement.querySelector('.body-text').placeholder;
    const url = noteElement.querySelector('.note-url').href;
    const urlTitle = noteElement.querySelector('.note-url').textContent;
    const date = noteElement.querySelector('.date').textContent;
    const textAreaHeight = noteElement.querySelector('.body-text').style.minHeight;
    const noteId = noteElement.dataset.noteId;

    notes.unshift({ 
        id: noteId,
        title, 
        body, 
        placeholder,
        url: (url && url !== '#' && !url.endsWith(window.location.href + '#')) ? url : '',
        urlTitle, 
        date, 
        textAreaHeight: parseInt(textAreaHeight, 10) || 80
    });
    });
    
    chrome.storage.sync.set({ notes });
    
    // Update allNotes for search
    allNotes = [...notes].reverse();
}

// Delete a note by ID
function deleteNote(noteId) {
    chrome.storage.sync.get(['notes'], (result) => {
        const notes = result.notes || [];
        const filteredNotes = notes.filter(note => note.id !== noteId);
        chrome.storage.sync.set({ notes: filteredNotes }, () => {
        loadNotes();
        });
    });
}

// Delete all notes
deleteAllBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all notes?")) {
    chrome.storage.sync.set({ notes: [] }, () => {
        loadNotes();
    });
    }
});

// Search functionality
searchToggle.addEventListener('click', () => {
    const isActive = searchContainer.classList.contains('active');
    searchContainer.classList.toggle('active');

    if (!isActive) {
        //createNoteBtn.style.display = 'none';
        searchToggle.style.scale = '1.05';
        searchToggle.style.backgroundColor = 'white';
        searchToggle.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
        searchInput.focus()

        //hide notes when searching (to avoid reordering issues)
        displayNotes([]);
    } else {
        //createNoteBtn.style.display = 'block';
        isSearching = false;
        searchInput.value = '';
        searchResults.textContent = '';
        searchToggle.style.scale = '1.00';
        searchToggle.style.backgroundColor = '';
        searchToggle.style.boxShadow = ''

        searchResults.classList.remove('show');
        displayNotes(allNotes)
    }
});

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === '') {
        isSearching = false;
        displayNotes(allNotes);
        searchResults.textContent = '';
        searchResults.classList.remove('show');
        return;
    }

    isSearching = true;
    const filteredNotes = allNotes.filter(note => {
    const titleMatch = note.title.toLowerCase().includes(query);
    const bodyMatch = note.body.toLowerCase().includes(query);
    const urlMatch = note.url.toLowerCase().includes(query);
    const dateMatch = note.date.toLowerCase().includes(query);
    return titleMatch || bodyMatch || urlMatch || dateMatch;
    });

    displayNotes(filteredNotes);
    searchResults.textContent = `Found ${filteredNotes.length} note${filteredNotes.length === 1 ? '' : 's'}`;
    searchResults.classList.add('show');
});

// Create a new note
createNoteBtn.addEventListener('click', () => {

    //exit search mode when creating new note
    if (searchContainer.classList.contains('active')) {
        searchContainer.classList.remove('active');
        isSearching = false;
        searchInput.value = '';
        searchResults.textContent = '';
        searchToggle.style.scale = '1.00';
        searchToggle.style.backgroundColor = '';
        searchToggle.style.boxShadow = ''
        searchResults.classList.remove('show');
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0].url;
    const currentTitle = new URL(currentUrl).hostname;

    chrome.storage.sync.get(['notes'], (result) => {
        const notes = result.notes || [];
        const tempDate = new Date();
        const date = `${tempDate.getMonth() + 1}/${tempDate.getDate()}/${tempDate.getFullYear()}`;
        const noteId = Date.now().toString();

        notes.push({ 
        id: noteId,
        title: '', 
        body: '', 
        placeholder: '',
        url: currentUrl, 
        urlTitle: currentTitle, 
        date: date, 
        textAreaHeight: 80
        });

        chrome.storage.sync.set({ notes }, () => {
            loadNotes();
        });
    });
    });
});

// Load notes when the extension opens
setupDarkMode();
loadNotes();