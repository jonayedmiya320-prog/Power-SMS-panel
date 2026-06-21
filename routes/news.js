const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  try {
    const snapshot = await db.collection('news').orderBy('createdAt', 'desc').limit(50).get();
    const newsList = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      newsList.push({ id: doc.id, headline: d.headline, body: d.body, createdAt: d.createdAt });
    });
    res.render('news', { user: req.session.user, active: 'news', pageTitle: 'News for Clients', newsList });
  } catch (err) {
    console.error('News load error:', err);
    res.render('news', { user: req.session.user, active: 'news', pageTitle: 'News for Clients', newsList: [] });
  }
});

router.post('/create', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client' || req.session.user.role === 'agent') return res.redirect('/news');
  try {
    const { headline, body } = req.body;
    if (!headline || !body) return res.redirect('/news');
    await db.collection('news').add({
      headline: headline.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString()
    });
    res.redirect('/news');
  } catch (err) {
    console.error('Create news error:', err);
    res.redirect('/news');
  }
});

router.post('/delete/:id', requireLogin, async (req, res) => {
  if (req.session.user.role === 'client' || req.session.user.role === 'agent') return res.redirect('/news');
  try {
    await db.collection('news').doc(req.params.id).delete();
    res.redirect('/news');
  } catch (err) {
    console.error('Delete news error:', err);
    res.redirect('/news');
  }
});

module.exports = router;