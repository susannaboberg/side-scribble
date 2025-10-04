const createNoteBtn = document.getElementById('create-note');
const deleteAllBtn = document.getElementById('delete-all');
const notesContainer = document.getElementById('notes-container');
const searchToggle = document.getElementById('search-toggle');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

let allNotes = [];
let isSearching = false;

let saveTimeout;
function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveNotes();
  }, 800); // 800 ms after the last change
}

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
    
    //visual feedback to show success
    updateBtn.classList.remove('iconoir-refresh-double');
    updateBtn.classList.add('iconoir-check');
    setTimeout(() => {
      updateBtn.classList.remove('iconoir-check');
      updateBtn.classList.add('iconoir-refresh-double');
    }, 500);

    scheduleSave();
}

// load notes from chrome.storage.local
function loadNotes() {
    chrome.storage.local.get(['notes'], (result) => {
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

    notes.slice().reverse().forEach((note, index) => {
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
    noteDiv.draggable = !isSearching;

    // Note header with title and copy button
    const headerDiv = document.createElement('div');
    headerDiv.className = 'note-header';

    const titleInput = document.createElement('input');
    titleInput.placeholder = 'Note Title';
    titleInput.value = title;
    titleInput.className = 'title-text';
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

    const copyBtn = document.createElement('button');
    copyBtn.classList = 'copy-btn hover-button iconoir-copy icon';
    copyBtn.addEventListener('click', () => copyNoteContent(noteDiv));

    headerDiv.appendChild(titleInput);
    headerDiv.appendChild(copyBtn);

    // Body div (contentEditable for rich text)
    const bodyDiv = document.createElement('div');
    bodyDiv.classList = 'body-text';
    bodyDiv.contentEditable = true;
    bodyDiv.placeholder = placeholder;
    bodyDiv.innerHTML = body || '';
    bodyDiv.style.minHeight = `${textAreaHeight}px`;
    bodyDiv.style.whiteSpace = 'pre-wrap';
    
  bodyDiv.addEventListener('input', (e) => {
    scheduleSave();
        chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      console.log(`Total local storage used: ${(bytesInUse / 1024).toFixed(2)} KB`);
    });
  });

  bodyDiv.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.execCommand('insertHTML', false, '&#009');
      //prevent focusing on next element
      e.preventDefault()
    }
    
    // Exit list on double Enter
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      const currentElement = selection.anchorNode.parentElement;
      const listItem = currentElement?.closest('li');
      
      if (listItem && listItem.textContent.trim() === '') {
        e.preventDefault();
        document.execCommand('outdent');
      }
    }
  });

  //paste formatting
  bodyDiv.addEventListener('paste', (e) => {
  e.preventDefault();
  
  // Get plain text from clipboard
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  
  // Insert as plain text
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  selection.deleteFromDocument();
  selection.getRangeAt(0).insertNode(document.createTextNode(text));
  
  // Move cursor to end of pasted text
  selection.collapseToEnd();
  
  scheduleSave();
});

// Double-click to exit search and scroll to note
noteDiv.addEventListener('dblclick', (e) => {
  // Only if we're searching
  if (isSearching) {
    // Exit search mode
    searchContainer.classList.remove('active');
    isSearching = false;
    searchInput.value = '';
    searchResults.textContent = '';
    searchToggle.style.scale = '1.00';
    searchToggle.style.backgroundColor = '';
    searchToggle.style.boxShadow = '';
    searchResults.classList.remove('show');
    
    // Display all notes
    displayNotes(allNotes);
    
    // Scroll to this note after a short delay (to let DOM update)
    setTimeout(() => {
      const targetNote = document.querySelector(`[data-note-id="${noteId}"]`);
      if (targetNote) {
        targetNote.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Optional: Add a brief highlight effect
        targetNote.style.boxShadow = '0px 0px 10px rgba(102, 126, 234, 0.6)';
        setTimeout(() => {
          targetNote.style.boxShadow = '';
        }, 1500);
      }
    }, 100);
  }
});

    // Footer with URL and delete button
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
        chrome.tabs.create({url: urlDisplay.href});
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

    const deleteIcon = document.createElement('button');
    deleteIcon.classList = 'delete-icon iconoir-trash icon hover-button';
    deleteIcon.addEventListener('click', () => deleteNote(noteId));

    dateDelDisplay.appendChild(dateDisplay);
    dateDelDisplay.appendChild(deleteIcon);

    footerDiv.appendChild(urlSection);
    footerDiv.appendChild(dateDelDisplay);

    noteDiv.appendChild(headerDiv);
    noteDiv.appendChild(bodyDiv);
    noteDiv.appendChild(footerDiv);
    notesContainer.appendChild(noteDiv);


  //TODO: LOOK OVER CONTENT
  // Prevent dragging when hovering over text inputs
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


//---------------------------------------------------------------------------------------------
}




// Copy note content to clipboard
function copyNoteContent(noteElement) {
  const title = noteElement.querySelector('.title-text').value;
  const bodyElement = noteElement.querySelector('.body-text');
  const url = noteElement.querySelector('.note-url').href;
  const urlTitle = noteElement.querySelector('.note-url').textContent;
  
  // Create HTML content with formatting preserved
  const htmlContent = `<h3>${title}</h3>${bodyElement.innerHTML}`;
  
  // Create plain text version (strip HTML but keep structure)
  const plainText = bodyElement.innerText.trim();
  
  // Build final content
  let finalHtml = `<h3>${title}</h3>${bodyElement.innerHTML}`;
  let finalText = `${title}\n\n${plainText}`;
  
  // Add full URL if it exists
  if (url && url !== window.location.href + '#' && urlTitle !== 'No URL') {
    finalHtml += `<p><br><strong>Source:</strong> <a href="${url}">${url}</a></p>`;
    finalText += `\n\nSource: ${url}`;
  }
  
  // Copy with rich text formatting
  const clipboardItem = new ClipboardItem({
    'text/html': new Blob([finalHtml], { type: 'text/html' }),
    'text/plain': new Blob([finalText], { type: 'text/plain' })
  });
  
  navigator.clipboard.write([clipboardItem]).then(() => {
    const copyBtn = noteElement.querySelector('.iconoir-copy');
    copyBtn.classList.remove('iconoir-copy');
    copyBtn.classList.add('iconoir-check');
    setTimeout(() => {
      copyBtn.classList.remove('iconoir-check');
      copyBtn.classList.add('iconoir-copy');
    }, 750);
  }).catch(() => {
    // Fallback to plain text
    navigator.clipboard.writeText(finalText);
  });
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
    const placeholder = noteElement.querySelector('.body-text').placeholder;
    const url = noteElement.querySelector('.note-url').href;
    const urlTitle = noteElement.querySelector('.note-url').textContent;
    const date = noteElement.querySelector('.date').textContent;
    const textAreaHeight = noteElement.querySelector('.body-text').style.minHeight;

    // Find and update the note in allNotes array instead of rebuilding
    const noteIndex = allNotes.findIndex(note => note.id === noteId);
    if (noteIndex !== -1) {
      allNotes[noteIndex] = {
        id: noteId,
        title, 
        body, 
        placeholder,
        url: url === window.location.href + '#' ? '' : url, 
        urlTitle, 
        date, 
        textAreaHeight: parseInt(textAreaHeight, 10) || 80
      };
    }
  });
  
  chrome.storage.local.set({ notes: allNotes });
}

// Delete a note by ID
function deleteNote(noteId) {
    chrome.storage.local.get(['notes'], (result) => {
        const notes = result.notes || [];
        const filteredNotes = notes.filter(note => note.id !== noteId);
        chrome.storage.local.set({ notes: filteredNotes }, () => {
        loadNotes();
        });
    });
}

// Delete all notes
deleteAllBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all notes?")) {
    chrome.storage.local.set({ notes: [] }, () => {
        loadNotes();
    });
    }
});

// Search functionality
searchToggle.addEventListener('click', () => {
    const isActive = searchContainer.classList.contains('active');
    searchContainer.classList.toggle('active');

    if (!isActive) {
        searchToggle.style.backgroundColor = 'rgb(229, 228, 228)';
        searchInput.focus()
        document.body.classList.add('searching');

          // Disable dragging on all notes
        document.querySelectorAll('.note').forEach(note => {
          note.draggable = false;
          note.classList.add('no-drag');
        });

        //hide notes when searching (to avoid reordering issues)
        //displayNotes([]);
    } else {
        isSearching = false;
        searchInput.value = '';
        searchResults.textContent = '';
        searchToggle.style.scale = '1.00';
        searchToggle.style.backgroundColor = '';
        searchToggle.style.boxShadow = ''


          document.querySelectorAll('.note').forEach(note => {
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

    chrome.storage.local.get(['notes'], (result) => {
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
        textAreaHeight: 40
        });

        chrome.storage.local.set({ notes }, () => {
            loadNotes();
        });
    });
    });
});

// Load notes when the extension opens
setupDarkMode();
loadNotes();
