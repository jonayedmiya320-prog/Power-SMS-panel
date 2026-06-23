const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' (not 'frontend/public')
app.use(express.static(path.join(__dirname, 'public')));

// Routes - Clean URLs (No .html)
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
app.get('/clients', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/clients.html'));
});
app.get('/sms-ranges', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/sms-ranges.html'));
});
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/profile.html'));
});
app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/reports.html'));
});
app.get('/payments', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/payments.html'));
});

// Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📍 Visit: http://localhost:${PORT}`);
    console.log(`📌 Clean URLs active (no .html)`);
});