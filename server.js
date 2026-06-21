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
const dashboardRoutes = require('./routes/dashboard');
const userManagementRoutes = require('./routes/usermanagement');
const clientsRoutes = require('./routes/clients');
const smsTestRoutes = require('./routes/smstest');
const profileRoutes = require('./routes/profile');
const reportsRoutes = require('./routes/reports');

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/user-management', userManagementRoutes);
app.use('/clients', clientsRoutes);
app.use('/sms-test', smsTestRoutes);
app.use('/profile', profileRoutes);
app.use('/reports', reportsRoutes);

app.get('/', (req, res) => res.redirect('/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Power SMS running on port ${PORT}`));