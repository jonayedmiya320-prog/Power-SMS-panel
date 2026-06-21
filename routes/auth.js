const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');

function randomCaptcha() {
  return {
    num1: Math.floor(Math.random() * 10),
    num2: Math.floor(Math.random() * 10)
  };
}

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
      return res.render('setup', { error: 'Please enter a username and a password of at least 6 characters.' });
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
    res.render('setup', { error: 'Server error occurred, please try again.' });
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  const { num1, num2 } = randomCaptcha();
  res.render('login', { error: null, num1, num2 });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password, captcha, captchaAnswer } = req.body;

    if (!username || !password || !captcha) {
      const { num1, num2 } = randomCaptcha();
      return res.render('login', { error: 'Please fill in all fields.', num1, num2 });
    }

    if (parseInt(captcha, 10) !== parseInt(captchaAnswer, 10)) {
      const { num1, num2 } = randomCaptcha();
      return res.render('login', { error: 'Incorrect captcha answer.', num1, num2 });
    }

    const snapshot = await db.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      const { num1, num2 } = randomCaptcha();
      return res.render('login', { error: 'Invalid username or password.', num1, num2 });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.status !== 'active') {
      const { num1, num2 } = randomCaptcha();
      return res.render('login', { error: 'Your account is inactive. Please contact the admin.', num1, num2 });
    }

    const match = await bcrypt.compare(password, userData.passwordHash);
    if (!match) {
      const { num1, num2 } = randomCaptcha();
      return res.render('login', { error: 'Invalid username or password.', num1, num2 });
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
    const { num1, num2 } = randomCaptcha();
    res.render('login', { error: 'Server error occurred, please try again.', num1, num2 });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;