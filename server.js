require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');

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

// ===== AUTH VERIFY MIDDLEWARE =====
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ===== CLIENTS API =====
app.get('/api/clients', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('clients').orderBy('createdAt', 'desc').get();
    const clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(clients);
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
    const news = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(news);
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
    const ranges = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(ranges);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== STATS API =====
app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const snap = await db.collection('sms_logs').get();
    const all = snap.docs.map(d => d.data());
    const todaySms = all.filter(s => s.createdAt?.toDate() >= today).length;
    const last7 = new Date(); last7.setDate(last7.getDate()-7);
    const last7Sms = all.filter(s => s.createdAt?.toDate() >= last7).length;
    const last30 = new Date(); last30.setDate(last30.getDate()-30);
    const last30Sms = all.filter(s => s.createdAt?.toDate() >= last30).length;
    res.json({ todaySms, last7Sms, last30Sms, totalClients: (await db.collection('clients').get()).size });
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

// ===== FALLBACK =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Power SMS running on port ' + PORT));