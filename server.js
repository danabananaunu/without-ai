const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8000;

let timerInterval;
let isTimerRunning = false;
let countDownSeconds = 0;
let pausedTime = 0;
let elementEditingStatus = {};
let whiteboardState = [];

function broadcastTimerUpdate() {
    io.emit('timerUpdate', {
        seconds: countDownSeconds,
        isRunning: isTimerRunning
    });
}

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    // Send current whiteboard state
    socket.emit('initialState', {
        whiteboardState: whiteboardState,
        countDownSeconds: countDownSeconds,
        isTimerRunning: isTimerRunning,
        elementEditingStatus: elementEditingStatus
    });

    socket.emit('timerUpdate', {
        seconds: countDownSeconds,
        isRunning: isTimerRunning
    });

    socket.emit('elementEditingStatus', elementEditingStatus);
    
    // adding notes
    socket.on('addNote', (noteData) => {
        const note = {
            id: noteData.id,
            type: 'note',
            left: noteData.left,
            top: noteData.top,
            color: noteData.color,
            zIndex: noteData.zIndex
        };
        whiteboardState.push(note);
        io.emit('addNote', note);
    });

    // adding text
    socket.on('addText', (textData) => {
        const text = {
            id: textData.id,
            type: 'text',
            left: textData.left,
            top: textData.top,
            text: textData.text,
            zIndex: textData.zIndex,
            fontFamily: textData.fontFamily || '', 
            fontStyle: textData.fontStyle || '',
            fontWeight: textData.fontWeight || '',
            fontSize: textData.fontSize || ''
        };
        whiteboardState.push(text);
        io.emit('addText', text);
    });

    //moving elements
    socket.on('moveElement', (moveData) => {
        const element = whiteboardState.find(item => item.id === moveData.id);
        if (element) {
            element.left = moveData.left;
            element.top = moveData.top;
            io.emit('moveElement', moveData); // Emit the move event to all clients
        }
    });
    
    //updating items
    socket.on('updateElement', (elementData) => {
        const elementIndex = whiteboardState.findIndex(item => item.id === elementData.id);
      
        if (elementIndex !== -1) {
            //update existing element
            whiteboardState[elementIndex] = { ...whiteboardState[elementIndex], ...elementData };
        } else {
            //new element
            whiteboardState.push(elementData);
        }
      
        //code to update element properties
        const element = whiteboardState.find(item => item.id === elementData.id);
        if (element) {
            if (elementData.type === 'note') {
                element.color = elementData.color;
                element.text = elementData.text;
            } else if (elementData.type === 'text') {
                element.text = elementData.text;
                element.style = elementData.style || {}; //style object exists
                element.style.fontFamily = elementData.fontFamily || '';
                element.style.fontStyle = elementData.fontStyle || '';
                element.style.fontWeight = elementData.fontWeight || '';
                element.style.fontSize = elementData.fontSize || '';
            }
            element.left = elementData.left;
            element.top = elementData.top;
            element.zIndex = elementData.zIndex;
        }
        io.emit('updateElement', elementData);
    });

    socket.on('textEdited', (data) => {
        socket.broadcast.emit('textEdited', data);
    });

    socket.on('lockElement', (data) => {
        const { id } = data;
        socket.broadcast.emit('lockElement', { id });
    });

    //unlocking element
    socket.on('unlockElement', (data) => {
        const { id } = data;
        socket.broadcast.emit('unlockElement', { id }); 
    });

    //timer actions
    socket.on('startTimer', (data) => {
        const totalSeconds = data.seconds;
        if (!isTimerRunning) {
            countDownSeconds = pausedTime > 0 ? pausedTime : totalSeconds;
            isTimerRunning = true;
            pausedTime = 0; //reset paused time
            broadcastTimerUpdate();

            timerInterval = setInterval(() => {
                countDownSeconds--;
                broadcastTimerUpdate();

                if (countDownSeconds <= 0) {
                    clearInterval(timerInterval);
                    isTimerRunning = false;
                    broadcastTimerUpdate();
                }
            }, 1000);
        }
    });

    socket.on('stopTimer', () => {
        if (isTimerRunning) {
            clearInterval(timerInterval);
            pausedTime = countDownSeconds; //store paused time
            isTimerRunning = false;
            broadcastTimerUpdate();
        }
    });

    socket.on('resetTimer', () => {
        clearInterval(timerInterval);
        countDownSeconds = 0;
        pausedTime = 0; //reset paused time
        isTimerRunning = false;
        broadcastTimerUpdate();
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        Object.keys(elementEditingStatus).forEach(textBoxId => {
            if (elementEditingStatus[textBoxId] === socket.id) {
                elementEditingStatus[textBoxId] = false;
                io.emit('unlockTextBox', textBoxId);
            }
        });
    });
});
