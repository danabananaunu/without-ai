//1 elements not to be created on top of each other
//3 change the size of the elements


//more people should not be on the same text box,??? 
//show if it is locked

//ai as an api to add notes of his own

let zIndexCounter = 0;//the counter for the nr of objects
let selectedColor = '#ffa500'; //the default color for the notes
//const API_KEY = "sk-proj-Y1M6KDgGgxGqarqRaTf1T3BlbkFJJ4yzl66CP5fOlQR4UwFs";
//const API_URL = "https://api.openai.com/v1/chat/completions";
const socket = io();

let countDownSeconds = 0; // Initialize countdown seconds
let isTimerRunning = false; // Track if timer is running
let timerInterval; // Interval reference for the timer

let lockedElementId = null;

function startTimer() {
    const minutes = parseInt(document.getElementById("minutesInput").value) || 0;
    const seconds = parseInt(document.getElementById("secondsInput").value) || 0;
    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds > 0) {
        socket.emit('startTimer', { seconds: totalSeconds });
    }
}

function stopTimer() {
    socket.emit('stopTimer');
}

function resetTimer() {
    socket.emit('resetTimer');
}

function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const displayMinutes = minutes < 10 ? "0" + minutes : minutes;
    const displaySeconds = remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;
    document.getElementById("timerr").innerHTML = displayMinutes + ":" + displaySeconds;
}

document.getElementById("startButton").addEventListener("click", startTimer);
document.getElementById("stopButton").addEventListener("click", stopTimer);
document.getElementById("resetButton").addEventListener("click", resetTimer);

function createNote() {
    const note = document.createElement('div');
    const uniqueId = `note-${Date.now()}`;
    note.id = uniqueId;
    note.className = 'note';
    note.style.left = `${Math.random()*70}%`;
    note.style.top = `${Math.random()*70}%`;
    note.style.zIndex = zIndexCounter++;
    note.contentEditable = true;
    note.draggable = true;
    note.style.backgroundColor = selectedColor;

    enableDragging(note);
    document.getElementById('whiteboard').appendChild(note);

    note.addEventListener('click', function () {
        handleClickOnElement(note);
    });

    // Send note data to the server
    const noteData = {
        id: uniqueId,
        left: note.style.left,
        top: note.style.top,
        color: selectedColor,
        zIndex: note.style.zIndex
    };
    socket.emit('addNote', noteData);

    enableEditing(note);
}

document.getElementById('add-note').addEventListener('click', function() {
    if (isTimerRunning) { //able to add note only if the timer is going
        createNote();
    }
    socket.emit('whiteboardEvent', { type: 'addNote' });//added
});

const colorPickerModal = document.getElementById('color-picker-modal');

document.getElementById('color-picker-btn').addEventListener('click', function() {
    colorPickerModal.style.display = 'block';
});//display the colors when the button is clicked

//the color to be changed
const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(function(option) {
    option.style.backgroundColor = option.getAttribute('data-color');
    option.addEventListener('click', function() {
        selectedColor = this.getAttribute('data-color');
        colorPickerModal.style.display = 'none'; 
    });
});

//when clicked outside the box the modal for color disappears
window.onclick = function(event) {
    if (event.target === colorPickerModal) {
        colorPickerModal.style.display = 'none'; 
    }
}
//event listeners for the styling of the text/the menu
document.getElementById('font-select').addEventListener('change', function() {
    const selectedFont = this.value;
    const text = document.querySelector('.selected-text');
    if (text) {
        text.style.fontFamily = selectedFont;
        updateElementData(text);
    }
});

document.getElementById('style-select').addEventListener('change', function() {
    const selectedStyle = this.value;
    const text = document.querySelector('.selected-text');
    if (text) {
        text.style.fontStyle = selectedStyle;
        text.style.fontWeight = selectedStyle === 'bold' ? 'bold' : 'normal';
        updateElementData(text);
    }
});

document.getElementById('size-select').addEventListener('change', function() {
    const selectedSize = this.value + 'px';
    const text = document.querySelector('.selected-text');
    if (text) {
        text.style.fontSize = selectedSize;
        updateElementData(text);
    }
});

function createText() {
    const text = document.createElement('div');
    const uniqueId = `text-${Date.now()}`; // Generate a unique ID
    text.id = uniqueId;
    text.className = 'text';
    text.style.left = `${Math.random() * 70}%`;
    text.style.top = `${Math.random() * 70}%`;
    text.style.zIndex = zIndexCounter++;
    text.contentEditable = true;
    text.draggable = true;
    text.innerText = "Your text here";

    enableDragging(text);
    attachDropdownMenuListener(text);
    document.getElementById('whiteboard').appendChild(text);

    text.addEventListener('input', function() {
        saveInput();
    });

    // Send text data to the server
    const textData = {
        id: text.id,
        left: text.style.left,
        top: text.style.top,
        text: text.innerText,
        zIndex: text.style.zIndex,
        fontFamily: '',
        fontStyle: '',
        fontWeight: '',
        fontSize: ''
    };
    socket.emit('addText', textData);

    enableEditing(text);
}

document.getElementById('add-text-btn').addEventListener('click', createText);

function showDropdownMenu(event, textId) {
    const clickedElement = event.target;
    const rect = clickedElement.getBoundingClientRect();
    const dropdownMenus = document.querySelector('.dropdown-menus');
    dropdownMenus.style.top = (rect.bottom + window.scrollY) + 'px';
    dropdownMenus.style.left = (rect.left + window.scrollX) + 'px';
    dropdownMenus.style.display = 'block';
    dropdownMenus.dataset.textId = textId;

    clickedElement.classList.add('selected-text');
    socket.emit('lockElement', { id: textId });
}

function attachDropdownMenuListener(element) {
    element.addEventListener('click', function(event) {
        event.stopPropagation();
        showDropdownMenu(event, element.id);
    });
}

document.addEventListener('click', function(event) {
    const dropdownMenus = document.querySelector('.dropdown-menus');
    const isClickInsideMenu = dropdownMenus.contains(event.target);
    const isClickOnText = event.target.classList.contains('text') || event.target.closest('.text');
    
    if (!isClickInsideMenu && !isClickOnText) {
        dropdownMenus.style.display = 'none';
        const previouslySelectedElement = document.querySelector('.selected-element');
        if (previouslySelectedElement) {
            previouslySelectedElement.classList.remove('selected-element');
            socket.emit('unlockElement', { id: previouslySelectedElement.id });
        }
    }
});

document.querySelectorAll('.text').forEach(text => {
    attachDropdownMenuListener(text);
});

// Ensure that clicking on the dropdown menu does not propagate to the document
document.querySelector('.dropdown-menus').addEventListener('click', function(event) {
    event.stopPropagation();
});

function updateElementData(element) {
    const elementData = {
        id: element.id,
        type: element.classList.contains('text') ? 'text' : 'note',
        text: element.innerText,
        left: element.style.left,
        top: element.style.top,
        zIndex: element.style.zIndex,
        color: element.style.backgroundColor,
        fontFamily: element.style.fontFamily,
        fontStyle: element.style.fontStyle,
        fontWeight: element.style.fontWeight,
        fontSize: element.style.fontSize
    };
    socket.emit('updateElement', elementData);
}

//function to move both a text box and a note by doubleclicking or left clicking
function enableDragging(element) {
    let isDragging = false;
    let offsetX, offsetY;

    function moveElement(event) {
        if (isDragging) {
            const newLeft = event.clientX - offsetX;
            const newTop = event.clientY - offsetY;
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;

            const elementType = element.classList.contains('text') ? 'text' : 'note';
            const elementData = {
                id: element.id,
                type: elementType,
                left: element.style.left,
                top: element.style.top
            };
            socket.emit('moveElement', elementData); // Emit event when element is moved
        }
    }

    element.addEventListener('mousedown', function(event) {
        if (event.button === 0) { // Left mouse button
            isDragging = true;
            offsetX = event.clientX - element.getBoundingClientRect().left;
            offsetY = event.clientY - element.getBoundingClientRect().top;
            document.addEventListener('mousemove', moveElement);
        }
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            document.removeEventListener('mousemove', moveElement);
        }
    });
}

// Function to enable text editing and locking mechanism
function enableEditing(element) {
    element.addEventListener('mousedown', function(event) {
        if (event.detail === 2) { // Double-click to edit
            handleClickOnTextBox(element);
        }
    });

    element.addEventListener('focus', function() {
        if (lockedTextBoxId !== element.id) {
            socket.emit('lockTextBox', { id: element.id });
        }
    });

    element.addEventListener('blur', function() {
        if (lockedTextBoxId === element.id) {
            socket.emit('unlockTextBox', { id: element.id });
        }
    });

    element.addEventListener('input', function() {
        const textData = {
            id: element.id,
            text: element.innerText,
            left: element.style.left,
            top: element.style.top,
            zIndex: element.style.zIndex,
            fontFamily: element.style.fontFamily,
            fontStyle: element.style.fontStyle,
            fontWeight: element.style.fontWeight,
            fontSize: element.style.fontSize
        };
        socket.emit('updateElement', textData);
    });

    element.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          const range = window.getSelection().getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode('\n'));
    
          // Add cursor position to data
          const newCursorPosition = element.selectionStart;
          socket.emit('textEdited', {
            elementId: element.id,
            newTextContent: element.textContent,
            cursorPosition: newCursorPosition
          });
        }
      });
}

socket.on('textEdited', (data) => {
    const element = document.getElementById(data.elementId);
    if (element) {
      element.textContent = data.newTextContent;
      if (data.cursorPosition !== undefined) {
        element.selectionStart = data.cursorPosition;
      }
    }
  });

socket.on('addNote', (noteData) => {
    const existingNote = document.getElementById(noteData.id);
    if (!existingNote) {
        createNoteFromState(noteData);
    }
});

socket.on('addText', (textData) => {
    createTextFromState(textData);
});

socket.on('moveElement', (elementData) => {
    const element = document.getElementById(elementData.id);
    if (element) {
        element.style.left = elementData.left;
        element.style.top = elementData.top;
    }
});

socket.on('timerUpdate', (data) => {
    countDownSeconds = data.seconds;
    isTimerRunning = data.isRunning;
    updateTimerDisplay(countDownSeconds);

    if (isTimerRunning) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            countDownSeconds--;
            updateTimerDisplay(countDownSeconds);
            if (countDownSeconds <= 0) {
                clearInterval(timerInterval);
                isTimerRunning = false;
            }
        }, 1000);
    } else {
        if (timerInterval) clearInterval(timerInterval);
    }
});
// Initial state received from the server
socket.on('initialState', (initialState) => {
    initialState.whiteboardState.forEach(item => {
        if (item.type === 'note') {
            createNoteFromState(item);
        } else if (item.type === 'text') {
            createTextFromState(item);
        }
    });
    countDownSeconds = initialState.countDownSeconds;
    isTimerRunning = initialState.isTimerRunning;
    updateTimerDisplay(countDownSeconds);
});

socket.on('updateElement', (elementData) => {
    const element = document.getElementById(elementData.id);
    if (element) {
        if (element.textContent !== elementData.text) {
            element.textContent = elementData.text;
        }
        element.style.left = elementData.left;
        element.style.top = elementData.top;
        element.style.zIndex = elementData.zIndex;
        element.style.backgroundColor = elementData.color;
        element.style.fontFamily = elementData.fontFamily;
        element.style.fontStyle = elementData.fontStyle;
        element.style.fontWeight = elementData.fontWeight;
        element.style.fontSize = elementData.fontSize;
    } else {
        // if it is not there, creste it
        if (elementData.type === 'text') {
            createTextFromState(elementData);
        } else if (elementData.type === 'note') {
            createNoteFromState(elementData);
        }
    }
});

socket.on('lockElement', (data) => {
    const { id } = data;
    const element = document.getElementById(id);
    if (element) {
        element.contentEditable = true;
        element.classList.add('locked');
    }
    socket.emit('lockElement', { id });
});

socket.on('unlockElement', (data) => {
    const { id } = data;
    const element = document.getElementById(id);
    if (element) {
        element.contentEditable = false;
        element.classList.remove('locked');
    }
    socket.emit('unlockElement', { id });
});

// Function to create a note from initial state received from the server
function createNoteFromState(noteData) {
    const note = document.createElement('div');
    note.id = noteData.id;
    note.className = 'note';
    note.style.left = noteData.left;
    note.style.top = noteData.top;
    note.style.backgroundColor = noteData.color;
    note.style.zIndex = zIndexCounter++;
    note.contentEditable = true;
    note.draggable = true;

    enableDragging(note);
    enableEditing(note);

    document.getElementById('whiteboard').appendChild(note);
}

// Function to create text from initial state received from the server
function createTextFromState(textData) {
    const existingTextElement = document.getElementById(textData.id);
    if (existingTextElement) {
        // Update existing element instead of creating a new one
        existingTextElement.style.left = textData.left;
        existingTextElement.style.top = textData.top;
        existingTextElement.style.zIndex = textData.zIndex;
        existingTextElement.innerText = textData.text;
        existingTextElement.style.fontFamily = textData.fontFamily;
        existingTextElement.style.fontStyle = textData.fontStyle;
        existingTextElement.style.fontWeight = textData.fontWeight;
        existingTextElement.style.fontSize = textData.fontSize;
        return; 
    }
    
    const text = document.createElement('div');
    text.id = textData.id;
    text.className = 'text';
    text.style.left = textData.left;
    text.style.top = textData.top;
    text.style.zIndex = textData.zIndex;
    text.contentEditable = true;
    text.draggable = true;
    text.innerText = textData.text;
    text.style.fontFamily = textData.fontFamily;
    text.style.fontStyle = textData.fontStyle;
    text.style.fontWeight = textData.fontWeight;
    text.style.fontSize = textData.fontSize;

    enableDragging(text);
    enableEditing(text);
    attachDropdownMenuListener(text);

    text.addEventListener('click', function(event) {
        showDropdownMenu(event, text.id); // Show dropdown menu on click
        handleClickOnElement(text);
    });

    document.getElementById('whiteboard').appendChild(text);
}

function handleClickOnElement(element) {
    if (element.contentEditable === 'true' || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return;
    }
    if (lockedElementId && lockedElementId!== element.id) {
        return;
    }
    if (element.classList.contains('selected-element')) {
        element.classList.remove('selected-element');
        lockedElementId = null;
        socket.emit('unlockElement', { id: element.id });
    } else {
        element.classList.add('selected-element');
        lockedElementId = element.id;
        socket.emit('lockElement', { id: element.id });
    }
}

// Function to update text box lock status based on `lockedTextBoxId`
function updateTextLockStatus() {
    document.addEventListener('click', function (event) {
        const selectedText = document.querySelector('.selected-element');
        if (selectedText && !selectedText.contains(event.target)) {
            selectedText.classList.remove('selected-element');
            socket.emit('unlockElement', { id: selectedText.id });
            lockedElementId = null;
        }
    });
}

// Handle click outside of text boxes
document.addEventListener('click', function(event) {
    const clickedElement = event.target;
    const isTextBox = clickedElement.classList.contains('text') || clickedElement.closest('.text');
    if (!isTextBox) {
        const selectedText = document.querySelector('.selected-text');
        if (selectedText) {
            selectedText.classList.remove('selected-text');
            lockedTextBoxId = null;
            updateTextLockStatus();
        }
    }
});
