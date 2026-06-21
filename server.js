require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'powersms-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

const authRoutes = require('./routes/auth');
app.use('/', authRoutes);

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.send('Dashboard আসছে পরের ধাপে। আপনি লগইন করেছেন: ' + req.session.user.username);
});

app.get('/', (req, res) => res.redirect('/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Power SMS running on port ${PORT}`));