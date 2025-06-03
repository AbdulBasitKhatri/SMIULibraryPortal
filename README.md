# 📚 SMIU Library Portal

The **SMIULibraryPortal** is a Node.js-based backend system designed to manage user authentication and data handling for a university library portal. Built using Express, SQLite, and JWT, this project provides a lightweight and efficient backend for academic use cases.

---

## 🚀 Features

- User authentication with JWT
- Password hashing using `bcryptjs`
- Cookie-based session handling
- RESTful API with Express
- Lightweight SQLite database integration

---

## 🧰 Dependencies

This project uses the following npm packages:

- `express`
- `body-parser`
- `cookie-parser`
- `bcryptjs`
- `jsonwebtoken`
- `sqlite3`

> 📌 **Note:** You don't need to worry about specific version numbers. Just run `npm install` and Node will install compatible versions automatically.

---

## 🛠️ Setup Instructions

Follow these steps to set up and run the project on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SMIULibraryPortal.git
cd SMIULibraryPortal
npm install
```

### 2. Configure server.js
⚠️ IMPORTANT: Open the server.js file and locate the SECRET variable. This value is used for JWT token signing and must be changed to a secure, unpredictable string before deploying to production.

### 3. Run the Server
```bash
node server.js
```

The server will start running at: http://localhost:3000
