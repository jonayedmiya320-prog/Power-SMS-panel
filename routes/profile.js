const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.session.user.uid).get();
    const data = doc.exists ? doc.data() : {};

    res.render('profile', {
      user: req.session.user,
      active: 'profile',
      pageTitle: 'Profile',
      profile: {
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        country: data.country || ''
      },
      successMsg: null,
      errorMsg: null
    });
  } catch (err) {
    console.error('Profile load error:', err);
    res.render('profile', {
      user: req.session.user,
      active: 'profile',
      pageTitle: 'Profile',
      profile: { name: '', username: req.session.user.username, email: '', country: '' },
      successMsg: null,
      errorMsg: 'Could not load profile.'
    });
  }
});

router.post('/update', requireLogin, async (req, res) => {
  try {
    const { name, email, country } = req.body;

    await db.collection('users').doc(req.session.user.uid).update({
      name: name ? name.trim() : req.session.user.name,
      email: email ? email.trim() : '',
      country: country ? country.trim() : ''
    });

    req.session.user.name = name ? name.trim() : req.session.user.name;

    const doc = await db.collection('users').doc(req.session.user.uid).get();
    const data = doc.data();

    res.render('profile', {
      user: req.session.user,
      active: 'profile',
      pageTitle: 'Profile',
      profile: {
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        country: data.country || ''
      },
      successMsg: 'Profile updated successfully.',
      errorMsg: null
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.redirect('/profile');
  }
});

router.post('/change-password', requireLogin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const docRef = db.collection('users').doc(req.session.user.uid);
    const doc = await docRef.get();
    const data = doc.data();

    const match = await bcrypt.compare(currentPassword, data.passwordHash);

    if (!match) {
      return res.render('profile', {
        user: req.session.user,
        active: 'profile',
        pageTitle: 'Profile',
        profile: {
          name: data.name || '',
          username: data.username || '',
          email: data.email || '',
          country: data.country || ''
        },
        successMsg: null,
        errorMsg: 'Current password is incorrect.'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.render('profile', {
        user: req.session.user,
        active: 'profile',
        pageTitle: 'Profile',
        profile: {
          name: data.name || '',
          username: data.username || '',
          email: data.email || '',
          country: data.country || ''
        },
        successMsg: null,
        errorMsg: 'New password must be at least 6 characters.'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await docRef.update({ passwordHash: newHash });

    res.render('profile', {
      user: req.session.user,
      active: 'profile',
      pageTitle: 'Profile',
      profile: {
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        country: data.country || ''
      },
      successMsg: 'Password changed successfully.',
      errorMsg: null
    });
  } catch (err) {
    console.error('Password change error:', err);
    res.redirect('/profile');
  }
});

module.exports = router;