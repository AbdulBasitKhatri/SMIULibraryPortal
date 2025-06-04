const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/img');
  },
  filename: function (req, file, cb) {
    const randomName = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${randomName}${ext}`);
  }
});

const upload = multer({ storage: storage });

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/register', async (req, res) => {
    const { name, sid, email, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (name, sid, email, phone, password) VALUES (?, ?, ?, ?, ?)', [name, sid, email, phone, hashedPassword], function(err) {
        if (err) return res.redirect('/register?error=ua');
        res.redirect('/login?r=true');
    });
});

app.post('/login', (req, res) => {
    const { sid, password } = req.body;
    // Hardcoded admin credentials
    if (sid === 'admin' && password === '@dm1n') {
        const token = jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '1h' });

        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
        });

        return res.redirect('/admin');
    }
    else{
      db.get('SELECT * FROM users WHERE sid = ?', [sid], async (err, user) => {
          if (err || !user) return res.redirect('/login?error=invalid');

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) return res.redirect('/login?error=invalid');

          const token = jwt.sign({ sid: user.sid}, SECRET, { expiresIn: '1h' });

          res.cookie('token', token, {
              httpOnly: true,
              secure: false,
              sameSite: 'strict',
              maxAge: 60 * 60 * 1000
          });

          res.redirect('/dashboard');
      });
    }
});

function requireAuth(req, res, next) {
    const token = req.cookies.token || req.cookies.admin_token;
    if (!token) return res.redirect('/login?error=li');

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.redirect('/login?error=li');
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    const token = req.cookies.admin_token;
    if (!token) return res.redirect('/login?error=li');

    jwt.verify(token, SECRET, (err, user) => {
        if (err || user.role !== 'admin') return res.redirect('/login?error=li');
        req.admin = user;
        next();
    });
}

app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

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
    return res.json(rows);
  });
});

app.post('/book/:id', requireAdmin, upload.single('picture'), (req, res) => {
  const id = req.params.id;
  const { title, author, isbn } = req.body;
  const image = req.file ? '/img/' + req.file.filename : null;

  if (image) {
    db.run(
      `UPDATE books SET title = ?, author = ?, isbn = ?, image = ? WHERE id = ?`,
      [title, author, isbn, image, id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.redirect('/admin');
      }
    );
  } else {
    db.run(
      `UPDATE books SET title = ?, author = ?, isbn = ? WHERE id = ?`,
      [title, author, isbn, id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.redirect('/admin');
      }
    );
  }
});

app.delete('/books/:id', requireAdmin, (req, res) => {
    const id = req.params.id;

    db.run('DELETE FROM books WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Book not found!' });

        res.json({ message: 'Book removed successfully!' });
    });
});

app.post('/addBook', requireAdmin, upload.single('picture'), (req, res) => {
  const { title, author, isbn } = req.body;
  const imageFile = req.file;

  if (!imageFile) return res.status(400).send('Image upload failed');

  const imagePath = `/img/${imageFile.filename}`;

  db.run(
    'INSERT INTO books (title, author, isbn, image) VALUES (?, ?, ?, ?)',
    [title, author, isbn, imagePath],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }
      res.redirect('/admin');
    }
  );
});

app.get('/students', requireAdmin, (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/student', requireAdmin, async (req, res) => {
  const { id, name, sid, phone, email, password } = req.body;

  if (id) {
    if (password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      db.run(
        `UPDATE users SET name = ?, sid = ?, phone = ?, email = ?, password = ? WHERE id = ?`,
        [name, sid, phone, email, hashed, id],
        function (err) {
          if (err) return res.status(500).send('Error updating student');
          res.redirect('/admin?s=true');
        }
      );
    } else {
      db.run(
        `UPDATE users SET name = ?, sid = ?, phone = ?, email = ? WHERE id = ?`,
        [name, sid, phone, email, id],
        function (err) {
          if (err) return res.status(500).send('Error updating student');
          res.redirect('/admin?s=true');
        }
      );
    }
  }
  else{
    res.redirect('/admin?s=false');
  }
});

app.delete('/students/:sid', requireAdmin, (req, res) => {
  const sid = req.params.sid;

  db.run('DELETE FROM users WHERE sid = ?', [sid], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Student not found' });

    res.json({ message: 'Student removed successfully' });
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
