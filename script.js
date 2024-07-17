const boardElement = document.getElementById('board');
const piecesElement = document.getElementById('pieces');
const timerElement = document.getElementById('time');
const myScoreElement = document.getElementById('my-score');
const opponentScoreElement = document.getElementById('opponent-score');
const roomJoinElement = document.getElementById('room-join');
const gameElement = document.getElementById('game');
const roomIdInput = document.getElementById('room-id');
const joinButton = document.getElementById('join-btn');

const socket = new WebSocket('ws://localhost:8080');

let board = Array(9).fill(null).map(() => Array(9).fill(null));
let currentPieceIndex = null;
let currentPiece = null;
let myScore = 0;
let opponentScore = 0;
let timer = 300; // 5 minutes in seconds
let intervalId;
let roomId = null;
let playerIndex = null;

const initialPieces = [
    // Existing pieces
    [[1, 1, 1], [0, 1, 0]],               // T shape
    [[1, 1], [1, 1]],                     // Square shape
    [[1, 1, 1, 1]],                       // Line shape
    [[1, 0], [1, 0], [1, 1]],             // L shape
    [[0, 1, 0], [1, 1, 1]],               // T shape upside down
    [[1, 0], [1, 1], [1, 0]],             // + shape
    [[1, 1, 1], [0, 0, 1]],               // J shape
    [[0, 0, 1], [1, 1, 1]],               // L shape
    [[1, 1], [0, 1], [0, 1]],             // J shape rotated
    [[1, 1], [1, 0], [1, 0]],             // L shape rotated
    [[1, 1, 1, 1, 1]],                    // Long line
    [[1, 1, 1], [0, 1, 0], [0, 1, 0]],    // Long T shape

    // New pieces from the Woodoku Piece Guide
    [[1, 1, 1], [1, 0, 0]],               // "Joe"
    [[1, 1], [1, 1], [1, 0]],             // "Mac"
    [[1, 1, 1], [1, 0, 0], [1, 0, 0]],    // "Richard"
    [[1, 1, 1, 1], [1, 0, 0, 0]],         // "Lil Richie"
    [[1, 1, 1], [1, 1, 0]],               // "Craig (The Crate)"
    [[1, 1], [1, 1], [1, 0], [1, 0]],     // "Caden"
    [[1, 1, 1], [0, 1, 1]],               // "The Worm"
    [[1]],                                // "Dot"
    [[1, 1]],                             // "2Dot"
    [[1, 1, 1]],                          // "3Dot"
    [[1, 1, 1, 1]],                       // "4Dot"
    [[1, 1, 1, 1, 1]],                    // "5Dot"
    [[1, 1], [1, 0], [1, 1]],             // "Luigi"
    [[1, 1, 1], [0, 0, 1], [0, 0, 1]],    // "Waluigi"
    [[1, 1, 1], [0, 1, 1]],               // "The Evil Worm"
    [[1, 1], [0, 1]],                     // "Stair"
    [[1, 1, 1], [0, 0, 1], [0, 0, 1]],    // "3Stair"
    [[1, 1, 1, 1], [0, 0, 0, 1], [0, 0, 0, 1]],  // "4Stair"
    [[1, 1, 1], [1, 1, 1]]                // "The Helmet"
];

let availablePieces = [0, 1, 2]; // Only 3 pieces available at a time

joinButton.addEventListener('click', () => {
    roomId = roomIdInput.value;
    if (roomId) {
        socket.send(JSON.stringify({ type: 'join', roomId }));
    } else {
        alert('Please enter a room ID');
    }
});

socket.onopen = function() {
    console.log('Connected to the server');
};

socket.onmessage = function(event) {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'joined':
            console.log(`Joined room ${message.roomId}`);
            playerIndex = message.playerIndex;
            roomJoinElement.style.display = 'none';
            gameElement.style.display = 'block';
            break;
        case 'start':
            startGame();
            break;
        case 'update':
            updateGame(message);
            break;
        case 'end':
            endGame(message.winner);
            break;
        case 'opponentDisconnected':
            alert('Your opponent has disconnected. The game will end.');
            endGame('You');
            break;
        case 'error':
            alert(message.message);
            break;
    }
};

function startGame() {
    intervalId = setInterval(updateTimer, 1000);
    initializeAvailablePieces();
    renderPieces();
    render();
}

function updateGame(data) {
    opponentScore = data.opponentScore;
    render();
}

function endGame(winner) {
    clearInterval(intervalId);
    alert(`Game Over! ${winner} wins!`);
}

function updateTimer() {
    timer--;
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    timerElement.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    if (timer <= 0) {
        socket.send(JSON.stringify({ type: 'end' }));
    }
}

function render() {
    renderBoard(board, boardElement);
    myScoreElement.textContent = `My Score: ${myScore}`;
    opponentScoreElement.textContent = `Opponent Score: ${opponentScore}`;
}

function renderBoard(board, boardElement) {
    boardElement.innerHTML = '';
    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.dataset.row = rowIndex;
            cellElement.dataset.col = colIndex;
            cellElement.className = 'cell';
            if (cell) cellElement.classList.add('filled');
            boardElement.appendChild(cellElement);
        });
    });
}

function renderPieces() {
    piecesElement.innerHTML = '';
    availablePieces.forEach((pieceIndex) => {
        const piece = initialPieces[pieceIndex];
        const pieceElement = document.createElement('div');
        pieceElement.className = 'piece';
        pieceElement.dataset.pieceIndex = pieceIndex;
        pieceElement.draggable = true;
        pieceElement.addEventListener('dragstart', dragStart);
        piece.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.className = 'piece-row';
            row.forEach(cell => {
                const cellElement = document.createElement('div');
                cellElement.className = 'cell';
                if (cell) cellElement.classList.add('filled');
                rowElement.appendChild(cellElement);
            });
            pieceElement.appendChild(rowElement);
        });
        piecesElement.appendChild(pieceElement);
    });
}

function dragStart(event) {
    currentPieceIndex = event.target.dataset.pieceIndex;
    currentPiece = initialPieces[currentPieceIndex];
    event.dataTransfer.setData('text/plain', currentPieceIndex);
}

boardElement.addEventListener('dragover', (event) => {
    event.preventDefault();
    const dropPosition = getDropPosition(event);
    if (dropPosition) {
        highlightDropArea(currentPiece, dropPosition.row, dropPosition.col);
    }
});

boardElement.addEventListener('dragleave', clearHighlight);

boardElement.addEventListener('drop', (event) => {
    event.preventDefault();
    const pieceIndex = event.dataTransfer.getData('text/plain');
    currentPiece = initialPieces[pieceIndex];
    const dropPosition = getDropPosition(event);

    if (dropPosition && placePiece(currentPiece, dropPosition.row, dropPosition.col)) {
        updateScore();
        currentPiece = null;
        regeneratePiece(pieceIndex);
        clearHighlight();
        renderPieces();
    }
});

function getDropPosition(event) {
    const boardRect = boardElement.getBoundingClientRect();
    const cellSize = boardRect.width / 9; // assuming a square board
    const dropX = event.clientX - boardRect.left;
    const dropY = event.clientY - boardRect.top;
    const dropRow = Math.floor(dropY / cellSize);
    const dropCol = Math.floor(dropX / cellSize);
    return { row: dropRow, col: dropCol };
}

function placePiece(piece, dropRow, dropCol) {
    const pieceHeight = piece.length;
    const pieceWidth = piece[0].length;

    if (dropRow + pieceHeight <= 9 && dropCol + pieceWidth <= 9) {
        for (let r = 0; r < pieceHeight; r++) {
            for (let c = 0; c < pieceWidth; c++) {
                if (piece[r][c] && board[dropRow + r][dropCol + c]) {
                    return false; // Collision detected, cannot place the piece here
                }
            }
        }

        for (let r = 0; r < pieceHeight; r++) {
            for (let c = 0; c < pieceWidth; c++) {
                if (piece[r][c]) {
                    board[dropRow + r][dropCol + c] = piece[r][c];
                }
            }
        }

        checkForCompletedRowsAndSquares();
        return true;
    }

    return false;
}

function checkForCompletedRowsAndSquares() {
    for (let i = 0; i < 9; i++) {
        if (board[i].every(cell => cell)) {
            board[i].fill(null);
            myScore += 10;
        }
        if (board.every(row => row[i])) {
            for (let j = 0; j < 9; j++) {
                board[j][i] = null;
            }
            myScore += 10;
        }
    }

    const squares = [
        [0, 0], [0, 3], [0, 6],
        [3, 0], [3, 3], [3, 6],
        [6, 0], [6, 3], [6, 6]
    ];

    squares.forEach(([row, col]) => {
        const square = [
            board[row][col], board[row][col + 1], board[row][col + 2],
            board[row + 1][col], board[row + 1][col + 1], board[row + 1][col + 2],
            board[row + 2][col], board[row + 2][col + 1], board[row + 2][col + 2]
        ];

        if (square.every(cell => cell)) {
            for (let r = row; r < row + 3; r++) {
                for (let c = col; c < col + 3; c++) {
                    board[r][c] = null;
                }
            }
            myScore += 20;
        }
    });

    render();
    socket.send(JSON.stringify({ type: 'update', myScore }));
}

function highlightDropArea(piece, dropRow, dropCol) {
    clearHighlight();
    const pieceHeight = piece.length;
    const pieceWidth = piece[0].length;

    if (dropRow + pieceHeight <= 9 && dropCol + pieceWidth <= 9) {
        for (let r = 0; r < pieceHeight; r++) {
            for (let c = 0; c < pieceWidth; c++) {
                if (piece[r][c]) {
                    const cellElement = boardElement.querySelector(`.cell[data-row="${dropRow + r}"][data-col="${dropCol + c}"]`);
                    if (cellElement) {
                        cellElement.classList.add('highlight');
                    }
                }
            }
        }
    }
}

function clearHighlight() {
    boardElement.querySelectorAll('.cell.highlight').forEach(cell => {
        cell.classList.remove('highlight');
    });
}

function updateScore() {
    myScore += 2; // Example scoring logic: each placed piece gives 2 points
    myScoreElement.textContent = `My Score: ${myScore}`;
    opponentScoreElement.textContent = `Opponent Score: ${opponentScore}`;
}

function initializeAvailablePieces() {
    availablePieces = [0, 1, 2]; // Initially, only these 3 pieces are available
}

function regeneratePiece(index) {
    const oldPieceIndex = availablePieces.indexOf(parseInt(index));
    if (oldPieceIndex !== -1) {
        availablePieces.splice(oldPieceIndex, 1); // Remove the placed piece index from available pieces
        setTimeout(() => {
            const newPieceIndex = Math.floor(Math.random() * initialPieces.length);
            availablePieces.push(newPieceIndex); // Add new piece to the end
            renderPieces(); // Render pieces again to update the UI
        }, 300);
    }
}