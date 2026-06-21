const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    const snapshot = await db.collection('credit_notes').orderBy('createdAt', 'desc').limit(100).get();
    const notes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notes.push({ id: doc.id, clientName: data.clientName, amount: data.amount, reason: data.reason, issuedBy: data.issuedBy, createdAt: data.createdAt });
    });

    const clientsSnapshot = await db.collection('users').where('role', '==', 'agent').get();
    const clients = [];
    clientsSnapshot.forEach(doc => {
      const data = doc.data();
      clients.push({ id: doc.id, name: data.name, username: data.username });
    });

    res.render('creditnotes', { user: req.session.user, active: 'creditnotes', pageTitle: 'Credit Notes', notes, clients, error: null });
  } catch (err) {
    console.error('Credit notes load error:', err);
    res.render('creditnotes', { user: req.session.user, active: 'creditnotes', pageTitle: 'Credit Notes', notes: [], clients: [], error: 'Could not load credit notes.' });
  }
});

router.post('/create', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client' || req.session.user.role === 'agent') return res.redirect('/credit-notes');
  try {
    const { clientName, amount, reason } = req.body;
    if (!clientName || !amount || !reason) return res.redirect('/credit-notes');
    await db.collection('credit_notes').add({
      clientName: clientName.trim(),
      amount: parseFloat(amount),
      reason: reason.trim(),
      issuedBy: req.session.user.username,
      createdAt: new Date().toISOString()
    });
    res.redirect('/credit-notes');
  } catch (err) {
    console.error('Create credit note error:', err);
    res.redirect('/credit-notes');
  }
});

router.post('/delete/:id', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client' || req.session.user.role === 'agent') return res.redirect('/credit-notes');
  try {
    await db.collection('credit_notes').doc(req.params.id).delete();
    res.redirect('/credit-notes');
  } catch (err) {
    console.error('Delete credit note error:', err);
    res.redirect('/credit-notes');
  }
});

module.exports = router;