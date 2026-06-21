const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    const snapshot = await db.collection('sms_logs').orderBy('sentAt', 'desc').limit(20).get();
    const logs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      logs.push({ id: doc.id, number: data.number, message: data.message, status: data.status, sentBy: data.sentBy, sentAt: data.sentAt });
    });
    res.render('smstest', { user: req.session.user, active: 'smstest', pageTitle: 'SMS Test Panel', logs, result: null });
  } catch (err) {
    console.error('SMS test load error:', err);
    res.render('smstest', { user: req.session.user, active: 'smstest', pageTitle: 'SMS Test Panel', logs: [], result: null });
  }
});

router.post('/send', requireLogin, async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) return res.redirect('/sms-test');
    await db.collection('sms_logs').add({
      number: number.trim(),
      message: message.trim(),
      status: 'pending',
      sentBy: req.session.user.username,
      sentAt: new Date().toISOString()
    });
    res.redirect('/sms-test');
  } catch (err) {
    console.error('SMS send error:', err);
    res.redirect('/sms-test');
  }
});

module.exports = router;