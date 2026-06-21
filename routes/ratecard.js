const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    const snapshot = await db.collection('sms_ratecard').orderBy('createdAt', 'desc').get();
    const rates = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      rates.push({ id: doc.id, country: d.country, prefix: d.prefix, currency: d.currency, rate: d.rate });
    });
    res.render('ratecard', { user: req.session.user, active: 'ratecard', pageTitle: 'SMS RateCard', rates });
  } catch (err) {
    console.error('RateCard load error:', err);
    res.render('ratecard', { user: req.session.user, active: 'ratecard', pageTitle: 'SMS RateCard', rates: [] });
  }
});

router.post('/create', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client' || req.session.user.role === 'agent') return res.redirect('/ratecard');
  try {
    const { country, prefix, currency, rate } = req.body;
    if (!country || !prefix) return res.redirect('/ratecard');
    await db.collection('sms_ratecard').add({
      country: country.trim(),
      prefix: prefix.trim(),
      currency: currency ? currency.trim() : 'USD',
      rate: rate ? parseFloat(rate) : 0,
      createdAt: new Date().toISOString()
    });
    res.redirect('/ratecard');
  } catch (err) {
    console.error('Create rate error:', err);
    res.redirect('/ratecard');
  }
});

router.post('/delete/:id', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client' || req.session.user.role === 'agent') return res.redirect('/ratecard');
  try {
    await db.collection('sms_ratecard').doc(req.params.id).delete();
    res.redirect('/ratecard');
  } catch (err) {
    console.error('Delete rate error:', err);
    res.redirect('/ratecard');
  }
});

module.exports = router;