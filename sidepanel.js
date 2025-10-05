const createNoteBtn = document.getElementById('create-note');
const deleteAllBtn = document.getElementById('delete-all');
const notesContainer = document.getElementById('notes-container');
const searchToggle = document.getElementById('search-toggle');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

let allNotes = [];
let isSearching = false;

/* UTILITY FUNCTIONS -------------------------------------------------------------------------------------*/
function setupDarkMode() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (e.matches) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });
}

function textAreaAdjust(element) {
    if (element) {
        element.style.height = "1px";
        element.style.height = (element.scrollHeight + 10) + "px";
    }
}

/* STORAGE FUNCTIONS (currently using local, not sync)---------------------------------------------------------*/
//reduce spam saving
let saveTimeout;
function scheduleSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveNotes();
    }, 800);
}

function saveNotesOrder() {
    const noteElements = document.querySelectorAll('.note');
    const reorderedNotes = [];

    noteElements.forEach((noteElement) => {
        const noteId = noteElement.dataset.noteId;
        const existingNote = allNotes.find(note => note.id === noteId);
        if (existingNote) {
            reorderedNotes.push(existingNote);
        }
    });

    // Reverse because displayNotes reverses them
    allNotes = reorderedNotes.reverse();
    chrome.storage.local.set({ notes: allNotes });
}

function saveNotes() {
    const noteElements = document.querySelectorAll('.note');

    noteElements.forEach((noteElement) => {
        const noteId = noteElement.dataset.noteId;
        const title = noteElement.querySelector('.title-text').value;
        const body = noteElement.querySelector('.body-text').innerHTML;
        const url = noteElement.querySelector('.note-url').href;
        const urlTitle = noteElement.querySelector('.note-url').textContent;
        const date = noteElement.querySelector('.date').textContent;
        const textAreaHeight = noteElement.querySelector('.body-text').style.minHeight;

        const noteIndex = allNotes.findIndex(note => note.id === noteId);
        if (noteIndex !== -1) {
            allNotes[noteIndex] = {
                id: noteId,
                title,
                body,
                url: url === window.location.href + '#' ? '' : url,
                urlTitle,
                date,
                textAreaHeight: parseInt(textAreaHeight, 10) || 80
            };
        }
    });

    chrome.storage.local.set({ notes: allNotes });
}

function loadNotes() {
    chrome.storage.local.get(['notes'], (result) => {
        allNotes = result.notes || [];
        displayNotes(allNotes);
    });
}

/* DISPLAY & CREATE FUNCTIONS ---------------------------------------------------------------------------------*/
function displayNotes(notes) {
    notesContainer.innerHTML = '';

    if (notes.length === 0) {
        if (isSearching) {
            notesContainer.innerHTML = '<div class="no-results">No notes found matching your search.</div>';
        }
        return;
    }

    notes.slice().reverse().forEach((note, index) => {
        createNoteElement(note.title, note.body, note.url, note.urlTitle, note.date, note.textAreaHeight, index, note.id);
    });
}

function createNoteElement(title = '', body = '', 
                           url = '', urlTitle = '', date = '', textAreaHeight = 80, 
                           index = null, noteId = null) {

    const noteDiv = document.createElement('div');
    noteDiv.classList = 'note';
    noteDiv.dataset.noteId = noteId;
    noteDiv.draggable = !isSearching;

    //header + copy -------------------------------------
    const headerDiv = document.createElement('div');
    headerDiv.classList = 'note-header';

    const titleInput = document.createElement('input');
    titleInput.placeholder = 'Note Title';
    titleInput.value = title;
    titleInput.classList = 'title-text';
    titleInput.addEventListener('input', () => scheduleSave());

    titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const bodyText = noteDiv.querySelector('.body-text');
            if (bodyText) {
                bodyText.focus();
            }
        }
    });

    const copyButton = document.createElement('button');
    copyButton.title = 'copy note to clipboard';
    copyButton.classList = 'copy-btn hover-button iconoir-copy icon';
    copyButton.addEventListener('click', () => copyNoteContent(noteDiv));

    headerDiv.appendChild(titleInput);
    headerDiv.appendChild(copyButton);

    // body div  -----------------------------------------------
    const bodyDiv = document.createElement('div');
    bodyDiv.classList = 'body-text';
    bodyDiv.contentEditable = true;
    bodyDiv.innerHTML = body || '';
    bodyDiv.style.minHeight = `${textAreaHeight}px`;
    bodyDiv.style.whiteSpace = 'pre-wrap';
    //for screen readers
    bodyDiv.setAttribute('role', 'textbox');
    bodyDiv.setAttribute('aria-multiline', 'true');
    bodyDiv.setAttribute('aria-label', 'Note content');

    bodyDiv.addEventListener('input', (e) => {
        scheduleSave();
        /*
        chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
            console.log(`Total local storage used: ${(bytesInUse / 1024).toFixed(2)} KB`);
        });
        */
    });

    //tab override
    bodyDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.execCommand('insertHTML', false, '&#009');
            e.preventDefault()
        }
    });

    //paste formatting restriction
    bodyDiv.addEventListener('paste', (e) => {
        e.preventDefault();

        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(document.createTextNode(text));
        selection.collapseToEnd();

        scheduleSave();
    });

    // double-click to exit search and scroll to note
    noteDiv.addEventListener('dblclick', (e) => {

        if (isSearching) {
            searchContainer.classList.remove('active');
            isSearching = false;
            searchInput.value = '';
            searchResults.textContent = '';
            searchToggle.style.backgroundColor = '';
            searchResults.classList.remove('show');

            displayNotes(allNotes);

            // scroll to note
            setTimeout(() => {
                const targetNote = document.querySelector(`[data-note-id="${noteId}"]`);
                if (targetNote) {
                    targetNote.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });

                    // brief highlight indicator
                    targetNote.style.transition = 'all 0.3s ease';
                    targetNote.style.boxShadow = '0px 0px 15px rgba(102, 126, 234, 0.6)';
                    setTimeout(() => {
                        targetNote.style.boxShadow = '';
                    }, 1500);
                }

                setTimeout(() => {
                targetNote.style.transition = 'none';
                }, 1600);
            }, 100);
            
        }
    });

    // footer with URL and delete button -----------------------------------
    const footerDiv = document.createElement('div');
    footerDiv.classList = 'note-footer';

    const urlSection = document.createElement('div');
    urlSection.classList = 'url-section';

    const urlDisplay = document.createElement('a');
    urlDisplay.classList = 'note-url';
    urlDisplay.textContent = urlTitle || 'No URL';
    urlDisplay.href = url || '#';
    if (url) {
        urlDisplay.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: urlDisplay.href });
        });
    }

    const updateLinkBtn = document.createElement('button');
    updateLinkBtn.classList = 'update-link-btn iconoir-refresh-double icon hover-button';
    updateLinkBtn.title = 'Update to current page';
    updateLinkBtn.addEventListener('click', () => updateNoteLink(noteDiv));

    urlSection.appendChild(urlDisplay);
    urlSection.appendChild(updateLinkBtn);

    const dateDelDisplay = document.createElement('div');
    dateDelDisplay.classList = 'date-del-display';

    const dateDisplay = document.createElement('p');
    dateDisplay.classList = 'date';
    dateDisplay.textContent = date;

    const deleteButton = document.createElement('button');
    deleteButton.title = 'Delete note';
    deleteButton.classList = 'delete-icon iconoir-trash icon hover-button';
    deleteButton.addEventListener('click', () => deleteNote(noteId));

    dateDelDisplay.appendChild(dateDisplay);
    dateDelDisplay.appendChild(deleteButton);

    footerDiv.appendChild(urlSection);
    footerDiv.appendChild(dateDelDisplay);

    noteDiv.appendChild(headerDiv);
    noteDiv.appendChild(bodyDiv);
    noteDiv.appendChild(footerDiv);
    notesContainer.appendChild(noteDiv);

    // Prevent drag/reorder when hovering over text inputs
    titleInput.addEventListener('mouseenter', () => {
        noteDiv.draggable = false;
    });
    titleInput.addEventListener('mouseleave', () => {
        noteDiv.draggable = true;
    });
    bodyDiv.addEventListener('mouseenter', () => {
        noteDiv.draggable = false;
    });
    bodyDiv.addEventListener('mouseleave', () => {
        noteDiv.draggable = true;
    });

    noteDiv.addEventListener('dragstart', (e) => {
        if (isSearching) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', noteDiv.innerHTML);
        noteDiv.classList.add('dragging');
    });

    noteDiv.addEventListener('dragend', () => {
        if (isSearching) return;
        noteDiv.classList.remove('dragging');
        // Remove all drag-over classes
        document.querySelectorAll('.note').forEach(n => {
            n.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        saveNotesOrder();
    });

    noteDiv.addEventListener('dragover', (e) => {
        if (isSearching) return;
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (dragging && dragging !== noteDiv) {
            const bounding = noteDiv.getBoundingClientRect();
            const offset = e.clientY - bounding.top;

            // Clear previous classes
            noteDiv.classList.remove('drag-over-top', 'drag-over-bottom');

            // Add animation class based on position
            if (offset > bounding.height / 2) {
                noteDiv.classList.add('drag-over-bottom');
                noteDiv.parentNode.insertBefore(dragging, noteDiv.nextSibling);
            } else {
                noteDiv.classList.add('drag-over-top');
                noteDiv.parentNode.insertBefore(dragging, noteDiv);
            }
        }
    });

    noteDiv.addEventListener('dragleave', () => {
        if (isSearching) return;
        noteDiv.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    noteDiv.addEventListener('drop', (e) => {
        if (isSearching) return;
        e.preventDefault();
        noteDiv.classList.remove('drag-over-top', 'drag-over-bottom');
    });
}

/* BUTTON ACTION FUNCTIONS --------------------------------------------------------------------------*/

function deleteNote(noteId) {
    chrome.storage.local.get(['notes'], (result) => {
        const notes = result.notes || [];
        const filteredNotes = notes.filter(note => note.id !== noteId);
        chrome.storage.local.set({ notes: filteredNotes }, () => { //save changes
            loadNotes();
        });
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
    urlDisplay.textContent = urlTitle;

    //visual feedback
    updateBtn.classList.remove('iconoir-refresh-double');
    updateBtn.classList.add('iconoir-check');
    setTimeout(() => {
        updateBtn.classList.remove('iconoir-check');
        updateBtn.classList.add('iconoir-refresh-double');
    }, 500);

    scheduleSave(); //save changes
}

function copyNoteContent(noteElement) {
    const title = noteElement.querySelector('.title-text').value;
    const bodyElement = noteElement.querySelector('.body-text');
    const url = noteElement.querySelector('.note-url').href;
    const urlTitle = noteElement.querySelector('.note-url').textContent;

    // HTML with formatting
    const htmlContent = `<h3>${title}</h3>${bodyElement.innerHTML}`;

    // plain text version
    const plainText = bodyElement.innerText.trim();

    let finalHtml = `<h3>${title}</h3>${bodyElement.innerHTML}`;
    let finalText = `${title}\n\n${plainText}`;

    if (url && url !== window.location.href + '#' && urlTitle !== 'No URL') {
        finalHtml += `<p><br><strong>Source:</strong> <a href="${url}">${url}</a></p>`;
        finalText += `\n\nSource: ${url}`;
    }

    const clipboardItem = new ClipboardItem({
        'text/html': new Blob([finalHtml], { type: 'text/html' }),
        'text/plain': new Blob([finalText], { type: 'text/plain' })
    });

    navigator.clipboard.write([clipboardItem]).then(() => {
        //visual feedback
        const copyButton = noteElement.querySelector('.iconoir-copy');
        copyButton.classList.remove('iconoir-copy');
        copyButton.classList.add('iconoir-check');
        setTimeout(() => {
            copyButton.classList.remove('iconoir-check');
            copyButton.classList.add('iconoir-copy');
        }, 750);
    }).catch(() => { // fallback to plain text
        navigator.clipboard.writeText(finalText);
    });
}

/* GLOBAL EVENT LISTENERS ----------------------------------------------------------------------*/

deleteAllBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all notes?")) {
        chrome.storage.local.set({ notes: [] }, () => {
            loadNotes();
        });
    }
});

searchToggle.addEventListener('click', () => {
    const isActive = searchContainer.classList.contains('active');
    searchContainer.classList.toggle('active');

    if (!isActive) { //if searching

        searchInput.focus()
        document.body.classList.add('searching');

        // Disable dragging on all notes
        document.querySelectorAll('.note').forEach(note => {
            note.draggable = false;
            note.classList.add('no-drag');
        });

    } else { //no searching (nothing entered in input)
        isSearching = false;
        searchInput.value = '';
        searchResults.textContent = '';
        searchToggle.style.backgroundColor = '';

        document.querySelectorAll('.note').forEach(note => { //enable dragging
            note.draggable = true;
            note.classList.remove('no-drag');
        });

        searchContainer.style.cursor = 'default';
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

/* CREATE NEW NOTE --------------------------------------------------------------------------*/
createNoteBtn.addEventListener('click', () => {

    //exit search mode when creating new note
    if (searchContainer.classList.contains('active')) {
        searchContainer.classList.remove('active');
        isSearching = false;
        searchInput.value = '';
        searchResults.textContent = '';
        searchToggle.style.backgroundColor = '';
        searchResults.classList.remove('show');
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentUrl = tabs[0].url;
        const currentTitle = new URL(currentUrl).hostname;

        chrome.storage.local.get(['notes'], (result) => {
            const notes = result.notes || [];
            const tempDate = new Date();
            const date = `${tempDate.getMonth() + 1}/${tempDate.getDate()}/${tempDate.getFullYear()}`;
            const noteId = Date.now().toString();

            notes.push({
                id: noteId,
                title: '',
                body: '',
                url: currentUrl,
                urlTitle: currentTitle,
                date: date,
                textAreaHeight: 50
            });

            chrome.storage.local.set({ notes }, () => {
                loadNotes();
            });
        });
    });
});


// Load notes when the extension opens, check for dark mdoe
setupDarkMode();
loadNotes();
