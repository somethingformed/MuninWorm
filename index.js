const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let db = new sqlite3.Database(':memory:', (err) => {
	if (err) {
		return console.error(err.message);
	}
	console.log('Connected to the in-memory SQlite database.');
});

db.run('CREATE TABLE numbers(value INTEGER)', function(err) {
	if (err) {
		return console.log(err.message);
	}
	db.run(`INSERT INTO numbers(value) VALUES(?)`, [0], function(err) {
		if (err) {
			return console.log(err.message);
		}
	});
});

app.get('/', (req, res) => {
		res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
		db.get('SELECT value FROM numbers', [], (err, row) => {
			if (err) {
				return console.error(err.message);
			}
			socket.emit('number', row.value);
		});

		socket.on('increment', () => {
				db.run(`UPDATE numbers SET value = value + 1`, function(err) {
					if (err) {
						return console.error(err.message);
					}
					db.get('SELECT value FROM numbers', [], (err, row) => {
						if (err) {
							return console.error(err.message);
						}
						io.sockets.emit('number', row.value);
					});
				});
		});
});

server.listen(3000, () => {
		console.log('Server is running on port 3000');
});
