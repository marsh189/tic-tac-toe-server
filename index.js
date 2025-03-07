const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');
const mysql = require('mysql');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'https://tic-tac-toe-e855.onrender.com', // Update with your React app's URL
    methods: ['GET', 'POST'],
  },
});

var sessionMiddleware = session({
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  resave: saveUninitialized,
  secret: 'keyboard cat',
});

io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

app.use(sessionMiddleware);
app.use(cookieParser());

const config = {
  host: 'localhost',
  user: 'root',
  password: 'chapTown#42',
  base: 'tic_tac_toe',
};

var db = mysql.createConnection({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.base,
});

db.connect(function (error) {
  if (!!error) throw error;

  console.log(
    'mysql connected to ' +
      config.host +
      ', user ' +
      config.user +
      ', database ' +
      config.base
  );
});

var allClients = [];

const port = 5000;

app.use(cors());
app.use(express.static('./'));

app.get('/game', (req, res) => {
  res.status(200).send('Tic Tac Toe Game Server');
});

io.on('connection', (socket) => {
  const req = socket.request;

  if (req.session.userID != null) {
    db.query(
      'SELECT * FROM users WHERE id=?',
      [req.session.userID],
      function (err, rows, fields) {
        socket.emit('logged_in', { user: rows[0].Username });
      }
    );
  }

  socket.on('login_register', (data) => {
    const user = data.user;
    const pass = data.pass;
    db.query(
      'SELECT * FROM users WHERE username = ?',
      [user],
      (err, rows, fields) => {
        if (rows.length === 0) {
          db.query(
            'INSERT INTO users(`username`, `password`) VALUES(?, ?)',
            [user, pass],
            (err, result) => {
              if (!!err) throw err;

              console.log(result);
              allClients.push(user);
              socket.emit('logged_in', { user: user });
            }
          );
        } else {
          const dataUser = rows[0].username;
          const dataPass = rows[0].password;

          if (dataPass == null || dataUser == null) {
            socket.emit('error');
          }
          if (user == dataUser && pass == dataPass) {
            console.log(user + ' has logged in!');
            socket.emit('logged_in', { user: user });
            req.session.userID = rows[0].id;
            req.session.save();
          } else {
            socket.emit('invalid');
          }
        }
      }
    );
  });

  socket.on('makeMove', (data) => {
    io.emit('moveMade', data);
  });

  socket.on('resetGame', (newGame) => {
    io.emit('gameReset', newGame);
  });

  socket.on('logging_out', (user) => {
    console.log(user + ' has logged out!');
    console.log(allClients);
    var i = allClients.indexOf(user);
    allClients.splice(i, 1);
    console.log(allClients);
    io.emit('logged_out', user);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
