const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Serve static files (CSS, JS, Images)
// ============================================
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ============================================
// Routes - Clean URLs (No .html extension)
// ============================================

// Home / Login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

// Register Page (Super Admin Setup)
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/register.html'));
});

// Dashboard Page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/dashboard.html'));
});

// Clients Page
app.get('/clients', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/clients.html'));
});

// SMS Ranges Page
app.get('/sms-ranges', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/sms-ranges.html'));
});

// Profile Page
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/profile.html'));
});

// Reports Page
app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/reports.html'));
});

// Payments Page
app.get('/payments', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/payments.html'));
});

// ============================================
// Catch-all: If route not found, go to login
// ============================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📍 Visit: http://localhost:${PORT}`);
    console.log(`📌 Clean URLs active (no .html)`);
});