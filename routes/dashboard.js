const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    let totalClients = 0;
    let totalAdmins = 0;

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'client') totalClients++;
      if (data.role === 'superadmin' || data.role === 'subadmin') totalAdmins++;
    });

    res.render('dashboard', {
      user: req.session.user,
      active: 'dashboard',
      pageTitle: 'Dashboard',
      stats: {
        totalClients,
        totalAdmins,
        smsToday: 0,
        sms7Day: 0,
        sms30Day: 0
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard', {
      user: req.session.user,
      active: 'dashboard',
      pageTitle: 'Dashboard',
      stats: { totalClients: 0, totalAdmins: 0, smsToday: 0, sms7Day: 0, sms30Day: 0 }
    });
  }
});

module.exports = router;