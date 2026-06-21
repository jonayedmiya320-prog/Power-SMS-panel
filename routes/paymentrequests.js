const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    let query = db.collection('payment_requests');
    if (req.session.user.role === 'agent' || req.session.user.role === 'client') {
      query = query.where('requestedBy', '==', req.session.user.username);
    }
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const requests = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      requests.push({ id: doc.id, amount: d.amount, method: d.method, status: d.status, requestedBy: d.requestedBy, createdAt: d.createdAt });
    });
    res.render('paymentrequests', { user: req.session.user, active: 'paymentrequests', pageTitle: 'Payment Requests', requests });
  } catch (err) {
    console.error('Payment requests load error:', err);
    res.render('paymentrequests', { user: req.session.user, active: 'paymentrequests', pageTitle: 'Payment Requests', requests: [] });
  }
});

router.post('/create', requireLogin, async (req, res) => {
  try {
    const { amount, method } = req.body;
    if (!amount || !method) return res.redirect('/payment-requests');
    await db.collection('payment_requests').add({
      amount: parseFloat(amount),
      method: method.trim(),
      status: 'pending',
      requestedBy: req.session.user.username,
      createdAt: new Date().toISOString()
    });
    res.redirect('/payment-requests');
  } catch (err) {
    console.error('Create payment request error:', err);
    res.redirect('/payment-requests');
  }
});

router.post('/update-status/:id', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client' || req.session.user.role === 'agent') return res.redirect('/payment-requests');
  try {
    const { status } = req.body;
    await db.collection('payment_requests').doc(req.params.id).update({ status });
    res.redirect('/payment-requests');
  } catch (err) {
    console.error('Update payment status error:', err);
    res.redirect('/payment-requests');
  }
});

module.exports = router;