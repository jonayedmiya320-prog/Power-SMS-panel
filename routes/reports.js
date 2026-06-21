const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin, requirePermission } = require('../middleware/auth');

router.get('/', requireLogin, requirePermission('reports'), async (req, res) => {
  try {
    const snapshot = await db.collection('sms_logs')
      .orderBy('sentAt', 'desc')
      .limit(100)
      .get();

    let logs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        number: data.number,
        message: data.message,
        status: data.status,
        sentBy: data.sentBy,
        sentAt: data.sentAt
      });
    });

    const filterNumber = req.query.number ? req.query.number.trim() : '';
    if (filterNumber) {
      logs = logs.filter(l => l.number.includes(filterNumber));
    }

    const totalCount = logs.length;
    const sentCount = logs.filter(l => l.status === 'sent').length;
    const pendingCount = logs.filter(l => l.status === 'pending').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;

    res.render('reports', {
      user: req.session.user,
      active: 'reports',
      pageTitle: 'SMS Reports',
      logs,
      filterNumber,
      summary: { totalCount, sentCount, pendingCount, failedCount }
    });
  } catch (err) {
    console.error('Reports load error:', err);
    res.render('reports', {
      user: req.session.user,
      active: 'reports',
      pageTitle: 'SMS Reports',
      logs: [],
      filterNumber: '',
      summary: { totalCount: 0, sentCount: 0, pendingCount: 0, failedCount: 0 }
    });
  }
});

module.exports = router;