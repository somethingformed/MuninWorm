const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let db = new sqlite3.Database('./database.db', (err) => {
	if (err) {
		return console.error(err.message);
	}
	console.log('Connected to the SQlite database.');
});

db.serialize(() => {
	db.run(`CREATE TABLE IF NOT EXISTS numbers(value INTEGER)`);
	db.run(`CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, text TEXT)`);
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

			db.get('SELECT text FROM messages WHERE id = ?', [row.value], (err, row) => {
				if (err) {
					return console.error(err.message);
				}
				socket.emit('currentMessage', row ? row.text : null);
			});
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

						db.get('SELECT text FROM messages WHERE id = ?', [row.value], (err, row) => {
							if (err) {
								return console.error(err.message);
							}
							io.sockets.emit('currentMessage', row ? row.text : null);
						});
					});
				});
		});

		socket.on('submit', (message) => {
				db.get('SELECT value FROM numbers', [], (err, row) => {
					if (err) {
						return console.error(err.message);
					}
					db.run(`INSERT OR IGNORE INTO messages(id, text) VALUES(?, ?)`, [row.value, message], function(err) {
						if (err) {
							return console.error(err.message);
						}
						io.sockets.emit('newMessage', { id: row.value, text: message });
					});
				});
		});
});

server.listen(3000, () => {
		console.log('Server is running on port 3000');
});
