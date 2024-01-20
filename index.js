const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let number = 0;

app.get('/', (req, res) => {
		res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
		socket.emit('number', number);

		socket.on('increment', () => {
				number++;
				io.sockets.emit('number', number);
		});
});

server.listen(3000, () => {
		console.log('Server is running on port 3000');
});
