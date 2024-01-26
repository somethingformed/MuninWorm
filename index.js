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
		db.run(`CREATE TABLE IF NOT EXISTS numbers(value INTEGER)`, function() {
				db.get('SELECT value FROM numbers', [], (err, row) => {
						if (err) {
								return console.error(err.message);
						}
						if (!row) {
								db.run(`INSERT INTO numbers(value) VALUES(?)`, [0], function(err) {
										if (err) {
												return console.log(err.message);
										}
								});
						}
				});
		});
		db.run(`CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, text TEXT)`);
});

app.get('/', (req, res) => {
		res.sendFile(__dirname + '/index.html');
});

app.get('/getRecentMessages', (req, res) => {
		db.all('SELECT id, text FROM messages ORDER BY id DESC LIMIT 10', (err, rows) => {
				if (err) {
						return console.error(err.message);
				}
				res.json(rows);
		});
});

const getRowValueFromNumbersTable = () => {
		return new Promise((resolve, reject) => {
				db.get('SELECT value FROM numbers', [], (err, row) => {
						if (err) {
								reject(err);
						} else {
								resolve(row);
						}
				});
		});
};

const insertMessageIntoDatabase = (id, message) => {
		db.run('INSERT INTO messages (id, text) VALUES (?, ?)', [id, message], (err) => {
				if (err) {
						console.error(err.message);
				}
		});
};

io.on('connection', (socket) => {
		db.all('SELECT id, text FROM messages ORDER BY id DESC LIMIT 10', async (err, rows) => {
				if (err) {
						return console.error(err.message);
				}
				socket.emit('newMessage', rows);
		});

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

		socket.on('submit', async (message) => {
				try {
						const row = await getRowValueFromNumbersTable();
						await insertMessageIntoDatabase(row.value, message);
						io.sockets.emit('newMessage', [{ id: row.value, text: message }]);
						io.sockets.emit('refreshMessages'); // Emit the refreshMessages event
				} catch (err) {
						console.error(err.message);
				}
		});

});

server.listen(3000, () => {
		console.log('Server is running on port 3000');
});