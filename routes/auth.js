const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');

router.get('/setup', async (req, res) => {
  try {
    const snapshot = await db.collection('users').limit(1).get();
    if (!snapshot.empty) {
      return res.redirect('/login');
    }
    res.render('setup', { error: null });
  } catch (err) {
    console.error('Setup check error:', err);
    res.render('setup', { error: null });
  }
});

router.post('/setup', async (req, res) => {
  try {
    const snapshot = await db.collection('users').limit(1).get();
    if (!snapshot.empty) {
      return res.redirect('/login');
    }

    const { username, password, name } = req.body;

    if (!username || !password || password.length < 6) {
      return res.render('setup', { error: 'ইউজারনেম দিন এবং পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.collection('users').add({
      username: username.trim(),
      name: name && name.trim() ? name.trim() : username.trim(),
      passwordHash: passwordHash,
      role: 'superadmin',
      status: 'active',
      permissions: {},
      createdAt: new Date().toISOString(),
      lastLogin: null
    });

    res.redirect('/login');
  } catch (err) {
    console.error('Setup error:', err);
    res.render('setup', { error: 'সার্ভার সমস্যা হয়েছে, আবার চেষ্টা করুন।' });
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render('login', { error: 'ইউজারনেম ও পাসওয়ার্ড দিন।' });
    }

    const snapshot = await db.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.render('login', { error: 'ভুল ইউজারনেম বা পাসওয়ার্ড।' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.status !== 'active') {
      return res.render('login', { error: 'আপনার অ্যাকাউন্ট নিষ্ক্রিয়। অ্যাডমিনের সাথে যোগাযোগ করুন।' });
    }

    const match = await bcrypt.compare(password, userData.passwordHash);
    if (!match) {
      return res.render('login', { error: 'ভুল ইউজারনেম বা পাসওয়ার্ড।' });
    }

    req.session.user = {
      uid: userDoc.id,
      username: userData.username,
      name: userData.name || userData.username,
      role: userData.role,
      permissions: userData.permissions || {}
    };

    await db.collection('users').doc(userDoc.id).update({
      lastLogin: new Date().toISOString()
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'সার্ভার সমস্যা হয়েছে, আবার চেষ্টা করুন।' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;