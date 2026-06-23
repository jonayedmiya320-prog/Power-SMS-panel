const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' (NOT 'frontend/public')
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROUTES - Clean URLs (no .html) =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/register.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// Catch-all: if route not found, go to login
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📌 Clean URLs active (no .html)`);
});