const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3000;
const SECRET = 'library_secret_key';

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Database Setup
const db = new sqlite3.Database('./db/database.db', (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the SQLite database.');
});

db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    sid TEXT UNIQUE,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password TEXT
);`);

db.run(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    image TEXT
  );`);

const books = [
  {
    title: "Peer-e-Kamil",
    author: "Umera Ahmed",
    isbn: "9383582421",
    image: "/img/1.jpg"
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    isbn: "9780743273565",
    image: "/img/2.jpg"
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    isbn: "9780061120084",
    image: "/img/3.jpg"
  },
  {
    title: "1984",
    author: "George Orwell",
    isbn: "9780451524935",
    image: "/img/4.jpg"
  },
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    isbn: "9780141439518",
    image: "/img/5.jpg"
  }
];

books.forEach(book => {
  db.run(
    `INSERT OR IGNORE INTO books (title, author, isbn, image) VALUES (?, ?, ?, ?)`,
    [book.title, book.author, book.isbn, book.image],
    function (err) {
      if (err) {
        console.error('Insert error:', err.message);
      } else {
        console.log(`Book inserted: ${book.title}`);
      }
    }
  );
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
// Register
app.post('/register', async (req, res) => {
    const { name, sid, email, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (name, sid, email, phone, password) VALUES (?, ?, ?, ?, ?)', [name, sid, email, phone, hashedPassword], function(err) {
        if (err) return res.redirect('/register?error=ua');
        res.redirect('/login?r=true');
    });
});

// Login
app.post('/login', (req, res) => {
    const { sid, password } = req.body;

    db.get('SELECT * FROM users WHERE sid = ?', [sid], async (err, user) => {
        if (err || !user) return res.redirect('/login?error=invalid');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.redirect('/login?error=invalid');

        const token = jwt.sign({ sid: user.sid}, SECRET, { expiresIn: '1h' });

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
        });

        res.redirect('/dashboard');
    });
});

function requireAuth(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login?error=li');

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.redirect('/login?error=li');
        req.user = user;
        next();
    });
}

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login?lo=true');
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/books', requireAuth, (req, res) => {
  db.all('SELECT * FROM books', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.get('/me', requireAuth, (req, res) => {
    const sid = req.user.sid;
    db.get('SELECT name FROM users WHERE sid = ?', [sid], (err, row) => {
        if (err || !row) return res.redirect('/logout');
        res.json({ name: row.name });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
