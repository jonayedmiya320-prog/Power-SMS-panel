const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');
const { requireLogin, requireSuperAdmin } = require('../middleware/auth');

const PERMISSION_KEYS = ['dashboard', 'clients', 'smsTest', 'reports', 'creditNotes', 'paymentRequests'];

router.get('/', requireLogin, requireSuperAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'subadmin')
      .get();

    const admins = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      admins.push({
        id: doc.id,
        name: data.name,
        username: data.username,
        status: data.status,
        permissions: data.permissions || {}
      });
    });

    res.render('usermanagement', {
      user: req.session.user,
      active: 'usermgmt',
      pageTitle: 'User Management',
      admins,
      permissionKeys: PERMISSION_KEYS,
      error: null,
      success: null
    });
  } catch (err) {
    console.error('User management load error:', err);
    res.render('usermanagement', {
      user: req.session.user,
      active: 'usermgmt',
      pageTitle: 'User Management',
      admins: [],
      permissionKeys: PERMISSION_KEYS,
      error: 'Could not load admins.',
      success: null
    });
  }
});

router.post('/create', requireLogin, requireSuperAdmin, async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password || password.length < 6) {
      return res.redirect('/user-management');
    }

    const existing = await db.collection('users')
      .where('username', '==', username.trim())
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.redirect('/user-management');
    }

    const permissions = {};
    PERMISSION_KEYS.forEach(key => {
      permissions[key] = req.body['perm_' + key] === 'on';
    });

    const passwordHash = await bcrypt.hash(password, 10);

    await db.collection('users').add({
      name: name.trim(),
      username: username.trim(),
      passwordHash,
      role: 'subadmin',
      status: 'active',
      permissions,
      createdAt: new Date().toISOString(),
      lastLogin: null
    });

    res.redirect('/user-management');
  } catch (err) {
    console.error('Create admin error:', err);
    res.redirect('/user-management');
  }
});

router.post('/toggle-status/:id', requireLogin, requireSuperAdmin, async (req, res) => {
  try {
    const docRef = db.collection('users').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.redirect('/user-management');

    const currentStatus = doc.data().status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await docRef.update({ status: newStatus });

    res.redirect('/user-management');
  } catch (err) {
    console.error('Toggle status error:', err);
    res.redirect('/user-management');
  }
});

router.post('/delete/:id', requireLogin, requireSuperAdmin, async (req, res) => {
  try {
    await db.collection('users').doc(req.params.id).delete();
    res.redirect('/user-management');
  } catch (err) {
    console.error('Delete admin error:', err);
    res.redirect('/user-management');
  }
});

module.exports = router;