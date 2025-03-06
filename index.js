const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'https://tic-tac-toe-e855.onrender.com', // Update with your React app's URL
    methods: ['GET', 'POST'],
  },
});

const port = 5000;

app.use(cors());

app.get('/game', (req, res) => {
  res.status(200).send('Tic Tac Toe Game Server');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('makeMove', (data) => {
    io.emit('moveMade', data);
  });

  socket.on('resetGame', (newGame) => {
    io.emit('gameReset', newGame);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
