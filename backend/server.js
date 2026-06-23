const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ===== গুরুত্বপূর্ণ: পাথ ঠিক করুন =====
// যেহেতু server.js আছে backend/ ফোল্ডারে, তাই এক লেভেল উপরে গিয়ে public খুঁজতে হবে
const publicPath = path.join(__dirname, '..', 'public');

// Serve static files
app.use(express.static(publicPath));

// ===== Routes - Clean URLs =====
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(publicPath, 'register.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(publicPath, 'dashboard.html'));
});

// Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving files from: ${publicPath}`);
});