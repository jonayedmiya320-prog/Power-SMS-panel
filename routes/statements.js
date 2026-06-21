const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    let query = db.collection('statements');
    if (req.session.user.role === 'agent' || req.session.user.role === 'client') {
      query = query.where('username', '==', req.session.user.username);
    }
    const snapshot = await query.orderBy('date', 'desc').limit(100).get();
    const entries = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      entries.push({ id: doc.id, date: d.date, description: d.description, debit: d.debit || 0, credit: d.credit || 0, balance: d.balance || 0, currency: d.currency, username: d.username });
    });
    res.render('statements', { user: req.session.user, active: 'statements', pageTitle: 'Statements', entries });
  } catch (err) {
    console.error('Statements load error:', err);
    res.render('statements', { user: req.session.user, active: 'statements', pageTitle: 'Statements', entries: [] });
  }
});

module.exports = router;