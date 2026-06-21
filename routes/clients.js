const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');
const { requireLogin, requirePermission } = require('../middleware/auth');

router.get('/', requireLogin, requirePermission('clients'), async (req, res) => {
  try {
    const snapshot = await db.collection('users').where('role', '==', 'agent').get();
    const clients = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      clients.push({
        id: doc.id,
        name: data.name,
        username: data.username,
        email: data.email || '-',
        country: data.country || '-',
        status: data.status
      });
    });
    res.render('clients', { user: req.session.user, active: 'clients', pageTitle: 'My Agents', clients, error: null });
  } catch (err) {
    console.error('Agents load error:', err);
    res.render('clients', { user: req.session.user, active: 'clients', pageTitle: 'My Agents', clients: [], error: 'Could not load agents.' });
  }
});

router.post('/create', requireLogin, requirePermission('clients'), async (req, res) => {
  try {
    const { name, username, password, email, country } = req.body;
    if (!name || !username || !password || password.length < 6) return res.redirect('/clients');

    const existing = await db.collection('users').where('username', '==', username.trim()).limit(1).get();
    if (!existing.empty) return res.redirect('/clients');

    const passwordHash = await bcrypt.hash(password, 10);
    await db.collection('users').add({
      name: name.trim(),
      username: username.trim(),
      passwordHash,
      email: email ? email.trim() : '',
      country: country ? country.trim() : '',
      role: 'agent',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: null
    });
    res.redirect('/clients');
  } catch (err) {
    console.error('Create agent error:', err);
    res.redirect('/clients');
  }
});

router.post('/toggle-status/:id', requireLogin, requirePermission('clients'), async (req, res) => {
  try {
    const docRef = db.collection('users').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.redirect('/clients');
    const newStatus = doc.data().status === 'active' ? 'inactive' : 'active';
    await docRef.update({ status: newStatus });
    res.redirect('/clients');
  } catch (err) {
    console.error('Toggle agent status error:', err);
    res.redirect('/clients');
  }
});

router.post('/delete/:id', requireLogin, requirePermission('clients'), async (req, res) => {
  try {
    await db.collection('users').doc(req.params.id).delete();
    res.redirect('/clients');
  } catch (err) {
    console.error('Delete agent error:', err);
    res.redirect('/clients');
  }
});

module.exports = router;