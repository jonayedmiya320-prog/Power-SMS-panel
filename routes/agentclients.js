const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'agent') return res.redirect('/dashboard');
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'client')
      .where('createdBy', '==', req.session.user.username)
      .get();

    const myClients = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      myClients.push({ id: doc.id, name: d.name, username: d.username, status: d.status });
    });

    const numbersSnapshot = await db.collection('sms_numbers')
      .where('assignedTo', '==', req.session.user.username)
      .get();
    const myNumbers = [];
    numbersSnapshot.forEach(doc => {
      const d = doc.data();
      myNumbers.push({ id: doc.id, number: d.number, range: d.range, givenTo: d.givenTo || '' });
    });

    res.render('agentclients', { user: req.session.user, active: 'agentclients', pageTitle: 'My Clients', myClients, myNumbers, error: null });
  } catch (err) {
    console.error('Agent clients load error:', err);
    res.render('agentclients', { user: req.session.user, active: 'agentclients', pageTitle: 'My Clients', myClients: [], myNumbers: [], error: 'Could not load clients.' });
  }
});

router.post('/create', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'agent') return res.redirect('/dashboard');
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password || password.length < 6) return res.redirect('/agent-clients');

    const existing = await db.collection('users').where('username', '==', username.trim()).limit(1).get();
    if (!existing.empty) return res.redirect('/agent-clients');

    const passwordHash = await bcrypt.hash(password, 10);
    await db.collection('users').add({
      name: name.trim(),
      username: username.trim(),
      passwordHash,
      role: 'client',
      status: 'active',
      createdBy: req.session.user.username,
      createdAt: new Date().toISOString(),
      lastLogin: null
    });
    res.redirect('/agent-clients');
  } catch (err) {
    console.error('Create client error:', err);
    res.redirect('/agent-clients');
  }
});

router.post('/give-number/:id', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'agent') return res.redirect('/dashboard');
  try {
    const { givenTo } = req.body;
    await db.collection('sms_numbers').doc(req.params.id).update({ givenTo: givenTo || '' });
    res.redirect('/agent-clients');
  } catch (err) {
    console.error('Give number error:', err);
    res.redirect('/agent-clients');
  }
});

module.exports = router;