const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    const snapshot = await db.collection('sms_ranges').orderBy('createdAt', 'desc').get();
    const ranges = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      ranges.push({ id: doc.id, country: d.country, prefix: d.prefix, testNumber: d.testNumber, currency: d.currency, payout: d.payout });
    });
    res.render('ranges', { user: req.session.user, active: 'ranges', pageTitle: 'SMS Ranges', ranges });
  } catch (err) {
    console.error('Ranges load error:', err);
    res.render('ranges', { user: req.session.user, active: 'ranges', pageTitle: 'SMS Ranges', ranges: [] });
  }
});

router.post('/create', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client') return res.redirect('/ranges');
  try {
    const { country, prefix, testNumber, currency, payout } = req.body;
    if (!country || !prefix) return res.redirect('/ranges');
    await db.collection('sms_ranges').add({
      country: country.trim(),
      prefix: prefix.trim(),
      testNumber: testNumber ? testNumber.trim() : '',
      currency: currency ? currency.trim() : 'USD',
      payout: payout ? parseFloat(payout) : 0,
      createdAt: new Date().toISOString()
    });
    res.redirect('/ranges');
  } catch (err) {
    console.error('Create range error:', err);
    res.redirect('/ranges');
  }
});

router.post('/delete/:id', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client') return res.redirect('/ranges');
  try {
    await db.collection('sms_ranges').doc(req.params.id).delete();
    res.redirect('/ranges');
  } catch (err) {
    console.error('Delete range error:', err);
    res.redirect('/ranges');
  }
});

module.exports = router;