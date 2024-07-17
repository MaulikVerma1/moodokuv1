const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        const data = JSON.parse(message);
        switch (data.type) {
            case 'join':
                handleJoinRoom(ws, data.roomId);
                break;
            case 'update':
                handleUpdate(ws, data);
                break;
            case 'end':
                handleGameEnd(ws);
                break;
        }
    });

    ws.on('close', function() {
        handlePlayerDisconnect(ws);
    });
});

function handleJoinRoom(ws, roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, { 
            players: [], 
            board: Array(9).fill(null).map(() => Array(9).fill(null)),
            gameStarted: false,
            scores: [0, 0]
        });
    }

    const room = rooms.get(roomId);
    if (room.players.length < 2) {
        room.players.push(ws);
        ws.roomId = roomId;
        ws.playerIndex = room.players.length - 1;
        ws.send(JSON.stringify({ type: 'joined', roomId, playerIndex: ws.playerIndex }));

        if (room.players.length === 2) {
            startGame(roomId);
        }
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
    }
}

function startGame(roomId) {
    const room = rooms.get(roomId);
    room.gameStarted = true;
    room.players.forEach((player, index) => {
        player.send(JSON.stringify({ 
            type: 'start',
            playerIndex: index,
            board: room.board,
            scores: room.scores
        }));
    });
}

function handleUpdate(ws, data) {
    const room = rooms.get(ws.roomId);
    if (room && room.gameStarted) {
        room.board = data.board;
        room.scores[ws.playerIndex] = data.myScore;
        room.scores[1 - ws.playerIndex] = data.opponentScore;
        
        room.players.forEach((player, index) => {
            player.send(JSON.stringify({ 
                type: 'update', 
                board: room.board,
                myScore: room.scores[index],
                opponentScore: room.scores[1 - index]
            }));
        });
    }
}

function handleGameEnd(ws) {
    const room = rooms.get(ws.roomId);
    if (room) {
        room.players.forEach(player => {
            player.send(JSON.stringify({ type: 'end' }));
        });
        rooms.delete(ws.roomId);
    }
}

function handlePlayerDisconnect(ws) {
    const room = rooms.get(ws.roomId);
    if (room) {
        room.players = room.players.filter(player => player !== ws);
        if (room.players.length === 0) {
            rooms.delete(ws.roomId);
        } else {
            room.players[0].send(JSON.stringify({ type: 'opponentDisconnected' }));
        }
    }
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});