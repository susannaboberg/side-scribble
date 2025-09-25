const createNoteBtn = document.getElementById('create-note');
const deleteAllBtn = document.getElementById('delete-all');
const notesContainer = document.getElementById('notes-container');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-button');
const darkModeToggle = document.getElementById('toggle-dark-mode');

// Load notes from chrome.storage.local
function loadNotes() {
  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    notesContainer.innerHTML = '';

    notes.reverse().forEach((note, index) => {
      createNoteElement(note.title, note.body, note.url, note.urlTitle, note.date, note.textAreaHeight, index);
    });
    
  });
}


//create auto-resizing text area
function textAreaAdjust(element) {
    if (element) {  // Check if element is not null or undefined
      element.style.height = "1px";
      element.style.height = (25 + element.scrollHeight) + "px";
    } else {
      console.error('Element is undefined or null');
    }
  }



// Create a new note element
function createNoteElement(title = '', body = '', url = '', urlTitle = '', date = '', textAreaHeight = 25, index = null) {
  const noteDiv = document.createElement('div');
  noteDiv.className = 'note';

  // Title input
  const titleInput = document.createElement('input');
  titleInput.placeholder = 'Note Title';
  titleInput.value = title;
  titleInput.className = 'title-text';
  titleInput.addEventListener('input', () => saveNotes());

  // Body textarea
  const bodyTextarea = document.createElement('textarea');
  bodyTextarea.placeholder = 'Start typing here...';
  bodyTextarea.className = 'body-text';
  bodyTextarea.value = body;
  bodyTextarea.style.height = `${textAreaHeight}px`;
  bodyTextarea.addEventListener('input', () => {
    textAreaAdjust(bodyTextarea); // Auto-resize as user types
    saveNotes(); 
  });

  //URL and delete icon footer
  const footerDiv = document.createElement('div');
  footerDiv.className = 'note-footer';

  //URL display creation
  const urlDisplay = document.createElement('a');
  urlDisplay.className = 'note-url';
  urlDisplay.id = 'editable-url';
  urlDisplay.textContent = urlTitle;
  urlDisplay.href = url;
  urlDisplay.contentEditable = false;
  urlDisplay.addEventListener('click', () => chrome.tabs.create({url: url}));
  footerDiv.appendChild(urlDisplay);

  //Date display creation

  const dateDisplay = document.createElement('p');
  dateDisplay.className = 'date';
  dateDisplay.textContent = date;
  footerDiv.appendChild(dateDisplay)
  

  // Trash can icon
  const deleteIcon = document.createElement('img');
  deleteIcon.src = 'icons/trash.png';
  deleteIcon.className = 'delete-icon';
  deleteIcon.addEventListener('click', () => deleteNote(index));
  footerDiv.appendChild(deleteIcon);


  //appending everything to the note
  noteDiv.appendChild(titleInput);
  noteDiv.appendChild(bodyTextarea);
  noteDiv.appendChild(footerDiv)
  notesContainer.appendChild(noteDiv);
}

// Save all notes to chrome.storage.local
function saveNotes() {
  const notes = [];
  const noteElements = document.querySelectorAll('.note');
  noteElements.forEach((noteElement) => {
    const title = noteElement.querySelector('input').value;
    const body = noteElement.querySelector('textarea').value;
    const url = noteElement.querySelector('.note-url').href;
    const urlTitle = noteElement.querySelector('.note-url').textContent;
    const date = noteElement.querySelector('.date').textContent

    const textAreaHeight = noteElement.querySelector('textarea').style.height;
    notes.unshift({ title, body, url, urlTitle, date, textAreaHeight: parseInt(textAreaHeight, 10) || 25});
  });
  chrome.storage.local.set({ notes });
}

// Delete a note by index
function deleteNote(index) {
  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    notes.splice(notes.length - 1 - index, 1); // Remove note by index
    chrome.storage.local.set({ notes }, () => {
      loadNotes(); // Reload notes after deletion
    });
  });
}

//Delete all notes
deleteAllBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all notes?")) {
      chrome.storage.local.set({ notes: [] }, () => {
        loadNotes(); // Clear all notes from the UI
      });
    }
  });

// Create a new note when the button is clicked
createNoteBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0].url; // Get the URL of the current active tab
      const currentTitle = tabs[0].url.split("/")[2];
  
      chrome.storage.local.get(['notes'], (result) => {
        const notes = result.notes || [];
        let tempDate = new Date();
        const date = (tempDate.getMonth() + 1)  + "/" + tempDate.getDate()+ "/" + tempDate.getFullYear();
        notes.push({ title: '', body: '', url: currentUrl, urlTitle: currentTitle, date: date, textAreaHeight: 25}); // New note with empty title and body, and the current URL
        chrome.storage.local.set({ notes }, () => {
          loadNotes(); // Reload notes
        });
      });
    });
  });



// Load notes when the extension popup opens
loadNotes();