const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    let query = db.collection('sms_numbers');
    if (req.session.user.role === 'client') {
      query = query.where('assignedTo', '==', req.session.user.username);
    }
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const numbers = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      numbers.push({ id: doc.id, range: d.range, number: d.number, assignedTo: d.assignedTo || '-', status: d.status });
    });

    const clientsSnapshot = await db.collection('users').where('role', '==', 'client').get();
    const clients = [];
    clientsSnapshot.forEach(doc => clients.push(doc.data().username));

    res.render('numbers', { user: req.session.user, active: 'numbers', pageTitle: 'My SMS Numbers', numbers, clients });
  } catch (err) {
    console.error('Numbers load error:', err);
    res.render('numbers', { user: req.session.user, active: 'numbers', pageTitle: 'My SMS Numbers', numbers: [], clients: [] });
  }
});

router.post('/create', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client') return res.redirect('/numbers');
  try {
    const { range, number } = req.body;
    if (!range || !number) return res.redirect('/numbers');
    await db.collection('sms_numbers').add({
      range: range.trim(),
      number: number.trim(),
      assignedTo: '',
      status: 'unassigned',
      createdAt: new Date().toISOString()
    });
    res.redirect('/numbers');
  } catch (err) {
    console.error('Create number error:', err);
    res.redirect('/numbers');
  }
});

router.post('/assign/:id', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client') return res.redirect('/numbers');
  try {
    const { assignedTo } = req.body;
    await db.collection('sms_numbers').doc(req.params.id).update({
      assignedTo: assignedTo || '',
      status: assignedTo ? 'assigned' : 'unassigned'
    });
    res.redirect('/numbers');
  } catch (err) {
    console.error('Assign number error:', err);
    res.redirect('/numbers');
  }
});

router.post('/delete/:id', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client') return res.redirect('/numbers');
  try {
    await db.collection('sms_numbers').doc(req.params.id).delete();
    res.redirect('/numbers');
  } catch (err) {
    console.error('Delete number error:', err);
    res.redirect('/numbers');
  }
});

module.exports = router;