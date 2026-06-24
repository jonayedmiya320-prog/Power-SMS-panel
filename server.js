require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Firebase Admin Init
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET || 'powersms_secret_key_2024';

// ===== AUTH VERIFY MIDDLEWARE =====
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ===== SETUP CHECK API =====
app.get('/api/setup/check', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('setup').get();
    res.json({ isSetup: doc.exists && doc.data().isSetup === true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/setup/complete', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('setup').get();
    if (doc.exists && doc.data().isSetup === true) {
      return res.status(403).json({ error: 'Already setup' });
    }
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hashed = await bcrypt.hash(password, 10);
    await db.collection('settings').doc('setup').set({ isSetup: true });
    await db.collection('admins').doc('admin').set({ username, password: hashed });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== LOGIN API =====
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const doc = await db.collection('admins').doc('admin').get();
    if (!doc.exists) return res.status(401).json({ error: 'Invalid credentials' });
    const data = doc.data();
    if (data.username !== username) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, data.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== CLIENTS API =====
app.get('/api/clients', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('clients').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/clients', verifyToken, async (req, res) => {
  try {
    const data = { ...req.body, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('clients').add(data);
    res.json({ id: ref.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    await db.collection('clients').doc(req.params.id).update(req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    await db.collection('clients').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== NEWS API =====
app.get('/api/news', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('news').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/news', verifyToken, async (req, res) => {
  try {
    const data = { ...req.body, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('news').add(data);
    res.json({ id: ref.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/news/:id', verifyToken, async (req, res) => {
  try {
    await db.collection('news').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== SMS RANGES API =====
app.get('/api/ranges', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('ranges').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ranges', verifyToken, async (req, res) => {
  try {
    const data = { ...req.body, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('ranges').add(data);
    res.json({ id: ref.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/ranges/:id', verifyToken, async (req, res) => {
  try {
    await db.collection('ranges').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== MY NUMBERS API =====
app.get('/api/numbers', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('numbers').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== STATS API =====
app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const last7 = new Date(); last7.setDate(last7.getDate()-7);
    const last30 = new Date(); last30.setDate(last30.getDate()-30);
    const snap = await db.collection('sms_logs').get();
    const all = snap.docs.map(d => d.data());
    const todaySms = all.filter(s => s.createdAt?.toDate() >= today).length;
    const last7Sms = all.filter(s => s.createdAt?.toDate() >= last7).length;
    const last30Sms = all.filter(s => s.createdAt?.toDate() >= last30).length;
    const totalClients = (await db.collection('clients').get()).size;
    const totalRanges = (await db.collection('ranges').get()).size;
    res.json({ todaySms, last7Sms, last30Sms, totalClients, totalRanges });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== STATEMENTS API =====
app.get('/api/statements', verifyToken, async (req, res) => {
  try {
    const { currency } = req.query;
    let q = db.collection('statements').orderBy('createdAt', 'desc');
    if (currency) q = q.where('currency', '==', currency);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== PAYMENTS API =====
app.get('/api/payments', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('payments').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/payments', verifyToken, async (req, res) => {
  try {
    const data = { ...req.body, status: 'Pending', createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('payments').add(data);
    res.json({ id: ref.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== ACTIVITY API =====
app.get('/api/activity', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('activity').orderBy('createdAt', 'desc').limit(100).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== CREDIT NOTES API =====
app.get('/api/creditnotes', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('creditnotes').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== BANK ACCOUNTS API =====
app.get('/api/bankaccounts', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('bankaccounts').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bankaccounts', verifyToken, async (req, res) => {
  try {
    const data = { ...req.body, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('bankaccounts').add(data);
    res.json({ id: ref.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== PROFILE API =====
app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('admins').doc('admin').get();
    const data = doc.data();
    res.json({ username: data.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/profile', verifyToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    const update = {};
    if (username) update.username = username;
    if (password) update.password = await bcrypt.hash(password, 10);
    await db.collection('admins').doc('admin').update(update);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== PAGE ROUTES =====
const pages = [
  'dashboard','clients','smsranges','mynumbers','ratecard',
  'liveaccess','detailedreports','summaryreports','clientstats',
  'rangestats','numberstats','creditnotes','payments','bankaccounts',
  'statements','newsmaster','smstest','voicetest','notifications',
  'profile','myactivity','useractivity'
];

pages.forEach(page => {
  app.get('/' + page, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', page + '.html'));
  });
});

// ===== SETUP PAGE ROUTE =====
app.get('/setup', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('setup').get();
    if (doc.exists && doc.data().isSetup === true) {
      return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'setup.html'));
  } catch (e) {
    res.redirect('/login');
  }
});

// ===== LOGIN PAGE ROUTE =====
app.get('/login', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('setup').get();
    if (!doc.exists || doc.data().isSetup !== true) {
      return res.redirect('/setup');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  } catch (e) {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// ===== ROOT REDIRECT =====
app.get('/', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('setup').get();
    if (!doc.exists || doc.data().isSetup !== true) {
      return res.redirect('/setup');
    }
    res.redirect('/login');
  } catch (e) {
    res.redirect('/login');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Power SMS running on port ' + PORT));